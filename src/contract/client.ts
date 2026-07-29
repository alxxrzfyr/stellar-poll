import * as StellarSdk from "@stellar/stellar-sdk";
import { CONTRACT_ID, RPC_URL, NETWORK_PASSPHRASE } from "../config";
import type { PollData } from "../types";

const server = new StellarSdk.rpc.Server(RPC_URL);

export async function getPoll(): Promise<PollData> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const tx = new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      "0",
    ),
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE },
  )
    .addOperation(contract.call("get_poll"))
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    throw new Error(`Simulation failed: ${sim.error}`);
  }

  const result = (sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result;
  if (!result) {
    throw new Error("No result from simulation");
  }

  return parsePollData(result.retval);
}

export async function hasVoted(address: string): Promise<boolean> {
  const contract = new StellarSdk.Contract(CONTRACT_ID);
  const tx = new StellarSdk.TransactionBuilder(
    new StellarSdk.Account(
      "GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF",
      "0",
    ),
    { fee: "100", networkPassphrase: NETWORK_PASSPHRASE },
  )
    .addOperation(
      contract.call("has_voted", StellarSdk.nativeToScVal(address, { type: "address" })),
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);
  if (StellarSdk.rpc.Api.isSimulationError(sim)) return false;

  const result = (sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse).result;
  if (!result) return false;

  return StellarSdk.scValToNative(result.retval) as boolean;
}

export async function buildVoteTx(
  voterAddress: string,
  optionIndex: number,
): Promise<StellarSdk.Transaction> {
  const account = await server.getAccount(voterAddress);
  const contract = new StellarSdk.Contract(CONTRACT_ID);

  const tx = new StellarSdk.TransactionBuilder(account, {
    fee: "100",
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(
      contract.call(
        "vote",
        StellarSdk.nativeToScVal(voterAddress, { type: "address" }),
        StellarSdk.nativeToScVal(optionIndex, { type: "u32" }),
      ),
    )
    .setTimeout(30)
    .build();

  const sim = await server.simulateTransaction(tx);

  if (StellarSdk.rpc.Api.isSimulationError(sim)) {
    const errorMsg = sim.error || "Simulation failed";
    if (errorMsg.toLowerCase().includes("already")) {
      throw new Error("ALREADY_VOTED");
    }
    throw new Error(errorMsg);
  }

  return StellarSdk.rpc.assembleTransaction(
    tx,
    sim as StellarSdk.rpc.Api.SimulateTransactionSuccessResponse,
  ).build();
}

export async function submitTx(signedXdr: string): Promise<{ hash: string }> {
  const tx = StellarSdk.TransactionBuilder.fromXDR(signedXdr, NETWORK_PASSPHRASE);
  const response = await server.sendTransaction(tx);

  if (response.status === "ERROR") {
    throw new Error(`Transaction submission failed: ${response.status}`);
  }

  return { hash: response.hash };
}

export async function pollTxStatus(
  hash: string,
  timeoutMs: number,
  intervalMs: number,
): Promise<{ status: "success" | "failed"; error?: string }> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const result = await server.getTransaction(hash);

    if (result.status === "SUCCESS") {
      return { status: "success" };
    }
    if (result.status === "FAILED") {
      return {
        status: "failed",
        error: "Transaction failed on-chain.",
      };
    }

    await sleep(intervalMs);
  }

  return {
    status: "failed",
    error: "Transaction timed out.",
  };
}

export async function getVoteEvents(
  startLedger: number,
): Promise<{ voter: string; option: number; ledger: number; txHash: string }[]> {
  const response = await server.getEvents({
    startLedger,
    filters: [
      {
        type: "contract",
        contractIds: [CONTRACT_ID],
        topics: [["AAAADwAAAAR2b3Rl", "*"]],
      },
    ],
    limit: 50,
  });

  return response.events.map((event) => {
    const topicValues = event.topic;
    const voter =
      topicValues.length > 1
        ? StellarSdk.scValToNative(topicValues[1])
        : "unknown";
    const option = StellarSdk.scValToNative(event.value) as number;

    return {
      voter: String(voter),
      option,
      ledger: event.ledger,
      txHash: event.id.split("-")[0] || event.id,
    };
  });
}

export async function getLatestLedger(): Promise<number> {
  const result = await server.getLatestLedger();
  return result.sequence;
}

export async function checkBalance(address: string): Promise<{
  funded: boolean;
  balance: string;
}> {
  try {
    await server.getAccount(address);
    return { funded: true, balance: "funded" };
  } catch {
    return { funded: false, balance: "0" };
  }
}

function parsePollData(scVal: StellarSdk.xdr.ScVal): PollData {
  const native = StellarSdk.scValToNative(scVal);

  if (native && typeof native === "object") {
    return {
      question: String(native.question || ""),
      options: (native.options || []).map(String),
      tallies: (native.tallies || []).map(Number),
    };
  }

  throw new Error("Unexpected poll data format");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
