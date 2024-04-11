import * as anchor from "@coral-xyz/anchor";
import { IDL, PresaleContract } from "../target/types/presale_contract";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";
import { keyPairFromSecretKey } from "./utils";

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

  const deployer = keyPairFromSecretKey(
    "/home/rss/.config/solana/deployer.json"
  );
  const controller = keyPairFromSecretKey(
    "/home/rss/.config/solana/controller.json"
  );
  const user = keyPairFromSecretKey("/home/rss/.config/solana/user.json");
  const recipientPubkey = new anchor.web3.PublicKey(
    "4FSwJ68KUcUjUSj9xqqXDhZQqidxJQ8R8PrKuQLs5RSp"
  );

  console.log(`deployer: ${deployer.publicKey}`);
  console.log(`controller: ${controller.publicKey}`);
  console.log(`user: ${user.publicKey}`);
  console.log(`receiver: ${recipientPubkey}`);

  const mintKey: anchor.web3.PublicKey = new anchor.web3.PublicKey(
    "9LNwDSqsy26kVewEAQtovqRREyDtkvB4SAjiyLgZEKbT"
  );

  let poolKey, vaultKey;
  const poolSeed = anchor.utils.bytes.utf8.encode("pool");
  const vaultSeed = anchor.utils.bytes.utf8.encode("vault");

  [poolKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [poolSeed, controller.publicKey.toBuffer(), mintKey.toBuffer()],
    presaleProgramId
  );

  [vaultKey] = await anchor.web3.PublicKey.findProgramAddressSync(
    [vaultSeed, poolKey.toBuffer()],
    presaleProgramId
  );

  console.log(
    `please transfer presale token to [vaultKey]: ${vaultKey.toBase58()}`
  );

  console.log(`vaultKey ${vaultKey}`);
  console.log(`poolKey ${poolKey}`);

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
