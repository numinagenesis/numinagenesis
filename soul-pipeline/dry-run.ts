/**
 * NUMINA Soul Pipeline — Dry Run
 *
 * Fetches all 12 soul files and prints the customized content + tags
 * to the console. No wallet required. No Arweave upload. No cost.
 *
 * Run this first to verify content before executing upload.ts.
 *
 * Usage:
 *   npm run dry-run
 *   npm run dry-run 2>&1 | less    (pipe to pager for long output)
 */
import { DIVISIONS, buildTags, fetchAndBuildSoul } from './config';

const DIVIDER = '═'.repeat(72);
const SUB     = '─'.repeat(72);

async function main(): Promise<void> {
  console.log(DIVIDER);
  console.log('NUMINA SOUL PIPELINE — DRY RUN');
  console.log('No uploads will occur. No wallet needed.');
  console.log(DIVIDER);
  console.log('');

  const failed: string[] = [];

  for (let i = 0; i < DIVISIONS.length; i++) {
    const division = DIVISIONS[i];

    console.log(`${i + 1}/12  ${division.key.toUpperCase().padEnd(12)} ${division.name}`);
    console.log(SUB);

    // Fetch + build soul
    let soul: string;
    try {
      soul = await fetchAndBuildSoul(division);
    } catch (err) {
      console.log(`FETCH FAILED — ${(err as Error).message}`);
      console.log('');
      failed.push(division.key);
      continue;
    }

    // Print tags
    const tags = buildTags(division);
    console.log('Tags:');
    for (const tag of tags) {
      console.log(`  ${tag.name.padEnd(14)} ${tag.value}`);
    }
    console.log(`  ${'Bytes'.padEnd(14)} ${Buffer.byteLength(soul, 'utf-8')}`);
    console.log('');

    // Print full soul content
    console.log('Content:');
    console.log(SUB);
    console.log(soul);
    console.log(SUB);
    console.log('');
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(DIVIDER);
  if (failed.length === 0) {
    console.log(`Dry run complete. All 12 souls fetched and previewed successfully.`);
    console.log('');
    console.log('Content looks good? Run `npm run upload` to publish permanently to Arweave.');
    console.log('Upload is permanent and costs AR. Fund your wallet before running.');
  } else {
    console.log(`Dry run complete with ${failed.length} failure(s): ${failed.join(', ')}`);
    console.log('Fix fetch errors before uploading.');
  }
  console.log(DIVIDER);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
