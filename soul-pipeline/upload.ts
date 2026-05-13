/**
 * NUMINA Soul Pipeline — Upload Script
 *
 * Fetches 12 base soul files from msitarzewski/agency-agents,
 * prepends the NUMINA identity header, and uploads each one
 * permanently to Arweave via Irys.
 *
 * Writes soul-pipeline/soul-uris.json on completion.
 * Skips any division that already has a URI in soul-uris.json
 * (safe to re-run after a partial failure).
 *
 * Run dry-run.ts first to verify content before spending AR.
 */
import 'dotenv/config';
import fs   from 'node:fs/promises';
import path from 'node:path';
import Irys from '@irys/sdk';

import { DIVISIONS, buildTags, fetchAndBuildSoul } from './config';

const OUT_FILE = path.join(__dirname, 'soul-uris.json');

// ─── Label helpers ───────────────────────────────────────────────────────────

const PAD = 12; // column width for division key
const label = (key: string) => `[${key.padEnd(PAD)}]`;

// ─── Main ────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  // ── Env check ──────────────────────────────────────────────────────────────
  const privateKey = process.env.IRYS_PRIVATE_KEY;
  if (!privateKey) {
    console.error('ERROR: IRYS_PRIVATE_KEY is not set.');
    console.error('  Copy .env.example to .env and fill in your private key.');
    process.exit(1);
  }

  // ── Load existing results (skip already-uploaded divisions) ────────────────
  let results: Record<string, string> = {};
  try {
    const raw = await fs.readFile(OUT_FILE, 'utf-8');
    results = JSON.parse(raw) as Record<string, string>;
    const done = Object.keys(results).length;
    if (done > 0) {
      console.log(`Resuming: ${done}/12 divisions already uploaded (loaded from soul-uris.json).`);
      console.log('');
    }
  } catch {
    // File doesn't exist yet — fresh run
  }

  // ── Irys client ────────────────────────────────────────────────────────────
  const irys = new Irys({
    url:   'https://node2.irys.xyz',
    token: 'ethereum',
    key:   privateKey,
  });

  const balance = await irys.getLoadedBalance();
  console.log(`Irys loaded balance : ${irys.utils.fromAtomic(balance)} ETH`);
  console.log('Upload is permanent — this cannot be undone.');
  console.log('');
  console.log('Starting NUMINA soul pipeline upload...');
  console.log('');

  const failed: string[] = [];

  // ── Upload loop ────────────────────────────────────────────────────────────
  for (const division of DIVISIONS) {
    // Skip already-uploaded divisions
    if (results[division.key]) {
      console.log(`${label(division.key)} SKIP (already uploaded) → ${results[division.key]}`);
      continue;
    }

    process.stdout.write(`${label(division.key)} Fetching...  `);

    // Fetch + build
    let soul: string;
    try {
      soul = await fetchAndBuildSoul(division);
      process.stdout.write(`${soul.length} chars  `);
    } catch (err) {
      console.log(`FETCH FAILED — ${(err as Error).message}`);
      failed.push(division.key);
      continue;
    }

    // Upload
    process.stdout.write('Uploading... ');
    try {
      const tags    = buildTags(division);
      const receipt = await irys.upload(soul, { tags });
      const uri     = `ar://${receipt.id}`;

      results[division.key] = uri;
      console.log(`OK → ${uri}`);

      // Persist after each successful upload (safe against crashes mid-run)
      await fs.writeFile(OUT_FILE, JSON.stringify(results, null, 2));
    } catch (err) {
      console.log(`UPLOAD FAILED — ${(err as Error).message}`);
      failed.push(division.key);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const successCount = Object.keys(results).length;
  console.log('');
  console.log('─'.repeat(60));
  console.log(`Soul pipeline complete.`);
  console.log(`  Uploaded : ${successCount}/12`);
  console.log(`  Output   : soul-uris.json`);

  if (failed.length > 0) {
    console.log('');
    console.log(`  FAILED (re-run to retry): ${failed.join(', ')}`);
    console.log('');
    console.log('Re-run `npm run upload` — already-uploaded divisions will be skipped.');
    process.exit(1);
  }

  console.log('');
  console.log('All 12 souls uploaded. GitHub dependency is no longer needed.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
