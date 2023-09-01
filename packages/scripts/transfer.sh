# solve this problem on node 17+:
# request to http://localhost:8899/ failed, reason: connect ECONNREFUSED ::1:8899
export NODE_OPTIONS=--dns-result-order=ipv4first

yarn ts-node packages/scripts/transfer.ts \
 --token $(solana address -k .permissioned-token/mint.json) \
 --recipient $(solana address -k .permissioned-token/valid-recipient.json) \
 --authority ../../.permissioned-token/authority.json \
 --amount 100
