#!/usr/bin/env bash
set -euo pipefail

# Initialize the poll on the deployed contract.
# Usage: ./scripts/init-poll.sh <CONTRACT_ID>
#
# Prerequisites:
#   - stellar CLI installed
#   - deployer identity funded on testnet

CONTRACT_ID="${1:?Usage: ./scripts/init-poll.sh <CONTRACT_ID>}"

DEPLOYER_ADDRESS=$(stellar keys address deployer)

echo "Initializing poll on contract ${CONTRACT_ID}..."
echo "Admin: ${DEPLOYER_ADDRESS}"
echo ""

stellar contract invoke \
  --id "${CONTRACT_ID}" \
  --source deployer \
  --network testnet \
  -- \
  init \
  --admin "${DEPLOYER_ADDRESS}" \
  --question "What is the best feature of Soroban?" \
  --options '["Smart contract composability", "Predictable gas fees", "Rust safety guarantees", "Stellar network speed"]'

echo ""
echo "Poll initialized successfully."
echo "Question: What is the best feature of Soroban?"
echo "Options: Smart contract composability, Predictable gas fees, Rust safety guarantees, Stellar network speed"
