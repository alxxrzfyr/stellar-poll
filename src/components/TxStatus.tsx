import { useState, useCallback } from "react";
import type { TxState } from "../types";
import { STELLAR_EXPERT_TX_URL } from "../config";
import styles from "./TxStatus.module.css";

interface TxStatusProps {
  txState: TxState;
  onDismiss: () => void;
}

export function TxStatus({ txState, onDismiss }: TxStatusProps) {
  const [copied, setCopied] = useState(false);

  const copyHash = useCallback(() => {
    if (!txState.hash) return;
    navigator.clipboard.writeText(txState.hash).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [txState.hash]);

  if (txState.phase === "idle") return null;

  const isTerminal = txState.phase === "success" || txState.phase === "failed";
  const isInProgress = !isTerminal;

  const containerClass = [
    styles.container,
    txState.phase === "success" ? styles.success : "",
    txState.phase === "failed" ? styles.failed : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={containerClass} role="status" aria-live="polite">
      <div className={styles.content}>
        <div className={`${styles.iconWrap} ${getIconClass(txState.phase)}`}>
          {isInProgress ? (
            <div className={styles.spinner} aria-hidden="true" />
          ) : txState.phase === "success" ? (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          ) : (
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          )}
        </div>

        <div className={styles.body}>
          <p className={styles.label}>{getLabel(txState.phase)}</p>
          {txState.error && <p className={styles.error}>{txState.error}</p>}

          {txState.phase === "success" && txState.hash && (
            <div className={styles.proof}>
              <a
                href={`${STELLAR_EXPERT_TX_URL}${txState.hash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.proofLink}
              >
                View on Stellar Expert
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                  <polyline points="15 3 21 3 21 9" />
                  <line x1="10" y1="14" x2="21" y2="3" />
                </svg>
              </a>
              {!copied ? (
                <button className={styles.copyBtn} onClick={copyHash}>
                  Copy hash
                </button>
              ) : (
                <span className={styles.copied}>Copied</span>
              )}
            </div>
          )}
        </div>

        {isTerminal && (
          <button className={styles.dismiss} onClick={onDismiss} aria-label="Dismiss">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

function getIconClass(phase: TxState["phase"]): string {
  switch (phase) {
    case "success": return styles.ok;
    case "failed": return styles.err;
    default: return styles.pending;
  }
}

function getLabel(phase: TxState["phase"]): string {
  switch (phase) {
    case "building": return "Preparing transaction...";
    case "simulating": return "Simulating on network...";
    case "awaiting-signature": return "Confirm in your wallet";
    case "submitting": return "Submitting to Stellar...";
    case "pending": return "Waiting for confirmation...";
    case "success": return "Vote recorded on-chain";
    case "failed": return "Transaction failed";
    default: return "";
  }
}
