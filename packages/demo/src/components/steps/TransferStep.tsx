'use client';
import {FC, useEffect, useMemo, useRef} from "react";
import {useTokenBalance} from "@/components/hooks/useTokenBalance";
import {airdropTo, MINT, transferTo} from "@/lib/token";
import {hasPass, issuePassToTokenAccount} from "@/lib/gateway";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {PublicKey} from "@solana/web3.js";
import {createTransferInstruction} from "@civic/permissioned-transfer";
import toast from "react-hot-toast";

export const TransferStep: FC = ({  }) => {
    const wallet = useWallet();
    const { connection } = useConnection();
    const balance = useTokenBalance(MINT);
    const recipientRef = useRef<HTMLInputElement>(null);

    const isValidRecipient = useMemo(() => {
        if (!recipientRef || balance === 0) return false;

        try {
            new PublicKey(recipientRef.current?.value || '');
        } catch (e) {
            return false;
        }

        return true;
    }, [recipientRef.current?.value])

    const transfer = async () => {
        if (!wallet.publicKey || !recipientRef) return;

        let recipient: PublicKey;
        try {
            recipient = new PublicKey(recipientRef.current?.value || '');
        } catch (e) {
            alert("Invalid recipient address");
            return;
        }

        if (!(await hasPass(recipient, connection))) {
            alert("Recipient does not have a pass");
            return;
        }

        const tx = await transferTo(wallet.publicKey, recipient, wallet.publicKey, connection);

        const txSig = await wallet.sendTransaction(tx, connection);
        console.log("Transfer tx sig:", txSig);
        toast.success(<a href={`https://solana.fm/tx/${txSig}?cluster=devnet-qn1`} target="_blank">Transaction complete. Explorer</a>);
    }

    return (
        <div>
            <input ref={recipientRef} type="text" placeholder="to" className="input input-bordered w-full max-w-xs" />
            <button className="btn btn-primary" onClick={transfer} disabled={!isValidRecipient}>Transfer</button>
        </div>
    )
}