'use client';

import {GatewayProvider} from "@civic/solana-gateway-react";
import {FC, PropsWithChildren} from "react";
import {useConnection, useWallet} from "@solana/wallet-adapter-react";
import {BASE_GATEKEEPER_NETWORK} from "@/lib/gateway";

export const CivicWrapper: FC<PropsWithChildren> = ({ children }) => {
    const { connection } = useConnection();
    const wallet = useWallet();
    return (
        <GatewayProvider
            cluster="devnet"
            connection={connection}
            wallet={wallet}
            gatekeeperNetwork={BASE_GATEKEEPER_NETWORK}
        >
            {children}
        </GatewayProvider>
    )
}
