import { NextResponse, NextRequest } from 'next/server'
import {clusterApiUrl, Connection, Keypair, PublicKey} from "@solana/web3.js";
import {GatekeeperService, SimpleGatekeeperService} from '@identity.com/solana-gatekeeper-lib'
import { findGatewayToken } from '@identity.com/solana-gateway-ts'
import {BASE_GATEKEEPER_NETWORK, TOKEN_ACCOUNT_GATEKEEPER_NETWORK} from "@/lib/gateway";
import {decode} from "bs58";
import {getTokenAccount, MINT} from "@/lib/token";

const rpc = process.env.NEXT_RPC || clusterApiUrl('devnet');

const connection = new Connection(rpc, 'confirmed');
// TODO TEMP while working on localhost
const devnetConnection = new Connection(clusterApiUrl('devnet'), 'confirmed');
const authority = Keypair.fromSecretKey(decode(process.env.NEXT_GATEKEEPER_AUTHORITY!));
const gatekeeperService = new SimpleGatekeeperService(connection, TOKEN_ACCOUNT_GATEKEEPER_NETWORK, authority);

export async function POST(request: NextRequest) {
    const { owner: ownerStr } = await request.json()
    const owner = new PublicKey(ownerStr);
    const tokenAccount = getTokenAccount(owner);

    const basePass = await findGatewayToken(devnetConnection, owner, BASE_GATEKEEPER_NETWORK);

    if (!basePass) {
        throw new Error(`No base pass found for ${owner.toBase58()}`);
    }

    console.log("Issuing gateway token to ", tokenAccount.toBase58());
    const gt = await gatekeeperService.issue(tokenAccount);

    if (!gt) throw new Error(`Failed to issue gateway token for ${owner.toBase58()}`);

    console.log("Gateway token: ", gt.publicKey.toBase58());

    return NextResponse.json({ gatewayToken: gt.publicKey.toBase58()  })
}