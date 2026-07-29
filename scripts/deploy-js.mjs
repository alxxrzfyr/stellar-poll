import * as StellarSDK from "@stellar/stellar-sdk";
import fs from "fs";
import path from "path";

const RPC_URL = "https://soroban-testnet.stellar.org:443";
const NETWORK_PASSPHRASE = StellarSDK.Networks.TESTNET;
const FRIENDBOT_URL = "https://friendbot.stellar.org";

const server = new StellarSDK.rpc.Server(RPC_URL);

async function main() {
  const wasmPath =
    process.argv[2] ||
    path.resolve("contracts/poll/wasm/stellar_poll.wasm");

  if (!fs.existsSync(wasmPath)) {
    console.error(`Wasm file not found: ${wasmPath}`);
    process.exit(1);
  }

  let keypair;
  if (process.env.DEPLOYER_SECRET) {
    keypair = StellarSDK.Keypair.fromSecret(process.env.DEPLOYER_SECRET);
    console.log(`Using existing deployer: ${keypair.publicKey()}`);
  } else {
    keypair = StellarSDK.Keypair.random();
    console.log(`Generated keypair: ${keypair.publicKey()}`);
    console.log(`Secret: ${keypair.secret()}`);
    console.log("Funding via Friendbot...");
    const res = await fetch(`${FRIENDBOT_URL}?addr=${keypair.publicKey()}`);
    if (!res.ok) {
      throw new Error(`Friendbot funding failed: ${res.status}`);
    }
    console.log("Funded.");
  }

  console.log("\n--- Uploading contract wasm ---");
  const bytecode = fs.readFileSync(wasmPath);
  console.log(`Wasm size: ${bytecode.length} bytes`);
  const uploadResponse = await uploadWasm(keypair, bytecode);
  const wasmHash = uploadResponse.returnValue.bytes();
  console.log(`Wasm hash: ${Buffer.from(wasmHash).toString("hex")}`);

  console.log("\n--- Deploying contract instance ---");
  const contractAddress = await deployContract(keypair, wasmHash, uploadResponse.hash);
  console.log(`Contract ID: ${contractAddress}`);

  console.log("\n--- Initializing poll ---");
  await initPoll(keypair, contractAddress);

  console.log("\n=== DEPLOYMENT COMPLETE ===");
  console.log(`Contract ID: ${contractAddress}`);
  console.log(`Add to your .env file: VITE_CONTRACT_ID=${contractAddress}`);
}

async function uploadWasm(keypair, bytecode) {
  const account = await server.getAccount(keypair.publicKey());
  const operation = StellarSDK.Operation.uploadContractWasm({ wasm: bytecode });
  return await buildAndSendTransaction(keypair, account, operation);
}

async function deployContract(keypair, wasmHash, salt) {
  const account = await server.getAccount(keypair.publicKey());
  const operation = StellarSDK.Operation.createCustomContract({
    wasmHash: wasmHash,
    address: StellarSDK.Address.fromString(keypair.publicKey()),
    salt: salt,
  });
  const response = await buildAndSendTransaction(keypair, account, operation);
  return StellarSDK.StrKey.encodeContract(
    StellarSDK.Address.fromScAddress(response.returnValue.address()).toBuffer(),
  );
}

async function initPoll(keypair, contractId) {
  const account = await server.getAccount(keypair.publicKey());
  const contract = new StellarSDK.Contract(contractId);

  const question = StellarSDK.nativeToScVal(
    "What is the best feature of Soroban?",
    { type: "string" },
  );
  const optionStrings = [
    "Smart contract composability",
    "Predictable gas fees",
    "Rust safety guarantees",
    "Stellar network speed",
  ];
  const options = StellarSDK.xdr.ScVal.scvVec(
    optionStrings.map((s) => StellarSDK.nativeToScVal(s, { type: "string" })),
  );
  const admin = new StellarSDK.Address(keypair.publicKey()).toScVal();
  const operation = contract.call("init", admin, question, options);

  const transaction = new StellarSDK.TransactionBuilder(account, {
    fee: StellarSDK.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const tx = await server.prepareTransaction(transaction);
  tx.sign(keypair);

  console.log("Submitting init transaction...");
  let response = await server.sendTransaction(tx);
  const hash = response.hash;
  console.log(`Transaction hash: ${hash}`);

  while (true) {
    response = await server.getTransaction(hash);
    if (response.status !== "NOT_FOUND") break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (response.status === "SUCCESS") {
    console.log("Poll initialized successfully.");
  } else {
    console.error("Init transaction failed:", response);
    throw new Error("Init failed");
  }
}

async function buildAndSendTransaction(keypair, account, operation) {
  const transaction = new StellarSDK.TransactionBuilder(account, {
    fee: StellarSDK.BASE_FEE,
    networkPassphrase: NETWORK_PASSPHRASE,
  })
    .addOperation(operation)
    .setTimeout(30)
    .build();

  const tx = await server.prepareTransaction(transaction);
  tx.sign(keypair);

  console.log("Submitting transaction...");
  let response = await server.sendTransaction(tx);
  const hash = response.hash;
  console.log(`Transaction hash: ${hash}`);

  while (true) {
    response = await server.getTransaction(hash);
    if (response.status !== "NOT_FOUND") break;
    await new Promise((r) => setTimeout(r, 1000));
  }

  if (response.status === "SUCCESS") {
    console.log("Transaction successful.");
    return response;
  } else {
    console.error("Transaction failed:", response);
    throw new Error("Transaction failed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
