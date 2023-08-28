import { Keypair } from "@solana/web3.js";
import { encode } from 'bs58'

const path = "../../.permissioned-token/";

const gatekeeperNetwork = Keypair.fromSecretKey(Buffer.from(require(`${path}/gatekeeper-network.json`)));
const mint = Keypair.fromSecretKey(Buffer.from(require(`${path}/mint.json`)));
const authority = Keypair.fromSecretKey(Buffer.from(require(`${path}/authority.json`)));
const gatekeeper = Keypair.fromSecretKey(Buffer.from(require(`${path}/gatekeeper.json`)));

console.log(`
# Client-side
NEXT_PUBLIC_GATEKEEPER_NETWORK=${gatekeeperNetwork.publicKey.toBase58()}
NEXT_PUBLIC_MINT=${mint.publicKey.toBase58()}
NEXT_PUBLIC_AIRDROP_AUTHORITY=${encode(authority.secretKey)}
NEXT_PUBLIC_RPC=http://localhost:8899
NEXT_PUBLIC_NETWORK=devnet
# Server-side
NEXT_GATEKEEPER_AUTHORITY=${encode(gatekeeper.secretKey)}
NEXT_RPC=http://localhost:8899
`)