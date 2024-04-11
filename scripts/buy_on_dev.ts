import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  createAccount,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { keyPairFromSecretKey, airdrop } from "./utils";
import { IDL, PresaleContract } from "../target/types/presale_contract";

// Configure client to use the provider.

const buyToken = async () => {
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const presaleProgramId = new anchor.web3.PublicKey(
    "FrByURbsBpBQRVhZW5FJ1TYnqwbMLNJA7tJzSV4UKhZZ"
  );

  const presaleProgram = new anchor.Program<PresaleContract>(
    IDL,
    presaleProgramId,
    provider
  );

  // const deployer = keyPairFromSecretKey("/home/rss/.config/solana/deployer.json");
  const controller = keyPairFromSecretKey(
    "/home/rss/.config/solana/controller.json"
  );
  const user = keyPairFromSecretKey("/home/rss/.config/solana/user.json");
  const recipientPubkey = new anchor.web3.PublicKey(
    "4FSwJ68KUcUjUSj9xqqXDhZQqidxJQ8R8PrKuQLs5RSp"
  );

  // console.log(`deployer: ${deployer.publicKey}`);
  console.log(`controller: ${controller.publicKey}`);
  console.log(`user: ${user.publicKey}`);
  console.log(`recipient: ${recipientPubkey}`);

  // await airdrop(provider, user.publicKey, 3 * anchor.web3.LAMPORTS_PER_SOL);

  const mintKey: anchor.web3.PublicKey = new anchor.web3.PublicKey(
    "9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT"
  );

  let poolKey, vaultKey, saleUserKey, userTokenKey;
  const poolSeed = anchor.utils.bytes.utf8.encode("pool");
  const vaultSeed = anchor.utils.bytes.utf8.encode("vault");
  const saleSeed = anchor.utils.bytes.utf8.encode("sale");

  [poolKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [poolSeed, controller.publicKey.toBuffer(), mintKey.toBuffer()],
    presaleProgramId
  );

  [vaultKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [vaultSeed, poolKey.toBuffer()],
    presaleProgramId
  );

  [saleUserKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [saleSeed, user.publicKey.toBuffer()],
    presaleProgramId
  );

  userTokenKey = await getOrCreateAssociatedTokenAccount(
    provider.connection,
    user,
    mintKey,
    user.publicKey
  );

  console.log(
    `user token ATA ${userTokenKey.address} user token owner ${userTokenKey.owner}`
  );

  console.log(
    `please transfer presale token to [vaultKey]: ${vaultKey.toBase58()}`
  );

  let vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
  console.log(`Vault Balance ${vaultBalance.value.uiAmount}`);
  console.log(
    `User balance: ${
      (await provider.connection.getBalance(user.publicKey)) /
      anchor.web3.LAMPORTS_PER_SOL
    } SOL`
  );
  let userTokenBalance = await provider.connection.getTokenAccountBalance(
    userTokenKey.address
  );
  console.log(`User Token Balance ${userTokenBalance.value.uiAmount}`);
  let recipientBalance = await provider.connection.getBalance(recipientPubkey);
  console.log(`Recipient Balance ${recipientBalance}`);

  await buy(
    user,
    saleUserKey,
    userTokenKey.address,
    new anchor.BN(anchor.web3.LAMPORTS_PER_SOL / 2)
  );

  vaultBalance = await provider.connection.getTokenAccountBalance(vaultKey);
  console.log(`Vault Balance ${vaultBalance.value.uiAmount}`);
  console.log(
    `User balance: ${
      (await provider.connection.getBalance(user.publicKey)) /
      anchor.web3.LAMPORTS_PER_SOL
    } SOL`
  );
  recipientBalance = await provider.connection.getBalance(recipientPubkey);
  console.log(`Recipient Balance ${recipientBalance}`);
  userTokenBalance = await provider.connection.getTokenAccountBalance(
    userTokenKey.address
  );
  console.log(`User Token Balance ${userTokenBalance.value.uiAmount}`);

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
        recipent: recipientPubkey,
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
};

buyToken();
