import * as yargs from "yargs";
import * as bs58 from "bs58";
import * as anchor from "@coral-xyz/anchor";
import { IDL, PresaleContract } from "../target/types/presale_contract";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

// Configure client to use the provider.

const init = async () => {
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

  const argv = yargs.options({
    mint: {
      alias: "m",
      demandOption: true,
      description: "mint pubkey",
    },
    controller: {
      alias: "c",
      demandOption: true,
      description: "controller private key",
    },
  }).argv;

  let poolKey, vaultKey;
  const poolSeed = anchor.utils.bytes.utf8.encode("pool");
  const vaultSeed = anchor.utils.bytes.utf8.encode("vault");
  const mintKey: anchor.web3.PublicKey = new anchor.web3.PublicKey(argv.mint);
  const controller = anchor.web3.Keypair.fromSecretKey(
    bs58.decode(argv.controller)
  );

  [poolKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [poolSeed, controller.publicKey.toBuffer(), mintKey.toBuffer()],
    presaleProgram.programId
  );

  [vaultKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [vaultSeed, poolKey.toBuffer()],
    presaleProgram.programId
  );

  console.log(
    `please transfer presale token to [vaultKey]: ${vaultKey.toBase58()}`
  );

  await initVault(controller);

  async function initVault(signer: anchor.web3.Keypair) {
    const tx = await presaleProgram.methods
      .initialize()
      .accounts({
        payer: signer.publicKey,
        mint: mintKey,
        pool: poolKey,
        vault: vaultKey,
        systemProgram: anchor.web3.SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
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

init();
