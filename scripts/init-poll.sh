#!/usr/bin/env bash
set -euo pipefail

CONTRACT_ID="${1:?Usage: ./scripts/init-poll.sh <CONTRACT_ID>}"
DEPLOYER_ADDRESS=$(stellar keys address deployer)

echo "Initializing poll on contract ${CONTRACT_ID}..."
stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source deployer \
  --network testnet \
  -- \
  init \
  --admin "${DEPLOYER_ADDRESS}" \
  --question "What is the best feature of Soroban?" \
  --options '["Smart contract composability", "Predictable gas fees", "Rust safety guarantees", "Stellar network speed"]'

echo "Poll initialized successfully."
