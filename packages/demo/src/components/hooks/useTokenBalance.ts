import {useEffect, useMemo, useState} from "react";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {PublicKey} from "@solana/web3.js";
import {getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID} from "@solana/spl-token";

export const useTokenBalance = (mint: PublicKey) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    const [balance, setBalance] = useState<number>(0);
    const tokenAccount = useMemo(
        () => !!wallet.publicKey && getAssociatedTokenAddressSync(mint, wallet.publicKey, true, TOKEN_2022_PROGRAM_ID),
        [mint, wallet.publicKey]
    );

    useEffect(() => {
        if (!wallet.publicKey || !tokenAccount) return;

        const notify = () => {
            connection.getTokenAccountBalance(tokenAccount).then((balance) => {
                setBalance(Number(balance.value.amount));
            }).catch(console.error);
        }

        notify();
        const subscriptionId = connection.onAccountChange(tokenAccount, notify);

        return () => {
            connection.removeAccountChangeListener(subscriptionId);
        }
    }, [tokenAccount, wallet.publicKey, connection]);

    return balance;
}