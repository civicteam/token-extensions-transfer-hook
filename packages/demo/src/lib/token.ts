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
    getAssociatedTokenAddressSync, TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import {TOKEN_ACCOUNT_GATEKEEPER_NETWORK} from "@/lib/gateway";

// Draft Token2022 program ID on devnet
// const TOKEN_2022_PROGRAM_ID_ALPHA= new PublicKey('t2TnDQYGTVwMjPTdu9CiG15bwrxU3a1aREf7if7qVRr');

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
    console.log("createTokenAccountIx", createTokenAccountIx)
    console.log("Destination token account", toTokenAccount.toBase58());
    console.log("Source token account", fromTokenAccount.toBase58());
    console.log("Authority", from.toBase58());
    console.log("MINT", MINT.toBase58());


    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: payer,
        recentBlockhash: blockhash,
        instructions: [createTokenAccountIx, transferIx].filter(ix => ix) as TransactionInstruction[],
    }).compileToV0Message();

    console.log("message", message)
    console.log("transferIx", transferIx);

    return new VersionedTransaction(message);
}

export const airdropTo = async (recipient: PublicKey, connection: Connection): Promise<string> => {
    const tx = await transferTo(AIRDROP_AUTHORITY.publicKey, recipient, AIRDROP_AUTHORITY.publicKey, connection);
    tx.sign([AIRDROP_AUTHORITY]);
    return connection.sendTransaction(tx);
}