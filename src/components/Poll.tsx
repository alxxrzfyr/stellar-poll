import { useEffect, useState, useCallback, useRef } from "react";
import { useWallet } from "../wallet/provider";
import { getPoll, hasVoted, getLatestLedger, getVoteEvents } from "../contract/client";
import { useVote } from "../hooks/useVote";
import { PollOption } from "./PollOption";
import { TxStatus } from "./TxStatus";
import { ErrorBanner } from "./ErrorBanner";
import { VoterFeed } from "./VoterFeed";
import { EVENT_POLL_INTERVAL_MS, CONTRACT_ID, STELLAR_EXPERT_CONTRACT_URL } from "../config";
import type { PollData } from "../types";
import styles from "./Poll.module.css";

export function Poll() {
  const { state: walletState } = useWallet();
  const [poll, setPoll] = useState<PollData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [alreadyVoted, setAlreadyVoted] = useState(false);
  const [recentVotes, setRecentVotes] = useState<
    { voter: string; option: number; ledger: number; txHash: string }[]
  >([]);
  const { txState, vote, reset: resetTx } = useVote();
  const cursorRef = useRef<number | null>(null);
  const seenHashesRef = useRef(new Set<string>());
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchPoll = useCallback(async () => {
    try {
      const data = await getPoll();
      setPoll(data);
      setError(null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to load poll");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPoll();
  }, [fetchPoll]);

  useEffect(() => {
    if (walletState.status === "connected" && walletState.address) {
      hasVoted(walletState.address).then(setAlreadyVoted).catch(() => {});
    } else {
      setAlreadyVoted(false);
    }
  }, [walletState.status, walletState.address]);

  useEffect(() => {
    if (txState.phase === "success") {
      setAlreadyVoted(true);
      fetchPoll();
    }
  }, [txState.phase, fetchPoll]);

  // Event polling for real-time updates
  useEffect(() => {
    let active = true;

    async function initPolling() {
      try {
        const ledger = await getLatestLedger();
        cursorRef.current = ledger;
      } catch {
        // non-fatal
      }
    }

    async function pollEvents() {
      if (!cursorRef.current || !active) return;
      try {
        const events = await getVoteEvents(cursorRef.current);
        let updated = false;
        const newVotes: typeof recentVotes = [];
        for (const event of events) {
          if (!seenHashesRef.current.has(event.txHash)) {
            seenHashesRef.current.add(event.txHash);
            updated = true;
            newVotes.push(event);
            if (event.ledger >= (cursorRef.current || 0)) {
              cursorRef.current = event.ledger + 1;
            }
          }
        }
        if (updated) {
          setRecentVotes((prev) => [...newVotes, ...prev].slice(0, 10));
          fetchPoll();
        }
      } catch {
        // non-fatal
      }
    }

    initPolling();
    intervalRef.current = setInterval(pollEvents, EVENT_POLL_INTERVAL_MS);

    return () => {
      active = false;
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPoll]);

  useEffect(() => {
    function handleFocus() { fetchPoll(); }
    window.addEventListener("focus", handleFocus);
    return () => window.removeEventListener("focus", handleFocus);
  }, [fetchPoll]);

  const handleVote = (optionIndex: number) => {
    if (!walletState.address) return;
    vote(walletState.address, optionIndex);
  };

  if (loading) {
    return (
      <div className={styles.loading}>
        <div className={styles.loadingInner}>
          <div className={styles.loadingOrb} />
          <p className={styles.loadingText}>Connecting to Stellar network...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.errorWrap}>
        <ErrorBanner message={error} onRetry={fetchPoll} />
      </div>
    );
  }

  if (!poll) return null;

  const totalVotes = poll.tallies.reduce((sum, t) => sum + t, 0);
  const maxVotes = Math.max(...poll.tallies);
  const canVote =
    walletState.status === "connected" && !alreadyVoted && txState.phase === "idle";

  const contractShort = `${CONTRACT_ID.slice(0, 4)}...${CONTRACT_ID.slice(-4)}`;

  return (
    <main className={styles.page}>
      <div className={styles.hero}>
        <p className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden="true" />
          Live on-chain poll
        </p>
        <h1 className={styles.question}>
          {poll.question.includes("Soroban") ? (
            <>
              {poll.question.split("Soroban")[0]}
              <span className={styles.questionAccent}>Soroban</span>
              {poll.question.split("Soroban")[1]}
            </>
          ) : (
            poll.question
          )}
        </h1>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{totalVotes}</span>
            <span>votes</span>
          </div>
          <div className={styles.statDivider} aria-hidden="true" />
          <div className={styles.statItem}>
            <span className={styles.statValue}>{poll.options.length}</span>
            <span>options</span>
          </div>
        </div>
      </div>

      <div className={styles.optionsGrid} role="group" aria-label="Poll options">
        {poll.options.map((option, index) => (
          <PollOption
            key={index}
            index={index}
            label={option}
            votes={poll.tallies[index]}
            total={totalVotes}
            disabled={!canVote}
            onVote={() => handleVote(index)}
            isLeading={poll.tallies[index] === maxVotes && maxVotes > 0}
          />
        ))}
      </div>

      <div className={styles.footer}>
        {walletState.status !== "connected" && txState.phase === "idle" && (
          <p className={styles.hint}>Connect your wallet to cast a vote on the Stellar network.</p>
        )}

        {alreadyVoted && txState.phase === "idle" && (
          <p className={styles.voted}>
            <svg
              className={styles.votedIcon}
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
            Vote recorded on-chain
          </p>
        )}

        <TxStatus txState={txState} onDismiss={resetTx} />

        {recentVotes.length > 0 && poll && (
          <VoterFeed votes={recentVotes} options={poll.options} />
        )}

        <div className={styles.contractRow}>
          <span>Contract</span>
          <a
            href={`${STELLAR_EXPERT_CONTRACT_URL}${CONTRACT_ID}`}
            target="_blank"
            rel="noopener noreferrer"
            className={styles.contractLink}
            title={CONTRACT_ID}
          >
            {contractShort}
          </a>
        </div>
      </div>
    </main>
  );
}
