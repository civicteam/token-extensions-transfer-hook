'use client';
import {FC, useState} from "react";
import {useTokenBalance} from "@/components/hooks/useTokenBalance";
import {airdropTo, MINT} from "@/lib/token";
import {hasPass, issuePassToTokenAccount} from "@/lib/gateway";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

export const AirdropStep: FC = ({  }) => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const balance = useTokenBalance(MINT);
    const [loading, setLoading] = useState(false);

    const airdrop = async () => {
        if (!wallet.publicKey) return;
        try {
            setLoading(true);

            if (!(await hasPass(wallet.publicKey, connection))) {
                console.log("Issuing pass");
                await issuePassToTokenAccount(wallet.publicKey)
            }

            console.log("Airdropping tokens");
            const txSig = await airdropTo(wallet.publicKey, connection);
            console.log("Airdrop tx sig:", txSig);
            toast.success(<a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank">Airdrop complete. Explorer</a>);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="flex flex-col items-center">
            <div className="flex h-12 items-center">Balance: {balance}</div>
            <button className="btn btn-primary" onClick={airdrop}>
                Airdrop
                {loading && <span className="loading loading-spinner loading-sm"></span>}
            </button>
        </div>
    )
}