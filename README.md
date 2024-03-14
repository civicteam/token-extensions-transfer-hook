# Civic Pass Transfer Hook

<!-- TOC start -->

* [What is Civic Pass?](#what-is-civic-pass)
* [Can the Civic transfer hook be used without Civic Pass?](#can-the-civic-transfer-hook-be-used-without-civic-pass)
* [What is a transfer hook?](#what-is-a-transfer-hook)
* [How can I create my own permissioned token?](#how-can-i-create-my-own-permissioned-token)
* [Advanced: Using Permissioned Tokens in DeFi](#advanced-using-permissioned-tokens-in-defi)
* [Build and Run the Transfer Hook Demo](#build-and-run-the-transfer-hook-demo)
* [Troubleshooting](#troubleshooting)

<!-- TOC end -->

The Civic Pass Transfer Hook is a [Solana Token Extension](https://solana.com/solutions/token-extensions)
that enables token issuers to enforce constraints on token holders through [Civic Pass](https://civic.com/).

Example constraints include:
- Accredited Investor checks
- Proof of age
- Proof of residency
- Proof of personhood

This repository contains:
- The transfer hook program
- A demo web app
- A client library

<!-- TOC --><a name="what-is-civic-pass"></a>
## What is Civic Pass?

Civic Pass is a tokenized identity verification system that enables users to prove aspects of their identity to
smart contracts (programs) and off-chain entities. It is built on the open-source [Gateway Protocol](https://github.com/identity-com/on-chain-identity-gateway).

<!-- TOC --><a name="can-the-civic-transfer-hook-be-used-without-civic-pass"></a>
## Can the Civic transfer hook be used without Civic Pass?

The Civic transfer hook is built purely on the [Gateway Protocol](https://github.com/identity-com/on-chain-identity-gateway).
and can be used without any third-party services.

In this document, we refer to "Pass" as a token issued via the Gateway Protocol, and "Civic Pass"
as the specific implementation of the Gateway Protocol by Civic, incorporating services, APIs and UI components
designed to simplify the integration of identity verification into applications.

<!-- TOC --><a name="what-is-a-transfer-hook"></a>
## What is a transfer hook?

Transfer Hooks are a feature of Solana Token Extensions that allow token issuers to enforce constraints on token holders.
When a token transfer is attempted, the transfer hook program is called to check if the transfer is allowed.

The Civic Transfer Hook is a transfer hook program that checks if the recipient of a token transfer has a valid pass.

<!-- TOC --><a name="how-can-i-create-my-own-permissioned-token"></a>
## How can I create my own permissioned token?

To create a permissioned token:

<!-- TOC --><a name="1-create-a-token-using-the-solana-token-cli"></a>
### 1. Create a token using the Solana Token CLI

```shell
# Install the Solana CLI tools (restart your shell after this)
sh -c "$(curl -sSfL https://release.solana.com/v1.18.4/install)"

# Install the SPL Token CLI
cargo install spl-token-cli

# Create a new token, providing the Civic transfer hook program ID
spl-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb \
  create-token --transfer-hook cto22FHACEgis1zXbY4QJo5Rj6soAQguh1686nZJfNY
```

For more details, see the [Solana documentation](https://solana.com/developers/guides/token-extensions/getting-started#how-do-i-create-a-token-with-token-extensions).

<!-- TOC --><a name="2-set-the-pass-type-for-the-token"></a>
### 2. Set the pass type for the token

The Pass Type (AKA Gatekeeper Network) represents the type of identity verification that the token issuer wants to enforce.
Only the mint authority can set the pass type.

```shell
cargo run set <MINT> <PASS_TYPE>
```

where
- `MINT` is the token mint address from step 1, and
- `PASS_TYPE` is the pass type key

> [!TIP]
> If you are using Civic Pass, you can obtain the pass type through Civic.
> For more details on Civic Pass, see the [Civic documentation](https://docs.civic.com/).
>
> If you are using the Gateway Protocol directly without Civic, enter your Gatekeeper Network here as the pass type

<!-- TOC --><a name="3-issue-a-base-pass-to-a-token-recipient"></a>
### 3. Issue a base pass to a token recipient

If using Civic Pass, the token recipient can obtain a pass through [civic.me](https://civic.me/), or
or you can issue the pass through the [Civic API](https://docs.civic.com/integration-guides/custom-pass).

If not using Civic pass, but using the Gateway Protocol directly, you can use the [gateway CLI](https://www.npmjs.com/package/@identity.com/solana-gatekeeper-cli)
to issue the pass.

```shell
# Install the CLI
yarn global add @identity.com/solana-gatekeeper-cli # alternatively, use npm install -g or bun install --global

# Issue a pass
gateway issue <RECIPIENT> -n <PASS_TYPE>
```

<!-- TOC --><a name="4-issue-a-token-pass"></a>
### 4. Issue a Token Pass

Due to a constraint in the current Token Extension program, for a pass to be visible to the transfer hook,
it must be issued to the recipient's token account.

Therefore, once recipients are in possession of a general pass, they are ready to be issued a _token pass_,
which is a dedicated pass that enables them for that specific token.

If using Civic Pass, contact [civic.com](https://civic.com/) for more details on how to issue a token pass.

If not using Civic Pass, but using the Gateway Protocol directly, you can again use the CLI:

```shell
# Identify the recipient's associated token address using the SPL Token CLI
spl-token address --token <MINT> --owner <RECIPIENT> --verbose

# Issue a token pass to that address
gateway issue <ASSOCIATED_TOKEN_ADDRESS> -n <PASS_TYPE>
```

> [!TIP]
> The token pass and base pass can use the same pass type. If using a different pass type, ensure that the
> token pass is issued to the pass type registered against the token mint in step 2.

<!-- TOC --><a name="5-transfer-tokens"></a>
### 5. Transfer tokens

The recipient is now enabled to receive your new token. You can use the SPL Token CLI to mint and transfer tokens.

```shell
# Mint some tokens
spl-token mint <MINT> <AMOUNT>

# Transfer tokens to the recipient
spl-token transfer <MINT> <AMOUNT> <RECIPIENT>
```

<!-- TOC --><a name="advanced-using-permissioned-tokens-in-defi"></a>
## Advanced: Using Permissioned Tokens in DeFi

Permissioned tokens can be used in DeFi applications, such as AMMs and lending protocols,
to ensure that only users who have passed certain identity checks can participate.

An example is a Real World Asset (RWA) market, where only accredited investors can participate.

<!-- TOC --><a name="providing-passes-to-users"></a>
### Providing passes to users

As with standard transfers, all users of the DeFi platform must have a pass for the token they are interacting with.

If using Civic, this can be made simpler by using the Civic [UI integration](https://docs.civic.com/integration-guides/civic-pass/integration-overview/ui-integration).

If not using Civic, but using the Gateway Protocol directly,
we recommend you use the [Solana Gateway TS library](https://www.npmjs.com/package/@identity.com/solana-gateway-ts) in your backend to issue passes to users.

<!-- TOC --><a name="integrating-with-defi-protocols"></a>
### Integrating with DeFi protocols

A benefit of the transfer hook protocol is that it is transparent to the DeFi protocol.
This hook can be used with existing DeFi protocols (that support Solana Token Extensions)
without modification of the protocol itself.

However, in order to enable transfers into a given market, pool or order-book, the token account PDA
must have a pass for the token, so that the transfer hook permits the transfer.

<!-- TOC --><a name="example-using-the-transfer-hook-with-openbook-v2"></a>
#### Example: Using the transfer hook with Openbook v2

[Openbook](https://openbookdex.com/) is an open-source order-book DEX for Solana. To enable a permissioned token for Openbook:

1. Create a market for the permissioned token and a quote currency (e.g. USDC)
2. Obtain the [Market Vault](https://github.com/openbook-dex/openbook-v2/blob/0712ec199c3a9271f581beefceca24dda90c3588/programs/openbook-v2/src/accounts_ix/place_order.rs#L46) address for the permissioned token
3. Issue a token pass to the Market Vault address (see above)

<!-- TOC --><a name="example-using-the-transfer-hook-with-orca"></a>
#### Example: Using the transfer hook with Orca

[Orca](https://www.orca.so/) is a Solana Automated Market Maker (AMM). To enable a permissioned token for Orca:

1. Create a liquidity pool for the permissioned token and a quote currency (e.g. USDC)
2. Determine the [Token Vault](https://github.com/orca-so/whirlpools/blob/d32735634306e4c83e7470dc17986ff67b4ae1dc/programs/whirlpool/src/instructions/swap.rs#L24) for the permissioned token
3. Issue a token pass to the Token Vault address (see above)

<!-- TOC --><a name="build-and-run-the-transfer-hook-demo"></a>
## Build and Run the Transfer Hook Demo

The next steps will lead you through setting up the demo UI and running it against a
local Solana test validator.

<!-- TOC --><a name="prerequisites"></a>
### Prerequisites

- Solana v1.18+
- Rust v1.73+
- Node v18 & yarn v1.22+
- Anchor CLI v0.28.0+

To install Solana:

```shell
sh -c "$(curl -sSfL https://release.solana.com/v1.18.2/install)"
```

To install Anchor:

```shell
cargo install --git https://github.com/coral-xyz/anchor avm --locked --force
avm install latest
avm use latest
```

<!-- TOC --><a name="run-locally"></a>
### Run locally

```shell
yarn
yarn build:program
yarn start-local-validator
```

In another shell:

```shell
yarn setup-local
yarn start-demo
```

Go to http://localhost:3000

<!-- TOC --><a name="executing-the-demo"></a>
### Executing the demo

![Demo](./doc/screenshot.png)

1. Connect a wallet
2. Get a pass on devnet
3. Click airdrop to receive a token (see the explorer link to show the transaction including the transfer hook CPI)
4. Switch your wallet to a localhost RPC (Backpack supports this). Note for simplicity you can do this after step 2 if needed.
5. Copy some random wallet address (generate a new one with `solana-keygen new --no-outfile --no-bip39-passphrase`)
6. Paste the address into the transfer input and click "Transfer" - should receive an alert saying the user has no pass
7. Run the following command to get a valid recipient address: `solana address -k .permissioned-token/valid-recipient.json`
8. Paste the above address into the transfer input and click "Transfer" - open the explorer to show that the recipient's pass was checked.

Note: Pasting your own address in step 8 will not work, as self-transfers are short-circuited in the program and do not go through the transfer hook.

<!-- TOC --><a name="troubleshooting"></a>
## Troubleshooting

<!-- TOC --><a name="if-you-see"></a>
### If you see:

```platform-tools` 1.16: `cargo build-sbf` error: failed to run custom build command for `blake3 v1.4.0```

Do this: https://solana.stackexchange.com/a/6989

```shell
brew install gcc@12
sudo echo 'export CPATH="/Library/Developer/CommandLineTools/SDKs/MacOSX.sdk/usr/include"' >> ~/.zshrc
```

then open a new shell

### If you see

```
[PageNotFoundError]: Cannot find module for page: /_document
```

Do this:
`rm -r packages/demo/node_modules/.next/`

and then rerun `yarn build`