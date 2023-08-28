/**
 * Send permissioned tokens to a recipient
 *
 * Usage:
 *  - ts-node scripts/transfer.ts --network <network> --token <token> --recipient <recipient> --amount <amount>
 *
 */

import { program } from 'commander';
import {
    clusterApiUrl,
    Connection,
    Keypair,
    PublicKey,
    TransactionMessage,
    VersionedTransaction
} from "@solana/web3.js";
import * as os from "os";
import {
    getAssociatedTokenAddressSync,
    TOKEN_2022_PROGRAM_ID,
} from "@solana/spl-token";
import { createTransferInstruction } from "@civic/permissioned-transfer"

const EXTRA_ACCOUNT_METAS_SEED = "extra-account-metas";
const CIVIC_TRANSFER_HOOK_PROGRAM_ID = new PublicKey("cto22FHACEgis1zXbY4QJo5Rj6soAQguh1686nZJfNY");

const networks = ['mainnet-beta', 'testnet', 'devnet', 'localnet'] as const;
type Network = typeof networks[number];
type Options = { network: Network, token: PublicKey, recipient: PublicKey, authority: Keypair, amount: number }

const networkUrl: Record<Network, string> = {
    'mainnet-beta': process.env.MAINNET_URL || clusterApiUrl('mainnet-beta'),
    'testnet': process.env.TESTNET_URL || clusterApiUrl('testnet'),
    'devnet': process.env.DEVNET_URL || clusterApiUrl('devnet'),
    'localnet': process.env.LOCALNET_URL || 'http://localhost:8899',
}

const loadKeypair = (path: string): Keypair => Keypair.fromSecretKey(Buffer.from(require(path)))

const stringToNetwork = (value: string) => {
    if (!networks.includes(value as Network)) {
        throw new Error(`Invalid network: ${value}`);
    }
    return value as Network;
}

const getExtraAccountMetasAddress = (mint: PublicKey) => {
    return PublicKey.findProgramAddressSync(
        [
            Buffer.from(EXTRA_ACCOUNT_METAS_SEED),
            mint.toBuffer()
        ],
        CIVIC_TRANSFER_HOOK_PROGRAM_ID
    )[0];
}

const transfer = async (options: Options) => {
    const { network, token, recipient, amount, authority } = options;

    // You can add logic here to handle the transfer action
    console.log(`Transferring ${amount} of ${token} to ${recipient} on ${network} network.`);

    const connection = new Connection(networkUrl[network], 'confirmed');

    const fromTokenAccount = getAssociatedTokenAddressSync(
        token,
        authority.publicKey,
        true,
        TOKEN_2022_PROGRAM_ID
    );

    const toTokenAccount = getAssociatedTokenAddressSync(
        token,
        recipient,
        true,
        TOKEN_2022_PROGRAM_ID
    );

    const extraAccountMetasAddress = getExtraAccountMetasAddress(token);
    console.log("ExtraAccountMetas: ",  extraAccountMetasAddress.toBase58());
    const extraAccountMetasAccount = await connection.getAccountInfo(extraAccountMetasAddress);

    // The GKN is at byte offset 17
    const gatekeeperNetworkBytes = extraAccountMetasAccount.data.subarray(17, 49);
    const gatekeeperNetwork = new PublicKey(gatekeeperNetworkBytes);
    console.log("GatekeeperNetwork: ", gatekeeperNetwork.toBase58());

    // Note, a wallet, that wants to stay agnostic to the type of transfer hook,
    // would derive the gateway token from the seeds defined in the ExtraAccountMetas account
    // using the off-chain helpers provided by the transfer-hook program.
    // Until there are JS helpers for this, we use the domain-knowledge that the gateway token
    // is derived from the GKN, a seed literal and the owner
    console.log("toTokenAccount: ", toTokenAccount.toBase58());

    const transferInstruction = createTransferInstruction({
        fromTokenAccount,
        token,
        toTokenAccount,
        authority: authority.publicKey,
        gatekeeperNetwork,
        amount,
        decimals: 9
    })

    transferInstruction.keys.map((key, i) => {
        console.log("Key: ", i, key.pubkey.toBase58());
    });

    console.log("Source: ", fromTokenAccount.toBase58());
    console.log("Destination: ", toTokenAccount.toBase58());
    console.log("Authority: ", authority.publicKey.toBase58());

    const { blockhash } = await connection.getLatestBlockhash();
    const message = new TransactionMessage({
        payerKey: authority.publicKey,
        recentBlockhash: blockhash,
        instructions: [transferInstruction],
    }).compileToV0Message();

    const tx = new VersionedTransaction(message);
    tx.sign([authority]);

    try {
        const txSig = await connection.sendTransaction(tx)
        console.log(`Transaction ${txSig} sent`);
    } catch (e) {
        console.log(e.logs)
    }
}

// Define the CLI program
program
    .option<Network>('--network <network>', 'Network to use', stringToNetwork, 'localnet')
    .option<Keypair>('--authority <authority>', 'The token sender', loadKeypair, loadKeypair(os.homedir() + '/.config/solana/id.json'))
    .requiredOption<PublicKey>('--token <token>', 'Token to transfer', (value) => new PublicKey(value))
    .requiredOption<PublicKey>('--recipient <recipient>', 'Recipient of the token transfer', (value) => new PublicKey(value))
    .requiredOption<number>('--amount <amount>', 'Amount of tokens to transfer', (value) => parseInt(value, 10))
    .action(transfer);

// Parse the CLI arguments
program.parse(process.argv);