import { useWallet } from "./provider";
import styles from "./ConnectButton.module.css";

export function ConnectButton() {
  const { state, connect, disconnect } = useWallet();

  if (state.status === "connected" && state.address) {
    const short = `${state.address.slice(0, 4)}...${state.address.slice(-4)}`;
    return (
      <div className={styles.connected}>
        <span className={styles.address} title={state.address}>
          {short}
        </span>
        <button
          className={styles.disconnectBtn}
          onClick={disconnect}
          aria-label="Disconnect wallet"
        >
          Disconnect
        </button>
      </div>
    );
  }

  return (
    <button
      className={styles.connectBtn}
      onClick={connect}
      disabled={state.status === "connecting"}
      aria-label="Connect wallet"
    >
      {state.status === "connecting" ? "Connecting..." : "Connect Wallet"}
    </button>
  );
}
