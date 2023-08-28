'use client';
import {FC} from "react";
import {useTokenBalance} from "@/components/hooks/useTokenBalance";
import {airdropTo, MINT} from "@/lib/token";
import {hasPass, issuePassToTokenAccount} from "@/lib/gateway";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import toast from "react-hot-toast";

export const AirdropStep: FC = ({  }) => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const balance = useTokenBalance(MINT);

    const issuePass = async () => {
        if (!wallet.publicKey) return;
        if (!(await hasPass(wallet.publicKey, connection))) {
            console.log("Issuing pass");
            await issuePassToTokenAccount(wallet.publicKey)
        }

        console.log("Airdropping tokens");
        const txSig = await airdropTo(wallet.publicKey, connection);
        // console.log(Buffer.from(tx.serialize()).toString('hex'));
        // const txSig = await wallet.sendTransaction(tx, connection);
        console.log("Airdrop tx sig:", txSig);
        toast.success(<a href={`https://solana.fm/tx/${txSig}?cluster=devnet-qn1`} target="_blank">Airdrop complete. Explorer</a>);
    }

    return (
        <div className="flex flex-col items-center">
            <div className="flex h-12 items-center">Balance: {balance}</div>
            <button className="btn btn-primary" onClick={issuePass}>Airdrop</button>
        </div>
    )
}