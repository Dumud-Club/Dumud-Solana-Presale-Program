import * as yargs from "yargs";
import * as bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { PresaleContract } from "../target/types/presale_contract";
import { TOKEN_PROGRAM_ID, createAccount } from "@solana/spl-token";

// Configure client to use the provider.

const buyToken = async () => {
  const provider = anchor.AnchorProvider.env();

  anchor.setProvider(provider);

  const presaleProgram = anchor.workspace
    .PresaleContract as anchor.Program<PresaleContract>;

  const argv = yargs.options({
    mint: {
      alias: "m",
      demandOption: true,
      description: "mint publicKey",
    },
    user: {
      alias: "u",
      demandOption: true,
      description: "user privateKey",
    },
    controller: {
      alias: "c",
      demandOption: true,
      description: "controller publicKey",
    },
    amount: {
      alias: "a",
      demandOption: true,
      description: "amount of SOL",
    },
    receiver: {
        alias: "r",
        demandOption: true,
        description: "receiver publicKey",  
    }
  }).argv;

  let poolKey, vaultKey, saleUserKey, userTokenKey;
  const poolSeed = anchor.utils.bytes.utf8.encode("pool");
  const vaultSeed = anchor.utils.bytes.utf8.encode("vault");
  const saleSeed = anchor.utils.bytes.utf8.encode("sale");
  const mintKey: anchor.web3.PublicKey = new anchor.web3.PublicKey(argv.mint);
  const user = anchor.web3.Keypair.fromSecretKey(bs58.decode(argv.user));
  const controllerPubKey = new anchor.web3.PublicKey(argv.controller);

  [poolKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [poolSeed, controllerPubKey.toBuffer(), mintKey.toBuffer()],
    presaleProgram.programId
  );

  [vaultKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [vaultSeed, poolKey.toBuffer()],
    presaleProgram.programId
  );

  [saleUserKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [saleSeed, user.publicKey.toBuffer()],
    presaleProgram.programId
  );

  userTokenKey = await createAccount(
    provider.connection,
    user,
    mintKey,
    user.publicKey
  );

  console.log(
    `please transfer presale token to [vaultKey]: ${vaultKey.toBase58()}`
  );

  await buy(user, saleUserKey, userTokenKey, argv.amount);

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
        recipent: argv.receiverPubkey,
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
