# NUMINA — CLAUDE.md

NUMINA is 4,444 AI agent NFTs on Ethereum. Each agent has a soul stored on
Arweave, generated at mint via quantum collapse. CC0, no traits, no rarity.
Currently in Phase 1 — audience layer + points campaign. Pre-mint, no contracts
deployed yet. This file exists so Claude Code can orient immediately on every
future task without re-exploring the codebase.

---

## Repo structure

```
agents agency/           ← repo root (contains this file)
  numina/                ← Next.js site — the production app (see below)
  agent-nft/             ← CLI scripts: generate.js, register.js, run-task.js
  agent-nft-ui/          ← DEPRECATED Next.js shell, ignore entirely
  CLAUDE.md              ← this file
```

`agent-nft/` has no server — it's standalone Node scripts that write agent
metadata and run tasks. Do NOT confuse it with the main site.

---

## Site structure (`numina/`)

```
numina/
  app/
    page.tsx               → /          landing page (CTA → /forge)
    layout.tsx             → root layout (wraps <Providers>, <Nav>)
    providers.tsx          → WagmiProvider + RainbowKitProvider + QueryClientProvider
    globals.css            → global styles
    admin/
      page.tsx             → /admin     wallet-gated config panel (NOT in nav)
      cards.tsx            → 10 config cards (see Admin cards section below)
      queue/
        page.tsx           → /admin/queue  moderation queue (server component, admin-gated)
        client.tsx         → QueueClient  — interactive approve/reject card list
      collab/
        page.tsx           → /admin/collab  collab queue (server component, admin-gated)
        client.tsx         → CollabClient  — approve/reject + WL type dropdown
    summon/
      page.tsx             → /summon    agent demo only — NOT in nav
    docs/
      page.tsx             → /docs      NUMINA overview / info page
    mint/
      page.tsx             → /mint      coming-soon page
    points/
      page.tsx             → /points    campaign page (server component, reads campaign_state)
      client.tsx           → PointsClient — session-aware UI (bind + submit + standing)
    leaderboard/
      page.tsx             → /leaderboard  fragments tab + points tab (server component)
    verify/
      page.tsx             → /verify    task hash verification (Phase 2, partial)
    divisions/
      page.tsx             → /divisions  lore page
    lore/
      page.tsx             → /lore      lore page
    factory/
      page.tsx             → /factory   agent factory page
    forge/
      page.tsx             → /forge       main agent dashboard (wallet-gated, F1+)
      swap/
        page.tsx           → /forge/swap  swap marketplace (wallet-gated, Forge F6)
    collab/
      page.tsx             → /collab      partner collab request form (public, 3 sections)
      status/
        page.tsx           → /collab/status  status check by Twitter handle (public)
    api/
      auth/
        nonce/route.ts     → GET  /api/auth/nonce        — generate SIWE nonce
        verify/route.ts    → POST /api/auth/verify       — verify signature, set session
        me/route.ts        → GET  /api/auth/me           — return session address
        logout/route.ts    → POST /api/auth/logout       — destroy session
      admin/
        config/route.ts    → GET/PATCH /api/admin/config — read/write all config keys
        whoami/route.ts    → GET  /api/admin/whoami      — { isAdmin, address }
        unbind-wallet/
          route.ts         → POST /api/admin/unbind-wallet — clear X binding (admin only)
        collab/route.ts    → POST /api/admin/collab  approve|reject + wl_type (admin only)
      submissions/
        create/route.ts    → POST /api/submissions/create — validate + record tweet
        me/route.ts        → GET  /api/submissions/me    — standing + last 10 subs
      x-binding/
        challenge/route.ts → POST /api/x-binding/challenge — generate challenge code
        verify/route.ts    → POST /api/x-binding/verify   — verify tweet, bind X account
      factory-submissions/route.ts  → factory feature (separate from points)
      factory-submit/route.ts       → factory feature
      summon-task/route.ts          → /summon LLM call via OpenRouter
      forge/
        swap/route.ts               → GET/POST /api/forge/swap  (Forge F6 swap marketplace)
      collab/
        route.ts           → GET (admin pending count) / POST (two-step: draft + verify)
        status/route.ts    → GET /api/collab/status?twitter=handle — public status lookup
      raffle/route.ts               → GET /api/raffle?action=status|populate|draw (admin only)

  components/
    Nav.tsx                → sticky nav, mobile hamburger, active-link highlight
    ConnectAndSignIn.tsx   → self-contained SIWE auth widget, onSessionChange prop
    AgentCard.tsx          → agent display card
    PixelAvatar.tsx        → pixel art avatar renderer
    Ticker.tsx             → scrolling ticker component

  lib/
    supabase.ts            → anon Supabase client (public reads, RLS enforced)
    supabase-admin.ts      → service-role client (admin writes only, server-side)
    session.ts             → iron-session config + SessionData type (xChallenge fields added)
    session-user.ts        → requireUser() — gates user-facing API routes
    admin-auth.ts          → requireAdmin() — gates /admin API routes
    config-cache.ts        → getConfig<T>(key) with 30s in-memory TTL
    parse-tweet-url.ts     → parseTweetUrl() — normalises twitter/x/mobile URLs
    fxtwitter.ts           → fetchTweet(id) via fxtwitter API, 10s timeout
    detect-thread.ts       → isThreadStarter(tweet) — thread bonus detection
    tweet-text.ts          → normalizeTweetText / hashTweetText / levenshteinDistance / normalizedDistance
    validate-submission.ts → 9-step validation pipeline (incl. sybil checks)
    tier-calc.ts           → calculateTier / nextTierFor / tierProgress
    divisions.ts           → divisions lore data

  public/                  → static assets (images, fonts)
  next.config.mjs          → webpack aliases for missing wagmi optional peers
  tailwind.config.ts
  tsconfig.json
  package.json
```

---

## Admin cards (`app/admin/cards.tsx`)

Ten cards rendered in `StateC` of `/admin`:

| # | Export | Config key | Purpose |
|---|--------|------------|---------|
| 1 | `CampaignStateCard` | `campaign_state` | Toggle campaign active/paused + status message |
| 2 | `XHandleCard` | `x_handle` | Set required mention handle |
| 3 | `EarnRatesCard` | `earn_rates` | Points per tweet type |
| 4 | `RulesCard` | `rules` | Account age, followers, char limits |
| 5 | `TiersCard` | `tiers` | Tier thresholds + rewards |
| 6 | `SybilRulesCard` | `sybil_rules` | X binding toggle + quality thresholds |
| 7 | `ModerationCard` | `moderation` | Tier threshold + keyword triggers for pending queue |
| 8 | `WalletToolsCard` | — | Admin unbind-X-account tool (no config key) |
| 9 | `CollabQueueCard` | — | Shows pending collab count + link to /admin/collab |
| 10 | `RaffleCard` | — | Populate raffle entries + draw winner |

---

## Points client components (`app/points/client.tsx`)

Three card-level components rendered conditionally in `PointsClient`:

- **`BindXAccountCard`** — shown when `requireXBinding: true` AND wallet has no bound X account. Two-step flow: get challenge code → tweet it → paste URL to verify.
- **`SubmitCard`** — shown when binding is satisfied (or not required). URL input + submit button.
- **`StandingCard`** — always shown when signed in. Points total, tier badge, progress bar, last 10 submissions, bound X handle.

---

## Collab form flow (`app/collab/page.tsx`)

Three-stage client component (no wallet required):

```
Stage "filling"   → 3 sections: 01 YOUR GROUP / 02 WHAT YOU WANT / 03 YOU
                    No Discord fields. No WL type (set by admin on approval).
                    Submit → POST /api/collab → receives { submission_id, verification_code }

Stage "verifying" → Shows readonly tweet text with code NM-xxxxxxxx
                    COPY TWEET button + OPEN TWITTER button (intent URL)
                    Partner posts tweet from group account, pastes URL
                    VERIFY & SUBMIT → POST /api/collab { submission_id, tweet_url }
                    → fxtwitter verifies author + code in text → status = "pending"

Stage "submitted" → Success card + link to /collab/status
```

Tweet text format:
```
Confirming @NUMINA collab request.
Verification: NM-xxxxxxxx
```

collab_requests.status values: `"draft"` (step 1 complete, tweet not yet verified),
`"pending"` (tweet verified, awaiting admin review), `"approved"`, `"rejected"`.
Admin queue only shows `status = "pending"` — drafts are invisible until verified.

---

## Tech stack

**Frontend**
- Next.js 14.2.5, App Router, TypeScript 5
- React 18, React DOM 18
- Tailwind CSS 3
- Wagmi 3.6.5 + viem 2.48.4 + RainbowKit 2.2.10 (wallet connection)
- @tanstack/react-query 5.100.5 (wagmi peer dep)
- SIWE 3.0.0 + iron-session 8.0.4 (auth)
- ethers 5.8.0 (SIWE peer dep for server-side verification)

**Backend**
- Next.js API routes (no separate server)
- Supabase JS 2.104.1
- OpenRouter (LLM) — forge training tasks + /summon demo

**External services**
- Supabase (PostgreSQL + RLS)
- fxtwitter API — free, unauthenticated, tweet data scraping
- WalletConnect Cloud — projectId for RainbowKit modal
- OpenRouter — LLM completions (forge training + summon preview)

---

## Environment variables

All read from `numina/.env.local`. Vercel requires these set in project settings.

**Public (exposed to browser bundle):**
```
NEXT_PUBLIC_SUPABASE_URL              Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY         Supabase anon key (RLS enforced)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  RainbowKit/WalletConnect project ID
NEXT_PUBLIC_CHAIN                     "sepolia" or "mainnet" (informational)
```

**Server-only (NEVER add NEXT_PUBLIC_ prefix):**
```
SUPABASE_SERVICE_ROLE_KEY    Bypasses RLS — used only in supabase-admin.ts
SIWE_SECRET                  Min 32-char random string — signs iron-session cookies
ADMIN_WALLET                 Lowercase Ethereum address — only wallet for /admin
OPENROUTER_API_KEY           LLM key — forge training + /api/summon-task
```

---

## Database schema (Supabase)

**`wallets`**
```
address          text  PRIMARY KEY  (always lowercase)
total_points     int   DEFAULT 0
submission_count int   DEFAULT 0
banned           bool  DEFAULT false
banned_reason    text  NULLABLE
first_seen_at    timestamptz
last_active_at   timestamptz
bound_x_id       text  NULLABLE    Twitter/X user ID string
bound_x_handle   text  NULLABLE    Twitter/X screen_name without @
bound_at         timestamptz NULLABLE
```

**`submissions`**
```
id               uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet_address   text  REFERENCES wallets(address)
tweet_url        text  UNIQUE (canonical: https://x.com/{author}/status/{id})
tweet_id         text  UNIQUE
tweet_author     text  NULLABLE
x_account_id     text  NULLABLE
tweet_text_hash  text  NULLABLE
status           text  DEFAULT 'pending'  ('pending' | 'approved' | 'rejected')
points_awarded   int   DEFAULT 0
rejection_note   text  NULLABLE
raw_data         jsonb NULLABLE
created_at       timestamptz DEFAULT now()
verified_at      timestamptz NULLABLE
```

**`config`**
```
key        text  PRIMARY KEY
value      jsonb
updated_at timestamptz
```

**`x_account_activity`**
```
x_account_id    text  PRIMARY KEY
x_handle        text  NULLABLE
submission_count int  DEFAULT 0
last_seen_at    timestamptz
```

**`pre_mint_agents`**
```
id           uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet       text  NOT NULL REFERENCES wallets(address)  (always lowercase)
division     text  NOT NULL
tier         text  NOT NULL
fragment_id  text  NULLABLE
soul_hash    text  NULLABLE
task_count   int   DEFAULT 0
is_active    bool  DEFAULT true
created_at   timestamptz DEFAULT now()
burned_at    timestamptz NULLABLE
```

**`soul_fragments`**
```
wallet           text  PRIMARY KEY  (always lowercase)
total_earned     int   DEFAULT 0
current_balance  int   DEFAULT 0    ← always use this column name exactly
wl_status        text  NULLABLE
updated_at       timestamptz DEFAULT now()
```

**`training_tasks`**
```
id               uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet           text  NOT NULL REFERENCES wallets(address)  (always lowercase)
agent_id         uuid  NOT NULL REFERENCES pre_mint_agents(id)
input            text  NOT NULL    ← column is "input" NOT "task"
output           text  NOT NULL    ← column is "output"
fragments_earned int   DEFAULT 0
task_hash        text  NULLABLE
created_at       timestamptz DEFAULT now()
```

**`swap_listings`** (Forge F6)
```
id              uuid  PRIMARY KEY DEFAULT gen_random_uuid()
offerer_wallet  text  NOT NULL REFERENCES wallets(address)
agent_id        uuid  NOT NULL REFERENCES pre_mint_agents(id)
wants_division  text  NULLABLE    division key offerer wants (null = any)
status          text  DEFAULT 'open'  ('open' | 'resolved' | 'cancelled')
matched_wallet  text  NULLABLE
created_at      timestamptz DEFAULT now()
resolved_at     timestamptz NULLABLE
expires_at      timestamptz DEFAULT now() + interval '72 hours'
```

**`collab_requests`** (Forge F7)
```
id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid()
project_name        text  NOT NULL    (legacy — mirrors group_name)
twitter_handle      text  NOT NULL    (legacy — mirrors group_twitter, no @, lowercase)
wallet              text  NOT NULL    (legacy — stores submitter_twitter handle)
offering            text  NOT NULL    (legacy — mirrors wl_type)
verification_tweet  text  NOT NULL    URL of verification tweet (empty string during draft)
status              text  DEFAULT 'pending'
                          ('draft' | 'pending' | 'approved' | 'rejected')
spots_allocated     integer DEFAULT 0  max 50
reviewed_by         text  NULLABLE    admin wallet address
created_at          timestamptz DEFAULT now()
resolved_at         timestamptz NULLABLE
group_name          text  NULLABLE
group_twitter       text  NULLABLE    no @, lowercase
wl_type             text  NULLABLE    'pending' until admin sets on approval (GTD|FCFS|BOTH)
submitter_twitter   text  NULLABLE    person submitting (no @, lowercase)
notes               text  NULLABLE
verification_code   text  NULLABLE    "NM-" + 8 hex chars, generated on draft insert
tweet_verified      bool  DEFAULT false
```

**`raffle_entries`** (Forge F7)
```
id          uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet      text  NOT NULL REFERENCES wallets(address)
tickets     integer DEFAULT 1
won         boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```

**RLS policy:** public SELECT on all tables. All writes go through
`supabaseAdmin` (service role) in server-side API routes only.

**CRITICAL — column name rules (never get these wrong):**
- `training_tasks.input` — the prompt/task column (NOT `task`, NOT `prompt`)
- `training_tasks.output` — the response column
- `soul_fragments.current_balance` — the spendable balance column
- All wallet addresses always stored and queried as lowercase

**Supabase functions (call via `supabaseAdmin.rpc()`):**
```
increment_fragments(p_wallet, p_amount)  — atomically increments soul_fragments.current_balance
                                           and total_earned for the given wallet
increment_task_count(p_wallet)           — atomically increments pre_mint_agents.task_count
                                           for the active agent of the given wallet
```

**Fragment earn rates:**
```
RECRUIT      = 10 fragments per task
OPERATOR     = 25 fragments per task
DIRECTOR     = 50 fragments per task
NUMINA PRIME = 100 fragments per task
```

**Daily limits:**
```
10 tasks per wallet per day — resets at 00:00 UTC
Burn cooldown: 24h between burns per wallet (checked via burned_at)
```

**SQL migrations — run in Supabase:**

```sql
-- Forge tables (F6 + F7)
CREATE TABLE IF NOT EXISTS swap_listings (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  offerer_wallet  text NOT NULL REFERENCES wallets(address),
  agent_id        uuid NOT NULL REFERENCES pre_mint_agents(id),
  wants_division  text,
  status          text DEFAULT 'open',
  matched_wallet  text,
  created_at      timestamptz DEFAULT now(),
  resolved_at     timestamptz,
  expires_at      timestamptz DEFAULT now() + interval '72 hours'
);

CREATE TABLE IF NOT EXISTS collab_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name        text NOT NULL,
  twitter_handle      text NOT NULL,
  wallet              text NOT NULL,
  offering            text NOT NULL,
  verification_tweet  text NOT NULL DEFAULT '',
  status              text DEFAULT 'pending',
  spots_allocated     integer DEFAULT 0,
  reviewed_by         text,
  created_at          timestamptz DEFAULT now(),
  resolved_at         timestamptz
);

CREATE TABLE IF NOT EXISTS raffle_entries (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet      text NOT NULL REFERENCES wallets(address),
  tickets     integer DEFAULT 1,
  won         boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- Collab extended columns (add after table exists)
ALTER TABLE collab_requests
  ADD COLUMN IF NOT EXISTS tweet_verified    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS wl_type           text DEFAULT 'GTD',
  ADD COLUMN IF NOT EXISTS submitter_twitter text,
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS group_name        text,
  ADD COLUMN IF NOT EXISTS group_twitter     text,
  ADD COLUMN IF NOT EXISTS verification_code text;

-- Stage 3.5 columns
ALTER TABLE wallets
  ADD COLUMN IF NOT EXISTS bound_x_id     text,
  ADD COLUMN IF NOT EXISTS bound_x_handle text,
  ADD COLUMN IF NOT EXISTS bound_at       timestamptz;

ALTER TABLE submissions
  ADD COLUMN IF NOT EXISTS x_account_id    text,
  ADD COLUMN IF NOT EXISTS tweet_text_hash text;

CREATE TABLE IF NOT EXISTS x_account_activity (
  x_account_id    text PRIMARY KEY,
  x_handle        text,
  submission_count int  DEFAULT 0,
  last_seen_at    timestamptz
);

INSERT INTO config (key, value, updated_at)
VALUES (
  'sybil_rules',
  '{"requireXBinding":false,"maxXAccountSubmissionsPerDay":3,"minTweetSimilarityDistance":0.7,"minAccountFollowingCount":0,"minAccountTotalTweets":0,"blockDefaultProfileImages":false}',
  now()
) ON CONFLICT (key) DO NOTHING;
```

---

## Config keys (Supabase `config` table)

| key            | value shape | purpose |
|----------------|-------------|---------|
| `campaign_state` | `{ active: bool, message: string }` | gates /points visibility |
| `x_handle` | `{ handle: string, mention: string }` | required mention in tweets |
| `earn_rates` | `{ basicTweet, tweetWithMedia, thread3Plus, quoteTweet, reply, likeBonus100, likeBonus1000 }` | points per type |
| `rules` | `{ minAccountAgeDays, minFollowers, minCharacters, maxTweetAgeDays, maxSubmissionsPerDay }` | per-submission anti-abuse |
| `tiers` | `Array<{ name, threshold, reward }>` sorted ascending by threshold | tier system |
| `sybil_rules` | `{ requireXBinding, maxXAccountSubmissionsPerDay, minTweetSimilarityDistance, minAccountFollowingCount, minAccountTotalTweets, blockDefaultProfileImages }` | sybil resistance |
| `moderation` | `{ manualReviewAboveTier: string\|null, manualReviewKeywords: string[] }` | pending queue triggers |

Config is read server-side via `getConfig<T>(key)` in `lib/config-cache.ts` (30s
in-memory TTL). Admin writes go through `PATCH /api/admin/config`. All seven keys
are in `ALLOWED_KEYS` in that route. `sybil_rules` has safe in-code defaults
(`SYBIL_DEFAULTS`) so missing config row never crashes validation.

---

## Auth flow

```
SIWE sign-in (ConnectAndSignIn component):
  1. User connects wallet via RainbowKit (ConnectButton)
  2. GET /api/auth/nonce  → server generates nonce, stores in session
  3. Client constructs SiweMessage, calls signMessageAsync
  4. POST /api/auth/verify { message, signature }
     → server verifies, stores session.address (lowercase)
  5. onSessionChange(address) fires on parent

Session cookie: "numina-session" (httpOnly, sameSite: lax)
Session expires: 7 days from sign-in
```

```
X account binding (Stage 3.5):
  1. POST /api/x-binding/challenge
     → generates "NUMINA-XB-XXXXXXXX" code (8 uppercase hex chars)
     → stores { xChallenge, xChallengeExpires } in iron-session (10 min TTL)
     → returns { challenge, expiresAt, instructions }
  2. User tweets the code from their X account
  3. POST /api/x-binding/verify { tweetUrl }
     → reads challenge from session, checks not expired
     → fetchTweet(tweetId) — confirms code is in tweet.text
     → checks X account ID not bound to another wallet (anon client read)
     → upserts wallet row, UPDATE SET bound_x_id, bound_x_handle, bound_at
     → clears xChallenge from session
```

**Route guards:**
- `requireUser()` — any signed-in wallet → 401 if no session
- `requireAdmin()` — session.address must match `ADMIN_WALLET` env var → 401/403

---

## Submission validation pipeline (`lib/validate-submission.ts`)

9 steps, fail-fast, returns typed `ValidationResult`:

```
1.  parseTweetUrl(url)               → invalid_url
2.  DB uniqueness check              → duplicate
3.  wallet rate limit (24h)          → rate_limit
4.  wallet ban check + fetch binding → banned
5.  fetchTweet(fxtwitter)            → fetch_failed | not_found | timeout
    ↳ re-check canonical URL if /i/ URL resolved to real author
6.  Core rules:
      account age                    → account_too_new
      follower count                 → low_followers
      tweet age                      → tweet_too_old
      character count                → too_short
6.5 X binding required gate          → x_binding_required
6.6 tweet author must match bound ID → wrong_x_account
6.7 X account daily rate limit       → x_account_rate_limit
6.8 Account quality checks:
      following count                → account_low_following
      total tweets                   → account_too_quiet
      avatar URL (default check)     → no_profile_image
6.9 Content similarity (30-day window, 50-row limit):
      SHA-1 exact hash match         → duplicate_content (fast path)
      normalized Levenshtein < dist  → duplicate_content (slow path)
7.  Mention check (3-source merge)   → self_mention_no_credit | no_mention
8.  Points calculation               → max() over applicable earn rates
9.  → { ok: true, points, tweetData, canonicalUrl, tweetId,
         tweetAuthor, validatedHandle, tweetTextHash }
```

Points use `Math.max()`, not additive. likeBonus100/likeBonus1000 skipped in v1.

**Sybil defaults** (used when `sybil_rules` config key not yet seeded):
```typescript
requireXBinding: false
maxXAccountSubmissionsPerDay: 3
minTweetSimilarityDistance: 0.7
minAccountFollowingCount: 0
minAccountTotalTweets: 0
blockDefaultProfileImages: false
```

---

## `lib/tweet-text.ts`

```typescript
normalizeTweetText(text)    // lowercase, strip URLs + @mentions, collapse whitespace
hashTweetText(text)         // SHA-1 hex of normalized text (Node crypto)
levenshteinDistance(a, b)   // Wagner-Fischer DP, O(mn) time, O(n) space
normalizedDistance(a, b)    // 0 = identical, 1 = maximally different
```

---

## `lib/fxtwitter.ts` — TweetData shape

```typescript
type TweetData = {
  id: string;
  text: string;
  author: {
    id: string;
    screen_name: string;
    followers: number;
    following: number;
    statuses_count: number;
    avatar_url: string;
    account_created_at: string;
  };
  created_at: string;
  has_media: boolean;
  is_quote: boolean;
  is_reply: boolean;
  parent_id: string | null;
  mentioned_handles: string[];
  _thread_continuation_count: number;
};
```

Mention extraction merges three sources into a Set:
1. `tweet.entities.user_mentions[].screen_name`
2. `tweet.mentions[].screen_name`
3. `/@(\w{1,15})/g` regex on raw `tweet.text` — most reliable fallback

---

## `lib/session.ts` — SessionData

```typescript
interface SessionData {
  address?: string;
  nonce?: string;
  expiresAt?: number;
  xChallenge?: string;        // "NUMINA-XB-XXXXXXXX"
  xChallengeExpires?: number; // Unix ms timestamp
}
```

---

## DB write ordering in `submissions/create`

**Critical** — FK constraint `submissions.wallet_address → wallets.address`.

```
Step 1: supabaseAdmin.upsert(wallets, { address, last_active_at })
Step 2: supabaseAdmin.insert(submissions, { ..., x_account_id, tweet_text_hash })
Step 3: read wallet totals → update { total_points, submission_count, first_seen_at? }
Step 4: supabaseAdmin.upsert(x_account_activity)  ← non-critical, failure only logged
```

If Step 1 is skipped or comes after Step 2, Postgres error 23503 (FK violation) occurs.

---

## Conventions

**Addresses:** Always stored and compared lowercase. `session.address` is lowercased
at verify time. `requireUser()` also lowercases before returning.

**DB writes:** Only via `supabaseAdmin` (service role) in API routes. Never from
client code, never using the anon client.

**Server components:** ALWAYS use `supabaseAdmin` — NEVER use the anon `supabase`
client in server components. The anon client uses browser APIs (indexedDB) that
crash on Vercel. This applies to every `page.tsx` that is not `"use client"`.

**Config reads in API routes:** Use `getConfig<T>(key)` from `lib/config-cache.ts`,
not direct Supabase calls — gives 30s caching so validation doesn't hit DB on
every field check.

**Caching on pages that read live config:**
```typescript
// Server component — both work:
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// "use client" page — only this works (revalidate = 0 causes runtime error):
export const dynamic = 'force-dynamic';
```

**Error responses from API routes:** Always `{ code: string, message: string }`.
Never plain `{ error: string }` on submission endpoints (client maps `code`).

**Canonical tweet URL:** `https://x.com/{author}/status/{id}` — always strip query
params, always use x.com host. Stored as `tweet_url` in submissions table.

**fxtwitter field names are unstable** — always use `??` fallback chains covering
all known variants (see `fxtwitter.ts` `FxAuthor` type).

---

## Workflow rule — applying Claude Code commits to main

After every Claude Code commit on a worktree branch:

```bash
git checkout claude/[branch] -- [changed files only]
git add -A
git commit -m "apply: description"
git push origin main
```

**Never use `git merge`** — causes conflicts. Cherry-pick specific files only.

---

## Styling conventions

- Pure black background (`#000000` / `#040404` cards), white mono text
- Font classes: `pixel` (pixel font), `mono` (Courier New), `text-dim` (muted)
- `numina-card bracketed` — classification-corner border treatment on cards
- `btn-amber` — primary CTA button, `btn-ghost` — secondary/outline button
- `btn-outline` — used for inactive toggles in admin cards (vs `btn-amber` active)
- `chain-border` — horizontal rule with chain styling
- `text-primary` — accent color (used on section headers)
- No emojis, no decorative SVG, no animations beyond what exists in globals.css
- Tier badges: muted tones only — BRONZE `#a87050`, SILVER `#888888`,
  GOLD `#b89040`, DIAMOND `#88aabf`. Not colored chips.
- Status badges: `● APPROVED` / `● PENDING` / `● REJECTED` with color on dot only
- Mobile: single column, full-width inputs, 44px min touch targets on buttons

---

## Nav links (public, in order)

```
HOME / DOCS / MINT / POINTS / LEADERBOARD
```

`/admin` and `/summon` are intentionally NOT in nav — hidden routes.

---

## Routes

**Exists and ships:**
```
/               landing (CTA → /forge)
/summon         agent demo only — NOT in nav
/docs           NUMINA info page
/mint           coming-soon
/points         campaign (STANDBY or live based on config)
/leaderboard    fragments tab + points tab (server component, no auth)
/admin          config panel (hidden, wallet-gated)
/admin/queue    moderation queue (hidden, admin-gated, shows pending submissions)
/admin/collab   collab queue (hidden, admin-gated, approve/reject + WL type)
/divisions      lore
/lore           lore
/factory        agent factory
/forge          main agent dashboard (wallet-gated, F1+)
/forge/swap     swap marketplace (wallet-gated, Forge F6)
/collab         partner collab request form (public, 3 sections, verification code flow)
/collab/status  status check by Twitter handle (public, no auth)
/verify         task hash verification (Phase 2, partial)
```

**API routes:**
```
GET  /api/auth/nonce
POST /api/auth/verify
GET  /api/auth/me
POST /api/auth/logout

GET  /api/admin/whoami
GET  /api/admin/config
PATCH /api/admin/config          body: { key, value }
POST /api/admin/unbind-wallet    body: { walletAddress }  (admin only)

POST /api/submissions/create     body: { tweetUrl }
GET  /api/submissions/me

POST /api/x-binding/challenge
POST /api/x-binding/verify       body: { tweetUrl }

GET  /api/admin/queue            — pending submissions list + count (admin only)
POST /api/admin/moderate         body: { id, action: "approve"|"reject", reason? }

POST /api/summon-task
GET  /api/factory-submissions
POST /api/factory-submit

GET  /api/forge/swap         — open listings (public)
POST /api/forge/swap         — body: { action: "list"|"accept"|"cancel", ... }

GET  /api/collab             — pending count (admin only)
POST /api/collab             — step 1: { group_name, group_twitter, ... } → { submission_id, verification_code }
                             — step 2: { submission_id, tweet_url } → { success }
GET  /api/collab/status      — ?twitter=handle → { status, spots_allocated, wl_type, tweet_verified, created_at }
POST /api/admin/collab       — body: { action: "approve"|"reject", id, spots_allocated?, wl_type? }
GET  /api/raffle             — ?action=status|populate|draw (admin only)
```

---

## Webpack alias fix (`next.config.mjs`)

Wagmi v3 imports optional connector packages that aren't installed. Without the
alias fix the build fails. The fix stubs them to `false`:

```js
// Aliased to false (not installed, optional deps):
"porto/internal", "@base-org/account", "@coinbase/wallet-sdk",
"@metamask/connect-evm", "@safe-global/safe-apps-sdk",
"@safe-global/safe-apps-provider", "@walletconnect/ethereum-provider",
"accounts"
```

**Do not remove this block** or add those packages — the current approach works.

---

## Gotchas

| Symptom | Cause | Fix |
|---------|-------|-----|
| `revalidate = 0` on `"use client"` page | Next.js 14 errors on `revalidate` in client components | Remove it; `force-dynamic` alone is sufficient |
| RainbowKit `"No projectId found"` at build | Empty string `""` fails WalletConnect validation even at build time | Use non-empty placeholder if real key unavailable |
| `spawn UNKNOWN` on Windows | Dev server exhausted process handles (concurrent builds) | Run builds sequentially; kill existing dev server first |
| `fallback-build-manifest.json` ENOENT in dev | Stale dev server pre-dates new build artifacts | Kill and restart `npm run dev` |
| First `npm run dev` compile takes 10–15s | RainbowKit + wagmi bundle size | Normal; subsequent compiles are instant |
| Webpack `Array buffer allocation failed` warning | Large wagmi/viem bundle in dev mode | Harmless; ignore |
| Supabase write from anon client fails silently | RLS blocks inserts from anon key | Always use `supabaseAdmin` for writes in API routes |
| indexedDB / localStorage crash on Vercel server component | Anon `supabase` client uses browser APIs — explodes in Node.js SSR | ALWAYS use `supabaseAdmin` in server components (page.tsx without "use client") |
| fxtwitter returns 200 but tweet is deleted | `tweet` object present but `id`/`text` null | `fetchTweet` returns `{ ok: false, error: 'unavailable' }` |
| Postgres error 23503 (FK violation) on submission insert | `submissions.wallet_address` FK requires wallet row to exist first | Always upsert wallet row **before** inserting submission (Step 1 before Step 2) |
| Mobile share URLs (`x.com/i/status/{id}`) parsed wrong | `\w+` regex captures `"i"` as author | `parse-tweet-url.ts` has `INTERNAL_SEGMENTS` set; returns `author: null`, re-resolves after fxtwitter fetch |
| Valid mention rejected with `no_mention` | fxtwitter's `entities.user_mentions` sometimes missing | Mention extraction merges 3 sources; regex on raw text is the reliable fallback |
| fxtwitter returns different field names across tweet types | API is unstable | Always use `??` fallback chains covering all known variants |
| X binding challenge expired between steps | 10-min TTL on `xChallenge` in session | `/api/x-binding/verify` returns 400; client shows "GET NEW CODE" button |
| Build OOM crash (exit code 134 / 3221226505) | Node heap exhausted during Next.js build | `rm -rf .next` then `NODE_OPTIONS="--max_old_space_size=3072" pnpm run build` |
| collab duplicate not caught | Old check only queried `status = "approved"` | New check: `group_twitter ILIKE handle AND status != 'rejected'` covers draft + pending |

---

## Build status

```
Stage 1   ✅  Foundation — Supabase, SIWE, wallet connect, /points STANDBY
Stage 2   ✅  Admin UI — wallet-gated /admin, config cards
Stage 3   ✅  Submission engine — fxtwitter validation, points, dashboard
Stage 3.5 ✅  Anti-sybil — X binding, quality checks, content similarity
Stage 4   ✅  Leaderboard — fragments tab + points tab
Stage 5   ✅  Moderation queue — /admin/queue, approve/reject, pending hold on points
Forge F1  ✅  Agent persistence — pre_mint_agents table, wallet-gated /forge
Forge F2  ✅  Training + fragments — OpenRouter LLM, soul_fragments, fragment rates
Forge F3  ✅  Save + history — training_tasks table, task history UI
Forge F4  ✅  Burn mechanic — 24h cooldown, burned_at, burn UI
Forge F5  ✅  Leaderboard upgrade — fragments + points tabs
Forge F6  ✅  Swap marketplace — /forge/swap, open listings, accept/cancel, 72h expiry
Forge F7  ✅  Collab + raffle — /collab form, admin queue, raffle populate/draw
          ✅  Forge constants → admin configurable
          ✅  Collab form — 3 sections, verification code + fxtwitter auto-verify
          ✅  Collab status page — /collab/status, public, Twitter handle lookup
          ✅  Admin collab queue — approve/reject + WL type dropdown (GTD|FCFS|BOTH)
          ✅  Admin raffle system — populate + draw
          ✅  All forge API routes working
          ✅  Burn cooldown persists on refresh
          ✅  Task count incrementing
          ✅  Fragment balance working
```

Phase 1 v1 feature-complete — ready for pre-launch review.
Last successful build: `npm run build` exits 0, no type errors.

---

## When making changes

1. Read this file first — do not re-explore what's documented here
2. State scope explicitly: "I am only modifying X, Y, Z"
3. Ask before improvising anything not in the task spec
4. **ALWAYS use `supabaseAdmin`** for ALL Supabase calls in server components and API routes. Never use the anon `supabase` client in server-side code.
5. Always store addresses and handles lowercase
6. Run `npm run build` from `numina/` before committing (`NODE_OPTIONS="--max_old_space_size=3072"` if OOM)
7. Update this file before committing (see Maintenance rule below)

---

## Maintenance rule

At the end of every task that changes routes, env vars, DB schema, lib helpers,
conventions, or hard-won gotchas — **UPDATE this CLAUDE.md before committing.**

Sections most likely to need updates per task type:
- New API route → add to Site structure + Routes
- New DB column or table → add to Database schema + include migration SQL
- New config key → add to Config keys table + ALLOWED_KEYS in admin/config/route.ts
- New lib file → add to lib/ section in Site structure
- New error code → add to Submission validation pipeline
- New hard rule or bug fixed → add row to Gotchas table
- Build route count changes → update "Last successful build" line
