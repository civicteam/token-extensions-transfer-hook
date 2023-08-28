'use client';

import { WalletAdapterNetwork } from '@solana/wallet-adapter-base';
import {
    ConnectionProvider,
    WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import {
    PhantomWalletAdapter,
    SolflareWalletAdapter,
    TorusWalletAdapter,
    BackpackWalletAdapter,
} from '@solana/wallet-adapter-wallets';
import { clusterApiUrl } from '@solana/web3.js';
import {FC, PropsWithChildren, useMemo} from 'react';

export const network =
    (process.env.NEXT_PUBLIC_NETWORK as WalletAdapterNetwork) ||
    WalletAdapterNetwork.Devnet;

const WalletWrapper: FC<PropsWithChildren> = ({ children }) => {
    const endpoint = useMemo(
        () => process.env.NEXT_PUBLIC_RPC || clusterApiUrl(network),
        [network],
    );
    const wallets = useMemo(
        () => [
            new PhantomWalletAdapter(),
            new BackpackWalletAdapter(),
            new SolflareWalletAdapter(),
            new TorusWalletAdapter(),
        ],
        [],
    );

    return (
        <ConnectionProvider endpoint={endpoint}>
            <WalletProvider wallets={wallets}>
                <WalletModalProvider>{children}</WalletModalProvider>
            </WalletProvider>
        </ConnectionProvider>
    );
};

export { WalletWrapper };
