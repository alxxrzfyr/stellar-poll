import { ConnectButton } from "../wallet/ConnectButton";
import { WalletErrors } from "./WalletErrors";
import styles from "./Header.module.css";

export function Header() {
  return (
    <>
      <header className={styles.header}>
        <div className={styles.brand}>
          <div className={styles.logoMark}>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polygon points="12 2 22 8.5 22 15.5 12 22 2 15.5 2 8.5 12 2" />
              <line x1="12" y1="22" x2="12" y2="15.5" />
              <polyline points="22 8.5 12 15.5 2 8.5" />
            </svg>
          </div>
          <span className={styles.logoText}>Stellar Poll</span>
          <span className={styles.badge}>
            <span className={styles.badgeDot} aria-hidden="true" />
            Testnet
          </span>
        </div>
        <div className={styles.right}>
          <ConnectButton />
        </div>
      </header>
      <WalletErrors />
    </>
  );
}
