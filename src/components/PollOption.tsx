import styles from "./PollOption.module.css";

interface PollOptionProps {
  index: number;
  label: string;
  votes: number;
  total: number;
  disabled: boolean;
  onVote: () => void;
  isLeading?: boolean;
}

export function PollOption({
  index,
  label,
  votes,
  total,
  disabled,
  onVote,
  isLeading = false,
}: PollOptionProps) {
  const percentage = total > 0 ? Math.round((votes / total) * 100) : 0;

  const className = [styles.card, isLeading ? styles.leading : ""]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      className={className}
      onClick={onVote}
      disabled={disabled}
      aria-label={`Vote for ${label}, currently ${votes} votes (${percentage}%)`}
    >
      <div className={styles.top}>
        <span className={styles.label}>{label}</span>
        <span className={styles.index}>{index + 1}</span>
      </div>

      <div className={styles.bottom}>
        <div className={styles.progressTrack}>
          <div
            className={styles.progressFill}
            style={{ width: `${percentage}%` }}
            aria-hidden="true"
          />
        </div>
        <div className={styles.statsRow}>
          <span className={styles.percentage}>{percentage}%</span>
          <span className={styles.voteCount}>
            {votes} vote{votes !== 1 ? "s" : ""}
          </span>
        </div>
      </div>
    </button>
  );
}
