import * as anchor from "@coral-xyz/anchor";
import {
  TOKEN_PROGRAM_ID,
  getOrCreateAssociatedTokenAccount,
} from "@solana/spl-token";
import { keyPairFromSecretKey, airdrop } from "./utils";
import { IDL, PresaleContract } from "../target/types/presale_contract";
import * as yargs from "yargs";

// Configure client to use the provider.

const buyToken = async () => {
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const presaleProgramId = new anchor.web3.PublicKey(
    "DdMxyt8aCdufZgnZXcjRNzoy3VaNQmVRn7ioxCdwMuZf" // ProgramID
  );

  const presaleProgram = new anchor.Program<PresaleContract>(
    IDL,
    presaleProgramId,
    provider
  );

  const argv = yargs
    .option("amount", {
      alias: "a",
      description: "Amount of SOL to spend",
      type: "number",
      demandOption: true,
    })
    .argv;

  const controllerPubkey = new anchor.web3.PublicKey(
    "6PCADjhaC76Q9EZXtizRsADLTsw8Zs2gpmuq1v1pbBjQ" // Controller Address
  );

  const user = keyPairFromSecretKey("/home/zeroex/.config/solana/Controller.json");
  const recipientPubkey = new anchor.web3.PublicKey(
    "2QQAXmtsbRyG5NBbPKfrpMCi6NHHaumLbQTTBEwGvwZP" // Solana Receiver Address
  );

  console.log(`controller: ${controllerPubkey}`);
  console.log(`user: ${user.publicKey}`);
  console.log(`recipient: ${recipientPubkey}`);

  const mintKey: anchor.web3.PublicKey = new anchor.web3.PublicKey(
    "3RvnZHQtTc2uM7SpexTTUErhv6qFQeTRy4EdRfFwHK4C" // Token Mint Address
  );

  let poolKey, vaultKey, saleUserKey, userTokenKey;
  const poolSeed = anchor.utils.bytes.utf8.encode("pool");
  const vaultSeed = anchor.utils.bytes.utf8.encode("vault");
  const saleSeed = anchor.utils.bytes.utf8.encode("sale");

  [poolKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [poolSeed, controllerPubkey.toBuffer(), mintKey.toBuffer()],
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
    new anchor.BN(argv.amount * anchor.web3.LAMPORTS_PER_SOL)
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
