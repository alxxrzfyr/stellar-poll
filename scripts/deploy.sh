#!/usr/bin/env bash
set -euo pipefail

# Deploy the poll contract to Stellar testnet.
# Prerequisites:
#   - stellar CLI installed
#   - Rust + wasm32-unknown-unknown target installed
#   - A funded deployer identity: stellar keys generate --global deployer --network testnet

echo "Building contract..."
cd contracts/poll
stellar contract build

echo ""
echo "Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_poll.wasm \
  --source deployer \
  --network testnet)

echo ""
echo "Contract deployed!"
echo "CONTRACT_ID=${CONTRACT_ID}"
echo ""
echo "Add this to your .env file:"
echo "VITE_CONTRACT_ID=${CONTRACT_ID}"
