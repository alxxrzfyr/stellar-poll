import { STELLAR_EXPERT_TX_URL } from "../config";
import styles from "./VoterFeed.module.css";

interface VoterFeedProps {
  votes: { voter: string; option: number; ledger: number; txHash: string }[];
  options: string[];
}

export function VoterFeed({ votes, options }: VoterFeedProps) {
  if (votes.length === 0) return null;

  return (
    <div className={styles.container}>
      <h3 className={styles.heading}>Recent Activity</h3>
      <ul className={styles.list} aria-label="Recent votes">
        {votes.map((v) => {
          const shortVoter = `${v.voter.slice(0, 4)}...${v.voter.slice(-4)}`;
          const optionLabel = options[v.option] || `Option ${v.option}`;
          const shortHash = v.txHash.slice(0, 8);

          return (
            <li key={v.txHash} className={styles.item}>
              <span className={styles.voter}>{shortVoter}</span>
              <span className={styles.action}>
                voted for <span className={styles.optionName}>{optionLabel}</span>
              </span>
              <a
                href={`${STELLAR_EXPERT_TX_URL}${v.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.txLink}
                title={`Transaction ${v.txHash}`}
              >
                {shortHash}
              </a>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
