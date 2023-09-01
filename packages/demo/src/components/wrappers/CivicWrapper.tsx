'use client';

import {GatewayProvider} from "@civic/solana-gateway-react";
import {FC, PropsWithChildren, useMemo} from "react";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {BASE_GATEKEEPER_NETWORK} from "@/lib/gateway";
import {clusterApiUrl, Connection} from "@solana/web3.js";

export const CivicWrapper: FC<PropsWithChildren> = ({ children }) => {
    const devnetConnection = useMemo(() => new Connection(clusterApiUrl("devnet"), "confirmed"), []);
    const wallet = useWallet();
    return (
        <GatewayProvider
            cluster="devnet"
            connection={devnetConnection}
            wallet={wallet}
            gatekeeperNetwork={BASE_GATEKEEPER_NETWORK}
        >
            {children}
        </GatewayProvider>
    )
}
