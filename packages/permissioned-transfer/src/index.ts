import {PublicKey, Signer, TransactionInstruction} from "@solana/web3.js";
import {createTransferCheckedInstruction, TOKEN_2022_PROGRAM_ID} from "@solana/spl-token";
import {TOKEN_PROGRAM_ID} from "@solana/spl-token/src/constants";

const EXTRA_ACCOUNT_METAS_SEED = "extra-account-metas";
const CIVIC_TRANSFER_HOOK_PROGRAM_ID = new PublicKey("cto22FHACEgis1zXbY4QJo5Rj6soAQguh1686nZJfNY");
const GATEWAY_TOKEN_PROGRAM_ID = new PublicKey("gatem74V238djXdzWnJf94Wo1DcnuGkfijbf3AuBhfs");

const getExtraAccountMetasAddress = (mint: PublicKey) =>
    PublicKey.findProgramAddressSync(
        [
            Buffer.from(EXTRA_ACCOUNT_METAS_SEED),
            mint.toBuffer()
        ],
        CIVIC_TRANSFER_HOOK_PROGRAM_ID
    )[0]

type TransferInstructionParams = {
    fromTokenAccount: PublicKey,
    token: PublicKey,
    toTokenAccount: PublicKey,
    authority: PublicKey,
    gatekeeperNetwork: PublicKey
    amount: number,
    decimals: number,
    multiSigners?: (Signer | PublicKey)[],
    programId?: PublicKey
}
export const createTransferInstruction = ({
    fromTokenAccount,
    token,
    toTokenAccount,
    authority,
    gatekeeperNetwork,
    amount,
    decimals,
    multiSigners = [],
    programId = TOKEN_2022_PROGRAM_ID
}: TransferInstructionParams): TransactionInstruction => {
    const extraAccountMetasAddress = getExtraAccountMetasAddress(token);
    const [gatewayToken] = PublicKey.findProgramAddressSync(
        [
            toTokenAccount.toBuffer(),
            Buffer.from("gateway", "utf8"),
            Buffer.alloc(8), // 0 seed
            gatekeeperNetwork.toBuffer()
        ], GATEWAY_TOKEN_PROGRAM_ID);
    console.log("GatewayToken: ", gatewayToken.toBase58());

    const extraAccounts = [
        extraAccountMetasAddress,
        gatekeeperNetwork,
        GATEWAY_TOKEN_PROGRAM_ID,
        gatewayToken
    ]

    const transferInstruction = createTransferCheckedInstruction(
        fromTokenAccount,
        token,
        toTokenAccount,
        authority,
        amount,
        decimals,
        multiSigners,
        programId
    );

    transferInstruction.keys.push(
        ...extraAccounts.map((account) => ({pubkey: account, isSigner: false, isWritable: true}))
    );

    transferInstruction.keys.push(
        {pubkey: CIVIC_TRANSFER_HOOK_PROGRAM_ID, isSigner: false, isWritable: true}
    );

    return transferInstruction;
}