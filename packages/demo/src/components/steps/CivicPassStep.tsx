'use client';
import {IdentityButton, useGateway} from "@civic/solana-gateway-react";
import {FC} from "react";

export const CivicPassStep: FC = ({  }) => {
    const { gatewayStatus } = useGateway();
    console.log("gatewayStatus", gatewayStatus);
    return (
        <div>
            <IdentityButton />
        </div>
    )
}