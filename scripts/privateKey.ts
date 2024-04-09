import * as yargs from "yargs";
import * as anchor from "@coral-xyz/anchor";
import * as bs58 from "bs58";
import * as fs from "fs";

const argv = yargs.options({
    path: {
      alias: "p",
      demandOption: false,
      default: "/home/rss/.config/solana/id.json",
      description: "path of seed",
    },
  }).argv;
  
const rawPayerKeypair = JSON.parse(fs.readFileSync(argv.path, "utf-8"));
const payerKeypair = anchor.web3.Keypair.fromSecretKey(Buffer.from(rawPayerKeypair));

console.log(bs58.encode(payerKeypair.secretKey));

