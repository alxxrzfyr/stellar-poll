import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  StellarWalletsKit,
  WalletNetwork,
  allowAllModules,
  FREIGHTER_ID,
} from "@creit.tech/stellar-wallets-kit";
import type { WalletState, WalletError } from "../types";
import { NETWORK_PASSPHRASE } from "../config";

interface WalletContextValue {
  state: WalletState;
  kit: StellarWalletsKit | null;
  connect: () => void;
  disconnect: () => void;
  clearError: () => void;
}

const WalletContext = createContext<WalletContextValue | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<WalletState>({
    status: "disconnected",
    address: null,
    error: null,
  });

  const kit = useMemo(
    () =>
      new StellarWalletsKit({
        network: NETWORK_PASSPHRASE as WalletNetwork,
        selectedWalletId: FREIGHTER_ID,
        modules: allowAllModules(),
      }),
    [],
  );

  const connect = useCallback(() => {
    setState((s) => ({ ...s, status: "connecting", error: null }));

    kit.openModal({
      onWalletSelected: async (option) => {
        try {
          kit.setWallet(option.id);
          const { address } = await kit.getAddress();
          setState({ status: "connected", address, error: null });
        } catch (err: unknown) {
          const walletError = mapWalletError(err);
          setState({ status: "disconnected", address: null, error: walletError });
        }
      },
      onClosed: () => {
        setState((prev) => {
          if (prev.status === "connecting") {
            return { ...prev, status: "disconnected" };
          }
          return prev;
        });
      },
    });
  }, [kit]);

  const disconnect = useCallback(() => {
    setState({ status: "disconnected", address: null, error: null });
  }, []);

  const clearError = useCallback(() => {
    setState((s) => ({ ...s, error: null }));
  }, []);

  const value: WalletContextValue = useMemo(
    () => ({ state, kit, connect, disconnect, clearError }),
    [state, kit, connect, disconnect, clearError],
  );

  return (
    <WalletContext.Provider value={value}>{children}</WalletContext.Provider>
  );
}

export function useWallet(): WalletContextValue {
  const ctx = useContext(WalletContext);
  if (!ctx) {
    throw new Error("useWallet must be used within WalletProvider");
  }
  return ctx;
}

function mapWalletError(err: unknown): WalletError {
  const message = err instanceof Error ? err.message : String(err);
  const lower = message.toLowerCase();

  if (
    lower.includes("not installed") ||
    lower.includes("not found") ||
    lower.includes("no provider")
  ) {
    return {
      kind: "not-installed",
      message:
        "Wallet extension not found. Install Freighter from freighter.app or use Albedo which works without an extension.",
    };
  }

  if (
    lower.includes("user rejected") ||
    lower.includes("rejected") ||
    lower.includes("cancelled") ||
    lower.includes("denied")
  ) {
    return {
      kind: "rejected",
      message: "Connection cancelled. Click Connect Wallet to try again.",
    };
  }

  return {
    kind: "network-error",
    message: `Wallet connection failed: ${message}`,
  };
}
