import * as anchor from "@coral-xyz/anchor";
import * as fs from "fs";

export function keyPairFromSecretKey(path: string): anchor.web3.Keypair {
  const rawPayerKeypair = JSON.parse(fs.readFileSync(path, "utf-8"));
  return anchor.web3.Keypair.fromSecretKey(Buffer.from(rawPayerKeypair));
}

export async function airdrop(provider: anchor.AnchorProvider, toPubkey: anchor.web3.PublicKey, amount: number) {
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