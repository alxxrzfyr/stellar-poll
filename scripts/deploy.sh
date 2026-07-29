#!/usr/bin/env bash
set -euo pipefail

echo "Building contract..."
cd contracts/poll
stellar contract build

echo "Deploying to testnet..."
CONTRACT_ID=$(stellar contract deploy \
  --wasm target/wasm32-unknown-unknown/release/stellar_poll.wasm \
  --source deployer \
  --network testnet)

echo "Contract deployed: ${CONTRACT_ID}"
