import { Keypair } from "@solana/web3.js";
import { encode } from 'bs58'
import * as fs from "fs";

const path = "../../.permissioned-token/";
const envPath = "packages/demo/.env"

const gatekeeperNetwork = Keypair.fromSecretKey(Buffer.from(require(`${path}/gatekeeper-network.json`)));
const mint = Keypair.fromSecretKey(Buffer.from(require(`${path}/mint.json`)));
const authority = Keypair.fromSecretKey(Buffer.from(require(`${path}/authority.json`)));
const gatekeeper = Keypair.fromSecretKey(Buffer.from(require(`${path}/gatekeeper.json`)));

const env = `
# Client-side
NEXT_PUBLIC_GATEKEEPER_NETWORK=${gatekeeperNetwork.publicKey.toBase58()}
NEXT_PUBLIC_MINT=${mint.publicKey.toBase58()}
NEXT_PUBLIC_AIRDROP_AUTHORITY=${encode(authority.secretKey)}
NEXT_PUBLIC_RPC=http://127.0.0.1:8899
# Server-side
NEXT_GATEKEEPER_AUTHORITY=${encode(gatekeeper.secretKey)}
NEXT_RPC=http://127.0.0.1:8899
`
console.log(env);
fs.writeFileSync(envPath, env);
console.log(`Wrote env to ${envPath}`);