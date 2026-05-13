# NUMINA Soul Pipeline

Fetches 12 base soul files from `msitarzewski/agency-agents`, prepends the
NUMINA identity header to each one, and uploads them permanently to Arweave
via Irys. After a successful run, `soul-uris.json` contains all 12 permanent
`ar://` URIs and the GitHub dependency is no longer needed.

---

## Attribution

Soul files derived from
[msitarzewski/agency-agents](https://github.com/msitarzewski/agency-agents)
(MIT License).

NUMINA modifications and pipeline: CC0-1.0. No rights reserved.

---

## Prerequisites

- Node.js 18+
- An Ethereum wallet with ETH funded into Irys node2
- `npm install` run inside this directory

### Fund your Irys wallet

Before uploading, load ETH into the Irys node:

```bash
# Check current balance
npx ts-node -e "
  import Irys from '@irys/sdk';
  const i = new Irys({ url: 'https://node2.irys.xyz', token: 'ethereum', key: process.env.IRYS_PRIVATE_KEY });
  i.getLoadedBalance().then(b => console.log(i.utils.fromAtomic(b) + ' ETH'));
"

# Fund (amount in atomic units — 0.001 ETH example)
npx ts-node -e "
  import Irys from '@irys/sdk';
  const i = new Irys({ url: 'https://node2.irys.xyz', token: 'ethereum', key: process.env.IRYS_PRIVATE_KEY });
  i.fund(i.utils.toAtomic(0.001)).then(r => console.log(r));
"
```

See https://irys.xyz/docs/uploading/funding for more options.

---

## Setup

```bash
cd soul-pipeline
cp .env.example .env
# edit .env — set IRYS_PRIVATE_KEY
npm install
```

---

## Usage

### Step 1 — Dry run first (always)

Fetches all 12 soul files and prints the customized content + tags to the
console. No wallet needed. No Arweave upload. No cost.

```bash
npm run dry-run
```

Read the output carefully. Verify:
- All 12 divisions fetched successfully (no FETCH FAILED lines)
- Header content looks correct for each division
- Tag values are correct

Pipe to a pager for easier reading:

```bash
npm run dry-run 2>&1 | less
```

### Step 2 — Upload (permanent, costs AR)

**Upload is permanent and irreversible. Verify the dry run first.**

```bash
npm run upload
```

The script:
1. Checks your Irys loaded balance
2. Fetches each soul file from GitHub
3. Uploads to Arweave with NUMINA tags
4. Writes `soul-uris.json` after each successful upload (crash-safe)
5. Skips divisions already in `soul-uris.json` (safe to re-run)
6. Reports failures at the end

If some divisions fail, re-run `npm run upload` — already-uploaded divisions
are skipped automatically.

---

## Output

After a successful upload, `soul-uris.json` will contain:

```json
{
  "ghost":      "ar://[txid]",
  "cipher":     "ar://[txid]",
  "architect":  "ar://[txid]",
  "oracle":     "ar://[txid]",
  "analyst":    "ar://[txid]",
  "navigator":  "ar://[txid]",
  "artisan":    "ar://[txid]",
  "herald":     "ar://[txid]",
  "weaver":     "ar://[txid]",
  "catalyst":   "ar://[txid]",
  "signal":     "ar://[txid]",
  "strategist": "ar://[txid]"
}
```

These URIs are permanent. Pass them to the mint script as `soulURI` for each
division when minting NUMINA tokens via `NUMINACore.mint()`.

---

## Division → Soul file mapping

| Division     | Name            | Track       | Source file                                    |
|--------------|-----------------|-------------|------------------------------------------------|
| ghost        | THE GHOST       | COMMUNITY   | marketing/marketing-twitter-engager.md         |
| cipher       | THE CIPHER      | SECURITY    | engineering/engineering-security-engineer.md   |
| architect    | THE ARCHITECT   | ENGINEERING | engineering/engineering-software-architect.md  |
| oracle       | THE ORACLE      | RESEARCH    | product/product-manager.md                     |
| analyst      | THE ANALYST     | ANALYTICS   | support/support-analytics-reporter.md          |
| navigator    | THE NAVIGATOR   | PRODUCT     | design/design-ux-architect.md                  |
| artisan      | THE ARTISAN     | DESIGN      | design/design-visual-storyteller.md            |
| herald       | THE HERALD      | COMMUNITY   | marketing/marketing-content-creator.md         |
| weaver       | THE WEAVER      | COLLAB      | marketing/marketing-social-media-strategist.md |
| catalyst     | THE CATALYST    | GROWTH      | marketing/marketing-growth-hacker.md           |
| signal       | THE SIGNAL      | BRAND       | design/design-brand-guardian.md                |
| strategist   | THE STRATEGIST  | STRATEGY    | product/product-trend-researcher.md            |

---

## Files

```
soul-pipeline/
  upload.ts        Main upload script
  dry-run.ts       Preview without uploading
  config.ts        Shared division config + helpers
  soul-uris.json   Generated after upload (commit this)
  .env.example     Environment variable template
  .env             Your actual keys (never commit)
  package.json
  tsconfig.json
  README.md
```

---

## License

CC0-1.0. No rights reserved.
