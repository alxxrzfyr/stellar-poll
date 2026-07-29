export const CONTRACT_ID =
  import.meta.env.VITE_CONTRACT_ID ||
  "CDIH3FZMQSMD36LJO6KNYNWCXABE5LV7CC3DQC7C26VEYRBSRQPHK5WZ";
export const RPC_URL =
  import.meta.env.VITE_RPC_URL ||
  "https://soroban-testnet.stellar.org";
export const NETWORK_PASSPHRASE =
  import.meta.env.VITE_NETWORK_PASSPHRASE ||
  "Test SDF Network ; September 2015";
export const HORIZON_URL =
  import.meta.env.VITE_HORIZON_URL ||
  "https://horizon-testnet.stellar.org";

export const FRIENDBOT_URL = "https://friendbot.stellar.org";
export const STELLAR_EXPERT_TX_URL =
  "https://stellar.expert/explorer/testnet/tx/";
export const STELLAR_EXPERT_CONTRACT_URL =
  "https://stellar.expert/explorer/testnet/contract/";

export const EVENT_POLL_INTERVAL_MS = 5000;
export const TX_POLL_INTERVAL_MS = 2000;
export const TX_POLL_TIMEOUT_MS = 30000;
