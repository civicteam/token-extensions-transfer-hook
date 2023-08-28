import {
    Connection,
    Keypair,
    PublicKey,
    TransactionInstruction,
    TransactionMessage,
    VersionedTransaction
} from "@solana/web3.js";
import {decode} from "bs58";
import {createTransferInstruction} from "@civic/permissioned-transfer";
import {
    createAssociatedTokenAccountInstruction,
    getAssociatedTokenAddressSync,
    TOKEN_2022_PROGRAM_ID
} from "@solana/spl-token";
import {TOKEN_ACCOUNT_GATEKEEPER_NETWORK} from "@/lib/gateway";

export const MINT = new PublicKey(process.env.NEXT_PUBLIC_MINT!);

export const AIRDROP_AUTHORITY = Keypair.fromSecretKey(decode(process.env.NEXT_PUBLIC_AIRDROP_AUTHORITY!));

export const getTokenAccount = (owner: PublicKey): PublicKey => getAssociatedTokenAddressSync(
    MINT,
    owner,
    true,
    TOKEN_2022_PROGRAM_ID
);

const createTokenAccountInstruction = async (owner: PublicKey, payer: PublicKey, connection: Connection): Promise<TransactionInstruction | null> => {
    const tokenAccount = getTokenAccount(owner);
    const accountInfo = await connection.getAccountInfo(tokenAccount);

    if (accountInfo) return null;

    return createAssociatedTokenAccountInstruction(
        payer,
        tokenAccount,
        owner,
        MINT,
        TOKEN_2022_PROGRAM_ID
    );
}

export const transferTo = async (from: PublicKey, recipient: PublicKey, payer: PublicKey, connection: Connection): Promise<VersionedTransaction> => {
    const fromTokenAccount = getTokenAccount(from);
    const toTokenAccount = getTokenAccount(recipient);
    const transferIx = createTransferInstruction({
        fromTokenAccount,
        token: MINT,
        toTokenAccount,
        authority: from,
        gatekeeperNetwork: TOKEN_ACCOUNT_GATEKEEPER_NETWORK,
        amount: 1,
        decimals: 9
    })

    const createTokenAccountIx = await createTokenAccountInstruction(recipient, payer, connection);

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions: [createTokenAccountIx, transferIx].filter(ix => ix) as TransactionInstruction[],
    }).compileToV0Message();

    return new VersionedTransaction(message);
}

export const airdropTo = async (recipient: PublicKey, connection: Connection): Promise<string> => {
    const connection2 = new Connection('http://localhost:8899', 'confirmed');
    const tx = await transferTo(AIRDROP_AUTHORITY.publicKey, recipient, AIRDROP_AUTHORITY.publicKey, connection2);
    tx.sign([AIRDROP_AUTHORITY]);
    return connection2.sendTransaction(tx, {skipPreflight: true});
}