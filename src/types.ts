export interface PollData {
  question: string;
  options: string[];
  tallies: number[];
}

export type WalletStatus = "disconnected" | "connecting" | "connected";

export interface WalletState {
  status: WalletStatus;
  address: string | null;
  error: WalletError | null;
}

export type WalletErrorKind =
  | "not-installed"
  | "rejected"
  | "insufficient-balance"
  | "network-error";

export interface WalletError {
  kind: WalletErrorKind;
  message: string;
}

export type TxPhase =
  | "idle"
  | "building"
  | "simulating"
  | "awaiting-signature"
  | "submitting"
  | "pending"
  | "success"
  | "failed";

export interface TxState {
  phase: TxPhase;
  hash: string | null;
  error: string | null;
}


