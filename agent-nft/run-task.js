require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

// ── Config ────────────────────────────────────────────────────────────────────

const TOKEN_ID = 3444;
const REPUTATION_REGISTRY = "0x8004B663056A597Dffe9eCcC1965A193B7388713";
const PERSONA_URL =
  "https://raw.githubusercontent.com/msitarzewski/agency-agents/main/engineering/engineering-frontend-developer.md";

// giveFeedback is the on-chain work log — no logWork function exists on ERC-8004
const REPUTATION_REGISTRY_ABI = [
  `function giveFeedback(
    uint256 agentId,
    int128 value,
    uint8 valueDecimals,
    string tag1,
    string tag2,
    string endpoint,
    string feedbackURI,
    bytes32 feedbackHash
  )`,
  `event NewFeedback(
    uint256 indexed agentId,
    address indexed clientAddress,
    uint64 feedbackIndex,
    int128 value,
    uint8 valueDecimals,
    string indexedTag1,
    string tag1,
    string tag2,
    string endpoint,
    string feedbackURI,
    bytes32 feedbackHash
  )`,
];

// ── Fetch persona ─────────────────────────────────────────────────────────────

async function fetchPersona() {
  const res = await axios.get(PERSONA_URL);
  return res.data;
}

// ── Run task via Claude ───────────────────────────────────────────────────────

async function runTask(persona, task) {
  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
      "HTTP-Referer": "http://localhost",
      "X-Title": "Agent NFT Runner",
    },
    body: JSON.stringify({
      model: "openrouter/auto",
      messages: [
        { role: "system", content: persona },
        { role: "user", content: task },
      ],
    }),
  });

  const data = await res.json();
  console.log("OpenRouter raw response:", JSON.stringify(data, null, 2));
  if (!data.choices || !data.choices[0]) {
    throw new Error(`OpenRouter returned no choices: ${JSON.stringify(data)}`);
  }
  return data.choices[0].message.content;
}

// ── Log work on-chain ─────────────────────────────────────────────────────────

async function logWorkOnChain(output, task) {
  const provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);

  // Hash the output
  const outputHash = ethers.keccak256(ethers.toUtf8Bytes(output));

  const registry = new ethers.Contract(
    REPUTATION_REGISTRY,
    REPUTATION_REGISTRY_ABI,
    signer
  );

  const tx = await registry.giveFeedback(
    TOKEN_ID,
    100,                          // value: 100 = task completed
    0,                            // valueDecimals
    "frontend_developer",         // tag1: agent role
    task.slice(0, 64),            // tag2: task description (truncated to 64 chars)
    "",                           // endpoint: none
    "",                           // feedbackURI: no IPFS upload of result
    outputHash                    // feedbackHash: keccak256 of Claude's output
  );

  console.log(`✓ Tx sent: ${tx.hash}`);
  const receipt = await tx.wait();

  // Extract feedbackIndex from NewFeedback event
  const event = receipt.logs
    .map((log) => {
      try { return registry.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e?.name === "NewFeedback");

  return {
    txHash: tx.hash,
    feedbackIndex: event ? event.args.feedbackIndex.toString() : "unknown",
    outputHash,
  };
}

// ── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const task = process.argv[2];
  if (!task) {
    console.error('Usage: node run-task.js "your task here"');
    process.exit(1);
  }

  const required = ["PRIVATE_KEY", "RPC_URL", "OPENROUTER_API_KEY"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
  }

  console.log(`\nTask: ${task}`);
  console.log(`Agent: Frontend Wizard #001 (Token ID ${TOKEN_ID})\n`);

  // 1. Load persona
  process.stdout.write("Loading persona... ");
  const persona = await fetchPersona();
  console.log("done");

  // 2. Run task
  console.log("Running task via Claude...\n");
  const output = await runTask(persona, task);

  console.log("─".repeat(60));
  console.log(output);
  console.log("─".repeat(60));

  // 3. Log on-chain
  console.log("\nLogging work on Sepolia...");
  const { txHash, feedbackIndex, outputHash } = await logWorkOnChain(output, task);

  console.log(`\n✅ Work logged!`);
  console.log(`   Token ID       : ${TOKEN_ID}`);
  console.log(`   Feedback Index : ${feedbackIndex}`);
  console.log(`   Output Hash    : ${outputHash}`);
  console.log(`   Tx             : https://sepolia.etherscan.io/tx/${txHash}`);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
