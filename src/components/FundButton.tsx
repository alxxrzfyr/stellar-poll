import { useState, useCallback } from "react";
import { FRIENDBOT_URL } from "../config";
import styles from "./FundButton.module.css";

interface FundButtonProps {
  address: string;
  onFunded?: () => void;
}

type FundState = "idle" | "funding" | "success" | "error";

export function FundButton({ address, onFunded }: FundButtonProps) {
  const [state, setState] = useState<FundState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const fund = useCallback(async () => {
    setState("funding");
    setErrorMsg("");

    try {
      const res = await fetch(`${FRIENDBOT_URL}?addr=${address}`);
      if (!res.ok) {
        const text = await res.text();
        if (text.includes("createAccountAlreadyExist")) {
          setState("success");
          onFunded?.();
          return;
        }
        throw new Error(`Friendbot returned ${res.status}`);
      }
      setState("success");
      onFunded?.();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Funding failed";
      setErrorMsg(msg);
      setState("error");
    }
  }, [address, onFunded]);

  if (state === "success") {
    return (
      <div className={styles.container}>
        <div className={styles.info}>
          <p className={styles.success}>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Account funded with 10,000 test XLM
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.info}>
        <p className={styles.title}>No XLM balance detected</p>
        <p className={styles.description}>
          Fund your testnet account with Friendbot to pay transaction fees.
        </p>
        {state === "error" && <p className={styles.error}>{errorMsg}</p>}
      </div>
      <button
        className={styles.fundBtn}
        onClick={fund}
        disabled={state === "funding"}
      >
        {state === "funding" ? "Funding..." : "Fund Account"}
      </button>
    </div>
  );
}
