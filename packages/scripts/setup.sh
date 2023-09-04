# A shell script that uses the
# [SPL Token CLI](https://spl.solana.com/token) and
# [Gateway CLI](https://www.npmjs.com/package/@identity.com/solana-gatekeeper-cli) to create a permissioned token.

set -eu

TOKEN_2022_PROGRAM=TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb
# Draft deployment of Token2022 on devnet
#TOKEN_2022_PROGRAM=t2TnDQYGTVwMjPTdu9CiG15bwrxU3a1aREf7if7qVRr
TRANSFER_HOOK_PROGRAM_ID=cto22FHACEgis1zXbY4QJo5Rj6soAQguh1686nZJfNY

# Switch to localnet
#NETWORK=localnet
#solana config set --url http://127.0.0.1:8899
# Switch to devnet
NETWORK=devnet
solana config set --url devnet

# If no keys are created, then create the folder and keys
if [ ! -d .permissioned-token ]; then

  mkdir .permissioned-token
  cd .permissioned-token

  # Create the required accounts
  solana-keygen new --no-bip39-passphrase -s --outfile mint.json
  solana-keygen new --no-bip39-passphrase -s --outfile authority.json
  solana-keygen new --no-bip39-passphrase -s --outfile valid-recipient.json
  solana-keygen new --no-bip39-passphrase -s --outfile invalid-recipient.json
  solana-keygen new --no-bip39-passphrase -s --outfile gatekeeper-network.json
  solana-keygen new --no-bip39-passphrase -s --outfile gatekeeper.json

  # Airdrop to each account
  solana airdrop 1 -k authority.json
  solana airdrop 1 -k valid-recipient.json
  solana airdrop 1 -k invalid-recipient.json
  solana airdrop 1 -k gatekeeper-network.json
  solana airdrop 1 -k gatekeeper.json
else
  cd .permissioned-token
fi

MINT=$(solana address -k mint.json)
AUTHORITY=$(solana address -k authority.json)
VALID_RECIPIENT=$(solana address -k valid-recipient.json)
INVALID_RECIPIENT=$(solana address -k invalid-recipient.json)
GATEKEEPER=$(solana address -k gatekeeper.json)
GKN=$(solana address -k gatekeeper-network.json)

# Requires the latest built version of the spl token cli
# should be changed for others
SPL_TOKEN_CLI_PATH=../tests/fixtures/spl-token
alias token=$SPL_TOKEN_CLI_PATH
alias civic-permissioned-token=../target/debug/civic-transfer-hook-cli

# solve this problem on node 17+:
# request to http://localhost:8899/ failed, reason: connect ECONNREFUSED ::1:8899
export NODE_OPTIONS=--dns-result-order=ipv4first

# Set up the gatekeeper network
yarn gateway add-gatekeeper -n $PWD/gatekeeper-network.json -c $NETWORK $GATEKEEPER

# Switch to the token mint authority
solana config set --keypair $PWD/authority.json

# Set up the token mint
token create-token --program-id $TOKEN_2022_PROGRAM --mint-authority $AUTHORITY --transfer-hook $TRANSFER_HOOK_PROGRAM_ID mint.json
# token set-transfer-hook-program --program-id $TOKEN_2022_PROGRAM $MINT $TRANSFER_HOOK_PROGRAM_ID
civic-permissioned-token set $MINT $GKN

echo "Creating token accounts"
# Create token accounts
token create-account $MINT --program-id $TOKEN_2022_PROGRAM --fee-payer authority.json --owner $AUTHORITY
token create-account $MINT --program-id $TOKEN_2022_PROGRAM --fee-payer authority.json --owner $VALID_RECIPIENT
token create-account $MINT --program-id $TOKEN_2022_PROGRAM --fee-payer authority.json --owner $INVALID_RECIPIENT

# Mint tokens
token mint $MINT 1000000

# Issue a Gateway Token to the valid recipient
# NOTE usually this is created against the recipient, but we are using the token account here to be compatible with Token2022 as it stands
VALID_RECIPIENT_TOKEN_ACCOUNT=$(token accounts --owner $VALID_RECIPIENT \
  --program-id $TOKEN_2022_PROGRAM \
  --output json | jq -r --arg mint $MINT '.accounts[] | select(.mint=$mint) | .address')
echo "Issuing gateway token to $VALID_RECIPIENT_TOKEN_ACCOUNT"
yarn gateway issue -n $GKN -c $NETWORK -g $PWD/gatekeeper.json $VALID_RECIPIENT_TOKEN_ACCOUNT