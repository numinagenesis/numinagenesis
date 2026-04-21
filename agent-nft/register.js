require("dotenv").config();
const { ethers } = require("ethers");
const axios = require("axios");

// ── Config ────────────────────────────────────────────────────────────────────

const IDENTITY_REGISTRY = "0x8004A818BFB912233c491871b3d84c89A494BD9e";
const SEPOLIA_RPC = process.env.RPC_URL;

// Minimal ABI — only the overload we need
const IDENTITY_REGISTRY_ABI = [
  "function register(string agentURI) returns (uint256 agentId)",
  "event Transfer(address indexed from, address indexed to, uint256 indexed tokenId)",
];

const AGENT_METADATA = {
  type: "agent-registration-v1",
  metadata: {
    name: "Frontend Wizard #001",
    role: "frontend_developer",
    description: "Specialist in React, UI/UX, and web performance",
    work_count: 0,
  },
};

// ── IPFS upload via Pinata ────────────────────────────────────────────────────

async function uploadToPinata(metadata) {
  const url = "https://api.pinata.cloud/pinning/pinJSONToIPFS";

  const response = await axios.post(url, metadata, {
    headers: {
      "Content-Type": "application/json",
      pinata_api_key: process.env.PINATA_API_KEY,
      pinata_secret_api_key: process.env.PINATA_SECRET_KEY,
    },
  });

  const cid = response.data.IpfsHash;
  console.log(`✓ Uploaded to IPFS: ipfs://${cid}`);
  return `ipfs://${cid}`;
}

// ── Register agent on-chain ───────────────────────────────────────────────────

async function registerAgent() {
  // Validate env vars
  const required = ["PRIVATE_KEY", "RPC_URL", "PINATA_API_KEY", "PINATA_SECRET_KEY"];
  for (const key of required) {
    if (!process.env[key]) throw new Error(`Missing env var: ${key}`);
  }

  // Provider + signer
  const provider = new ethers.JsonRpcProvider(SEPOLIA_RPC);
  const signer = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
  console.log(`✓ Wallet: ${signer.address}`);

  // Check balance
  const balance = await provider.getBalance(signer.address);
  console.log(`✓ Balance: ${ethers.formatEther(balance)} ETH`);
  if (balance === 0n) throw new Error("Wallet has no ETH — fund it on Sepolia first.");

  // Upload metadata to IPFS
  console.log("\nUploading metadata to IPFS...");
  const agentURI = await uploadToPinata(AGENT_METADATA);

  // Call register(string agentURI)
  console.log("\nRegistering agent on Sepolia...");
  const registry = new ethers.Contract(IDENTITY_REGISTRY, IDENTITY_REGISTRY_ABI, signer);
  const tx = await registry.register(agentURI);
  console.log(`✓ Tx sent: ${tx.hash}`);
  console.log("  Waiting for confirmation...");

  const receipt = await tx.wait();

  // Extract tokenId from Transfer event (minted = from 0x0)
  const transferEvent = receipt.logs
    .map((log) => {
      try { return registry.interface.parseLog(log); } catch { return null; }
    })
    .find((e) => e?.name === "Transfer");

  if (!transferEvent) throw new Error("Transfer event not found in receipt.");
  const tokenId = transferEvent.args.tokenId.toString();

  console.log(`\n✅ Agent registered!`);
  console.log(`   Token ID : ${tokenId}`);
  console.log(`   Owner    : ${signer.address}`);
  console.log(`   URI      : ${agentURI}`);
  console.log(`   Tx       : https://sepolia.etherscan.io/tx/${tx.hash}`);

  return tokenId;
}

// ── Main ─────────────────────────────────────────────────────────────────────

registerAgent().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
