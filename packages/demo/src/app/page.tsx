'use client';
import {Step} from "@/components/Step";
import {CivicPassStep} from "@/components/steps/CivicPassStep";
import {useSteps} from "@/components/hooks/useSteps";
import {WalletMultiButton} from "@solana/wallet-adapter-react-ui";
import {AirdropStep} from "@/components/steps/AirdropStep";
import {TransferStep} from "@/components/steps/TransferStep";
import {FaChevronRight} from "react-icons/fa6";

export default function Home() {
    const stepsState = useSteps();
    const focusStep = stepsState.steps.find(step => step.status === 'pending');
    return (
        <main className="flex min-h-screen flex-col items-center justify-between p-4">
            <div className="flex flex-col items-center justify-center">
                <div className="flex justify-end items-end w-screen">
                    <WalletMultiButton />
                </div>
                <div className="flex flex-row items-center justify-center">
                    <img src={'/civic-logo-orange.svg'} className="w-48 h-48 pr-4" />
                    <div className="text-2xl">Token-Extensions Transfer Hook Demo</div>
                </div>
                <div className="flex flex-row items-center justify-center">
                    <img src={'/solana.svg'} className="h-4 pr-4" />
                </div>
            </div>
            <div className="flex flex-col md:flex-row w-screen md:w-2/3 items-center justify-center">
                <Step title="Civic Pass" description=""
                      done={stepsState.steps[0].status === 'success'}
                      focus={stepsState.steps[0] === focusStep}
                >
                    <CivicPassStep />
                </Step>
                <FaChevronRight className="text-4xl" />
                <Step title="Airdrop" description=""
                      done={stepsState.steps[1].status === 'success'}
                      focus={stepsState.steps[1] === focusStep}
                >
                    <AirdropStep />
                </Step>
                <FaChevronRight className="text-4xl" />
                <Step title="Transfer" description=""
                      done={stepsState.steps[2].status === 'success'}
                      focus={stepsState.steps[2] === focusStep}
                >
                    <TransferStep />
                </Step>
            </div>
            <div className="flex justify-end items-end w-screen">
                Created by <a className="pl-1 pr-1" href="https://www.linkedin.com/in/kelleherdaniel/">Daniel Kelleher</a> © 2024 Civic Technologies, Inc.
            </div>
        </main>
    )
}
