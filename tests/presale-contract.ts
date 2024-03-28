import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { PresaleContract } from "../target/types/presale_contract";
import { assert, expect } from "chai";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  createMint,
  mintTo,
} from "@solana/spl-token";

describe("presale-contract", () => {
  // Configure the client to use the local cluster.
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const presaleProgram = anchor.workspace
    .PresaleContract as Program<PresaleContract>;
  const saleSeed = anchor.utils.bytes.utf8.encode("sale");
  const poolSeed = anchor.utils.bytes.utf8.encode("pool");
  const vaultSeed = anchor.utils.bytes.utf8.encode("vault");
  let owner;
  // mock token
  let mintKey;
  let user;
  const choPubkey = new anchor.web3.PublicKey(
    "4FSwJ68KUcUjUSj9xqqXDhZQqidxJQ8R8PrKuQLs5RSp"
  );

  let saleUserKey;
  let userTokenKey, poolKey, vaultKey;
  const USER_INITIAL_BALANCE = 15 * anchor.web3.LAMPORTS_PER_SOL;
  const OWNER_INITIAL_BALANCE = 1 * anchor.web3.LAMPORTS_PER_SOL;
  const PRESALE_TOKEN_BALANCE = 175000 * anchor.web3.LAMPORTS_PER_SOL;
  const TOKEN_PER_SOL = 25000 * anchor.web3.LAMPORTS_PER_SOL;
  const MAX_SOL_PER_USER = 3 * anchor.web3.LAMPORTS_PER_SOL;

  beforeEach(async () => {
    // create owner, user and airdrop sol
    user = anchor.web3.Keypair.generate();
    owner = anchor.web3.Keypair.generate();
    await airdrop(owner.publicKey, OWNER_INITIAL_BALANCE);
    await airdrop(user.publicKey, USER_INITIAL_BALANCE);

    // create mock token
    mintKey = await createMint(
      provider.connection,
      owner, // payer
      owner.publicKey, // mint authority
      owner.publicKey, // freeze authority
      9
    );

    [saleUserKey] = await anchor.web3.PublicKey.findProgramAddressSync(
      [saleSeed, user.publicKey.toBuffer()],
      presaleProgram.programId
    );

    [poolKey] = await anchor.web3.PublicKey.findProgramAddressSync(
      [poolSeed, owner.publicKey.toBuffer(), mintKey.toBuffer()],
      presaleProgram.programId
    );

    [vaultKey] = await anchor.web3.PublicKey.findProgramAddressSync(
      [vaultSeed, poolKey.toBuffer()],
      presaleProgram.programId
    );

    userTokenKey = await createAccount(
      provider.connection,
      owner,
      mintKey,
      user.publicKey
    );

    // userTokenKey = await createAssociatedTokenAccount(
    //   provider.connection,
    //   owner,
    //   mintKey,
    //   user.publicKey
    // );
  });

  it("should work to initialize vault", async () => {
    await initVault();
    // try to test mint to vault
    await sendTokenForPresale(BigInt(PRESALE_TOKEN_BALANCE));
    let vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultKey
    );
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE,
      "invalid vault balance"
    );
  });

  it("should work to initialize user", async () => {
    await initVault();
    console.log(
      `User balance: ${
        (await provider.connection.getBalance(user.publicKey)) /
        anchor.web3.LAMPORTS_PER_SOL
      } SOL`
    );
    await initUser(user, saleUserKey);
    const saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(saledUserAccount.amount.eq(new anchor.BN(0)), "invalid amount");
  });

  it("should work to buy", async () => {
    const BUY_BALANCE = new anchor.BN(MAX_SOL_PER_USER);

    await initVault();
    // try to test mint to vault
    await sendTokenForPresale(BigInt(PRESALE_TOKEN_BALANCE));
    let vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultKey
    );
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE,
      "invalid vault balance"
    );
    await initUser(user, saleUserKey);
    let saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(saledUserAccount.amount.eq(new anchor.BN(0)), "invalid amount");
    let initialChoBalance = await provider.connection.getBalance(choPubkey);

    await buy(user, saleUserKey, userTokenKey, BUY_BALANCE);

    saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(
      saledUserAccount.amount.eq(solToTokenAmount(BUY_BALANCE)),
      "invalid amount"
    );
    let choBalance = await provider.connection.getBalance(choPubkey);
    assert.ok(
      choBalance == initialChoBalance + BUY_BALANCE.toNumber(),
      "invalid cho's balance"
    );
    let userTokenBalance = await provider.connection.getTokenAccountBalance(
      userTokenKey
    );
    assert.ok(
      userTokenBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        solToTokenAmount(BUY_BALANCE).toNumber(),
      "invalid user token balance"
    );
    vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE - solToTokenAmount(BUY_BALANCE).toNumber(),
      "invalid vault balance"
    );
  });

  // buy tokens for 1 SOL, should send 25,000 TOKENS
  it("scenario A", async () => {
    const BUY_BALANCE = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);

    await initVault();
    // try to test mint to vault
    await sendTokenForPresale(BigInt(PRESALE_TOKEN_BALANCE));
    let vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultKey
    );
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE,
      "invalid vault balance"
    );
    await initUser(user, saleUserKey);
    let saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(saledUserAccount.amount.eq(new anchor.BN(0)), "invalid amount");
    let initialChoBalance = await provider.connection.getBalance(choPubkey);

    await buy(user, saleUserKey, userTokenKey, BUY_BALANCE);

    saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(
      saledUserAccount.amount.eq(solToTokenAmount(BUY_BALANCE)),
      "invalid amount"
    );
    let choBalance = await provider.connection.getBalance(choPubkey);
    assert.ok(
      choBalance == initialChoBalance + BUY_BALANCE.toNumber(),
      "invalid cho's balance"
    );
    let userTokenBalance = await provider.connection.getTokenAccountBalance(
      userTokenKey
    );
    assert.ok(
      userTokenBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        solToTokenAmount(BUY_BALANCE).toNumber(),
      "invalid user token balance"
    );
    vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE - solToTokenAmount(BUY_BALANCE).toNumber(),
      "invalid vault balance"
    );
  });

  // buy tokens for 3.5 SOL, should refund 0.5 SOL, send 75,000 TOKENS
  it("scenario B", async () => {
    const BUY_BALANCE = new anchor.BN(3.5 * anchor.web3.LAMPORTS_PER_SOL);

    await initVault();
    // try to test mint to vault
    await sendTokenForPresale(BigInt(PRESALE_TOKEN_BALANCE));
    let vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultKey
    );
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE,
      "invalid vault balance"
    );
    await initUser(user, saleUserKey);
    let saledUserAAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(saledUserAAccount.amount.eq(new anchor.BN(0)), "invalid amount");
    let initialChoBalance = await provider.connection.getBalance(choPubkey);

    await buy(user, saleUserKey, userTokenKey, BUY_BALANCE);

    saledUserAAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(
      saledUserAAccount.amount.eq(
        solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER))
      ),
      "invalid amount"
    );
    let choBalance = await provider.connection.getBalance(choPubkey);
    assert.ok(
      choBalance == initialChoBalance + MAX_SOL_PER_USER,
      "invalid cho's balance"
    );
    let userTokenBalance = await provider.connection.getTokenAccountBalance(
      userTokenKey
    );
    assert.ok(
      userTokenBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER)).toNumber(),
      "invalid user token balance"
    );
    vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE - solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER)).toNumber(),
      "invalid vault balance"
    );
  });

  // buy tokens for 1 SOL first, 2.5 SOL again,
  // should refund 0.5 SOL, send 25,000, 50,000 TOKENS
  it("scenario C", async () => {
    const BUY_BALANCE1 = new anchor.BN(1 * anchor.web3.LAMPORTS_PER_SOL);
    const BUY_BALANCE2 = new anchor.BN(2.5 * anchor.web3.LAMPORTS_PER_SOL);

    await initVault();
    // try to test mint to vault
    await sendTokenForPresale(BigInt(PRESALE_TOKEN_BALANCE));
    let vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultKey
    );
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE,
      "invalid vault balance"
    );
    await initUser(user, saleUserKey);
    let saledUserAAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(saledUserAAccount.amount.eq(new anchor.BN(0)), "invalid amount");
    let initialChoBalance = await provider.connection.getBalance(choPubkey);

    await buy(user, saleUserKey, userTokenKey, BUY_BALANCE1);
    await buy(user, saleUserKey, userTokenKey, BUY_BALANCE2);

    saledUserAAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(
      saledUserAAccount.amount.eq(
        solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER))
      ),
      "invalid amount"
    );
    let choBalance = await provider.connection.getBalance(choPubkey);
    assert.ok(
      choBalance == initialChoBalance + MAX_SOL_PER_USER,
      "invalid cho's balance"
    );
    let userTokenBalance = await provider.connection.getTokenAccountBalance(
      userTokenKey
    );
    assert.ok(
      userTokenBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER)).toNumber(),
      "invalid user token balance"
    );
    vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE - solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER)).toNumber(),
      "invalid vault balance"
    );
  });

  // userA and userB buy 75,000 TOKEN with 3 SOL
  // At this time, vault have 25,000 TOKEN, user pay 3 SOL and refund 2 SOL
  it("scenario D", async () => {
    await initVault();
    // try to test mint to vault
    await sendTokenForPresale(BigInt(PRESALE_TOKEN_BALANCE));
    let vaultBalance = await provider.connection.getTokenAccountBalance(
      vaultKey
    );
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE,
      "invalid vault balance"
    );
    await initUser(user, saleUserKey);
    let saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(saledUserAccount.amount.eq(new anchor.BN(0)), "invalid amount");

    // userA buy tokens with 3 SOL
    const userA = anchor.web3.Keypair.generate();
    await airdrop(userA.publicKey, USER_INITIAL_BALANCE);
    const [saleUserAKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [saleSeed, userA.publicKey.toBuffer()],
      presaleProgram.programId
    );
    const userATokenKey = await createAccount(
      provider.connection,
      owner,
      mintKey,
      userA.publicKey
    );
    await initUser(userA, saleUserAKey);
    await buy(
      userA,
      saleUserAKey,
      userATokenKey,
      new anchor.BN(MAX_SOL_PER_USER)
    );

    // userB buy tokens with 3 SOL
    const userB = anchor.web3.Keypair.generate();
    await airdrop(userB.publicKey, USER_INITIAL_BALANCE);
    const [saleUserBKey] = anchor.web3.PublicKey.findProgramAddressSync(
      [saleSeed, userB.publicKey.toBuffer()],
      presaleProgram.programId
    );
    const userBTokenKey = await createAccount(
      provider.connection,
      owner,
      mintKey,
      userB.publicKey
    );
    await initUser(userB, saleUserBKey);
    await buy(
      userB,
      saleUserBKey,
      userBTokenKey,
      new anchor.BN(MAX_SOL_PER_USER)
    );

    vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        PRESALE_TOKEN_BALANCE -
          2 * solToTokenAmount(new anchor.BN(MAX_SOL_PER_USER)).toNumber(),
      "invalid vault balance"
    );
    let initialChoBalance = await provider.connection.getBalance(choPubkey);
    await buy(user, saleUserKey, userTokenKey, new anchor.BN(MAX_SOL_PER_USER));

    saledUserAccount = await presaleProgram.account.saledAmount.fetch(
      saleUserKey
    );
    assert.ok(saledUserAccount.user.equals(user.publicKey), "invalid user");
    assert.ok(
      saledUserAccount.amount.eq(
        solToTokenAmount(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
      ),
      "invalid amount"
    );
    let choBalance = await provider.connection.getBalance(choPubkey);
    assert.ok(
      choBalance == initialChoBalance + anchor.web3.LAMPORTS_PER_SOL,
      "invalid cho's balance"
    );
    let userTokenBalance = await provider.connection.getTokenAccountBalance(
      userTokenKey
    );
    assert.ok(
      userTokenBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL ==
        solToTokenAmount(
          new anchor.BN(anchor.web3.LAMPORTS_PER_SOL)
        ).toNumber(),
      "invalid user token balance"
    );
    vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
    assert.ok(
      vaultBalance.value.uiAmount * anchor.web3.LAMPORTS_PER_SOL == 0,
      "invalid vault balance"
    );
  });

  async function initVault() {
    const tx = await presaleProgram.methods
      .initialize()
      .accounts({
        payer: owner.publicKey,
        mint: mintKey,
        pool: poolKey,
        vault: vaultKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([owner])
      .rpc();
    await confirmTransaction(tx);
  }

  async function initUser(
    user: anchor.web3.Keypair,
    saleUserKey: anchor.web3.PublicKey
  ) {
    const tx = await presaleProgram.methods
      .initUser()
      .accounts({
        saledAccount: saleUserKey,
        mintToken: mintKey,
        user: user.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    // console.log("Your transaction signature", tx);
    await confirmTransaction(tx);
  }

  async function sendTokenForPresale(amount: number | bigint) {
    await mintTo(provider.connection, owner, mintKey, vaultKey, owner, amount);
  }

  async function buy(
    user: anchor.web3.Keypair,
    saleUserKey: anchor.web3.PublicKey,
    userTokenKey: anchor.web3.PublicKey,
    solAmount: anchor.BN
  ) {
    const tx = await presaleProgram.methods
      .buy(solAmount)
      .accounts({
        mint: mintKey,
        saledAmount: saleUserKey,
        user: user.publicKey,
        userTokenAccount: userTokenKey,
        recipent: choPubkey,
        pool: poolKey,
        vault: vaultKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([user])
      .rpc();
    // console.log("Your transaction signature", tx);
    await confirmTransaction(tx);
  }

  async function airdrop(toPubkey: anchor.web3.PublicKey, amount: number) {
    let airdropSignature = await provider.connection.requestAirdrop(
      toPubkey,
      amount
    );
    let latestBlockhash = await provider.connection.getLatestBlockhash(
      "confirmed"
    );
    await provider.connection.confirmTransaction({
      signature: airdropSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  }

  async function confirmTransaction(
    txSignature: anchor.web3.TransactionSignature
  ) {
    let latestBlockhash = await provider.connection.getLatestBlockhash(
      "confirmed"
    );
    await provider.connection.confirmTransaction({
      signature: txSignature,
      blockhash: latestBlockhash.blockhash,
      lastValidBlockHeight: latestBlockhash.lastValidBlockHeight,
    });
  }

  function solToTokenAmount(amount: anchor.BN): anchor.BN {
    return amount
      .mul(new anchor.BN(TOKEN_PER_SOL))
      .div(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL));
  }

  function tokenToSolAmount(amount: anchor.BN): anchor.BN {
    return amount
      .mul(new anchor.BN(anchor.web3.LAMPORTS_PER_SOL))
      .div(new anchor.BN(TOKEN_PER_SOL));
  }
});
