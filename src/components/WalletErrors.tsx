import { useWallet } from "../wallet/provider";
import { ErrorBanner } from "./ErrorBanner";
import { FundButton } from "./FundButton";
import { useEffect, useState, useCallback } from "react";
import { checkBalance } from "../contract/client";

export function WalletErrors() {
  const { state, connect, clearError } = useWallet();
  const [lowBalance, setLowBalance] = useState(false);

  const recheckBalance = useCallback(() => {
    if (state.status === "connected" && state.address) {
      checkBalance(state.address).then(({ funded }) => {
        setLowBalance(!funded);
      });
    }
  }, [state.status, state.address]);

  useEffect(() => {
    recheckBalance();
  }, [recheckBalance]);

  if (state.error) {
    return (
      <div style={{ position: "fixed", top: 60, left: "50%", transform: "translateX(-50%)", zIndex: 100, width: "calc(100% - 2rem)", maxWidth: 420, pointerEvents: "auto" }}>
        <ErrorBanner
          message={state.error.message}
          kind={state.error.kind === "rejected" ? "warning" : "error"}
          onRetry={state.error.kind === "rejected" ? connect : clearError}
        />
      </div>
    );
  }

  if (lowBalance && state.address) {
    return (
      <div style={{ position: "fixed", bottom: 24, left: "50%", transform: "translateX(-50%)", zIndex: 100, width: "calc(100% - 2rem)", maxWidth: 480, pointerEvents: "auto" }}>
        <FundButton address={state.address} onFunded={recheckBalance} />
      </div>
    );
  }

  return null;
}
