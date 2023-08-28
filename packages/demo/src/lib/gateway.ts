import {Connection, PublicKey} from "@solana/web3.js";
import {findGatewayToken} from "@identity.com/solana-gateway-ts";
import {getTokenAccount} from "@/lib/token";

export const BASE_GATEKEEPER_NETWORK = new PublicKey("ignREusXmGrscGNUesoU9mxfds9AiYTezUKex2PsZV6");
export const TOKEN_ACCOUNT_GATEKEEPER_NETWORK = new PublicKey(process.env.NEXT_PUBLIC_GATEKEEPER_NETWORK!);

export const issuePassToTokenAccount = async (owner: PublicKey): Promise<void> => {
    const res = await fetch('api/pass', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            owner: owner.toBase58(),
        })
    });

    if (!res.ok) {
        throw new Error(`Failed to issue pass to token account ${owner.toBase58()}`);
    }
}

export const hasPass = async (owner: PublicKey, connection: Connection): Promise<boolean> => {
    const tokenAccount = getTokenAccount(owner);

    const basePass = await findGatewayToken(connection, tokenAccount, TOKEN_ACCOUNT_GATEKEEPER_NETWORK);

    return !!basePass;
}