import styles from "./ErrorBanner.module.css";

interface ErrorBannerProps {
  message: string;
  onRetry?: () => void;
  kind?: "error" | "warning";
}

export function ErrorBanner({
  message,
  onRetry,
  kind = "error",
}: ErrorBannerProps) {
  return (
    <div
      className={`${styles.banner} ${styles[kind]}`}
      role="alert"
      aria-live="assertive"
    >
      <p className={styles.message}>{message}</p>
      {onRetry && (
        <div className={styles.actions}>
          <button className={styles.retryBtn} onClick={onRetry}>
            Try again
          </button>
        </div>
      )}
    </div>
  );
}
