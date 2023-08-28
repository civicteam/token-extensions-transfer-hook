'use client';
import {Reducer, useEffect, useReducer} from "react";
import {GatewayStatus, useGateway} from "@civic/solana-gateway-react";
import {useTokenBalance} from "@/components/hooks/useTokenBalance";
import {MINT} from "@/lib/token";

type StepStatus = {
    status: 'pending' | 'success' | 'error';
}
type StepsState = {
    steps: StepStatus[];
}

type Action = { type: 'GATEWAY_RESULT', payload: GatewayStatus } | { type: 'BALANCE_RESULT', payload: number };

const reducer = (state: StepsState, action: Action): StepsState => {
    switch (action.type) {
        case 'GATEWAY_RESULT':
            switch (action.payload) {
                case GatewayStatus.ACTIVE:
                    return {
                        ...state,
                        steps: [
                            { status: 'success' },
                            ...state.steps.slice(1),
                        ],
                    }
                case GatewayStatus.ERROR:
                    return {
                        ...state,
                        steps: [
                            { status: 'error' },
                            ...state.steps.slice(1),
                        ],
                    }
            }
        case "BALANCE_RESULT":
            return {
                ...state,
                steps: [
                    state.steps[0],
                    { status: action.payload > 0 ? 'success' : 'pending' },
                    ...state.steps.slice(2),
                ],
            }
        default:
            return state;
    }
}

export const useSteps = () => {
    const [stepsState, dispatch] = useReducer<Reducer<StepsState, Action>>(reducer, {
        steps: [
            { status: 'pending' },  // civic pass
            { status: 'pending' },  // airdrop
            { status: 'pending' },  // transfer
        ]
    });
    const { gatewayStatus } = useGateway();
    const balance = useTokenBalance(MINT);

    useEffect(() => {
        dispatch({ type: 'GATEWAY_RESULT', payload: gatewayStatus })
    }, [gatewayStatus]);

    useEffect(() => {
        dispatch({ type: 'BALANCE_RESULT', payload: balance })
    }, [balance]);

    return stepsState;
}