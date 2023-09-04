'use client';
import {FC, useEffect, useMemo, useState} from "react";
import {useTokenBalance} from "@/components/hooks/useTokenBalance";
import {MINT, transferTo} from "@/lib/token";
import {hasPass} from "@/lib/gateway";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {LAMPORTS_PER_SOL, PublicKey} from "@solana/web3.js";
import toast from "react-hot-toast";

export const TransferStep: FC = ({  }) => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const balance = useTokenBalance(MINT);
    const [recipientStr, setRecipientStr] = useState<string>();
    const [recipient, setRecipient] = useState<PublicKey>();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (!recipientStr) setRecipient(undefined);

        try {
            setRecipient(new PublicKey(recipientStr || ''));
        } catch (e) {
            setRecipient(undefined);
        }
    }, [recipientStr]);
    const transferAllowed = useMemo(() => !!recipient && balance > 0, [recipient, balance]);

    const transfer = async () => {
        if (!wallet.publicKey || !recipient) return;
        const skipUIPassCheck = true;
        if (!skipUIPassCheck && !(await hasPass(recipient, connection))) {
            alert("Recipient does not have a pass");
            return;
        }

        try {
            setLoading(true);
            if (await (connection.getBalance(wallet.publicKey)) < 10_000_000) {
                console.log("Sender has insufficient SOL. Airdropping to sender...");
                const txSig = await connection.requestAirdrop(wallet.publicKey, 1 * LAMPORTS_PER_SOL);
                await connection.confirmTransaction(txSig, "confirmed");
                console.log("Airdrop tx sig:", txSig);
            }

            const tx = await transferTo(wallet.publicKey, recipient, wallet.publicKey, connection);

            const txSig = await wallet.sendTransaction(tx, connection, {skipPreflight: true});
            console.log("Transfer tx sig:", txSig);
            toast.success(<a href={`https://explorer.solana.com/tx/${txSig}?cluster=devnet`} target="_blank">Transaction complete. Explorer</a>);
        } catch (e){
            console.log("Transfer failed:",e);
            toast.error("Transaction failed!")
        } finally {
            setLoading(false);
        }
    }

    return (
        <div>
            <input onChange={e => setRecipientStr(e.target.value)} type="text" placeholder="to" className="input input-bordered w-full max-w-xs" />
            <button className="btn btn-primary" onClick={transfer} disabled={!transferAllowed}>
                Transfer
                {loading && <span className="loading loading-spinner loading-sm"></span>}
            </button>
        </div>
    )
}
