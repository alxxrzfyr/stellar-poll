import { useState, useCallback } from "react";
import { buildVoteTx, submitTx, pollTxStatus, checkBalance } from "../contract/client";
import { useWallet } from "../wallet/provider";
import { TX_POLL_INTERVAL_MS, TX_POLL_TIMEOUT_MS, NETWORK_PASSPHRASE } from "../config";
import type { TxState } from "../types";

const INITIAL_STATE: TxState = { phase: "idle", hash: null, error: null };

export function useVote() {
  const [txState, setTxState] = useState<TxState>(INITIAL_STATE);
  const { kit } = useWallet();

  const vote = useCallback(
    async (address: string, optionIndex: number) => {
      if (!kit) return;

      try {
        // Check balance first.
        setTxState({ phase: "building", hash: null, error: null });
        const { funded } = await checkBalance(address);
        if (!funded) {
          setTxState({
            phase: "failed",
            hash: null,
            error:
              "Your testnet account has no XLM. Fund it with Friendbot before voting.",
          });
          return;
        }

        // Build and simulate.
        setTxState({ phase: "simulating", hash: null, error: null });
        const prepared = await buildVoteTx(address, optionIndex);

        // Sign.
        setTxState({ phase: "awaiting-signature", hash: null, error: null });
        const { signedTxXdr } = await kit.signTransaction(prepared.toXDR(), {
          networkPassphrase: NETWORK_PASSPHRASE,
          address,
        });

        // Submit.
        setTxState({ phase: "submitting", hash: null, error: null });
        const { hash } = await submitTx(signedTxXdr);

        // Poll for result.
        setTxState({ phase: "pending", hash, error: null });
        const result = await pollTxStatus(
          hash,
          TX_POLL_TIMEOUT_MS,
          TX_POLL_INTERVAL_MS,
        );

        if (result.status === "success") {
          setTxState({ phase: "success", hash, error: null });
        } else {
          setTxState({ phase: "failed", hash, error: result.error || null });
        }
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        const friendlyMessage = mapVoteError(message);
        setTxState((prev) => ({
          phase: "failed",
          hash: prev.hash,
          error: friendlyMessage,
        }));
      }
    },
    [kit],
  );

  const reset = useCallback(() => {
    setTxState(INITIAL_STATE);
  }, []);

  return { txState, vote, reset };
}

function mapVoteError(message: string): string {
  const lower = message.toLowerCase();

  if (lower.includes("already_voted") || lower.includes("already voted")) {
    return "You have already voted on this poll.";
  }
  if (
    lower.includes("rejected") ||
    lower.includes("cancelled") ||
    lower.includes("denied") ||
    lower.includes("user refused")
  ) {
    return "Transaction signing was cancelled. You can try again.";
  }
  if (
    lower.includes("insufficient") ||
    lower.includes("underfunded") ||
    lower.includes("balance")
  ) {
    return "Insufficient balance to pay transaction fees. Fund your account with Friendbot.";
  }
  if (lower.includes("not found") || lower.includes("not exist")) {
    return "Account not found on testnet. Fund it with Friendbot first.";
  }

  return `Vote failed: ${message}`;
}
