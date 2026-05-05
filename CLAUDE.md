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
    page.tsx               → /          landing page
    layout.tsx             → root layout (wraps <Providers>, <Nav>)
    providers.tsx          → WagmiProvider + RainbowKitProvider + QueryClientProvider
    globals.css            → global styles
    admin/
      page.tsx             → /admin     wallet-gated config panel (NOT in nav)
      cards.tsx            → 10 config cards (see Admin cards section below)
      queue/
        page.tsx           → /admin/queue  moderation queue (server component, admin-gated)
        client.tsx         → QueueClient  — interactive approve/reject card list
    forge/
      page.tsx             → /forge     persistent agent page (wallet-gated, SIWE required)
    summon/
      page.tsx             → /summon    agent preview flow (no chain writes)
    docs/
      page.tsx             → /docs      NUMINA overview / info page
    mint/
      page.tsx             → /mint      coming-soon page
    points/
      page.tsx             → /points    campaign page (server component, reads campaign_state)
      client.tsx           → PointsClient — session-aware UI (bind + submit + standing)
    leaderboard/
      page.tsx             → /leaderboard  public top-100 table (server component, no auth)
    verify/
      page.tsx             → /verify    task hash verification (Phase 2, partial)
    divisions/
      page.tsx             → /divisions  lore page
    lore/
      page.tsx             → /lore      lore page
    factory/
      page.tsx             → /factory   agent factory page
    forge/
      page.tsx             → /forge       forge hub (wallet-gated, F1+)
      swap/
        page.tsx           → /forge/swap  swap marketplace (wallet-gated, Forge F6)
    collab/
      page.tsx             → /collab      partner collab request form (public)
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

        summon/route.ts            → POST /api/forge/summon  — create/return persistent agent
        status/route.ts            → GET  /api/forge/status  — fetch agent + fragment balance + tasks_today
        train/route.ts             → POST /api/forge/train   — run task, earn fragments, enforce daily limit
        history/route.ts           → GET  /api/forge/history — last 20 training_tasks for wallet (desc)
        burn/route.ts              → POST /api/forge/burn    — burn active agent, carry 50% fragments, 24h cooldown
=======
        swap/route.ts               → GET/POST /api/forge/swap  (Forge F6 swap marketplace)
      collab/route.ts               → GET (admin, pending count) / POST (public submission)
      admin/
        collab/route.ts             → POST /api/admin/collab  approve|reject (admin only)
      raffle/route.ts               → GET /api/raffle?action=status|populate|draw (admin only)

  components/
    Nav.tsx                → sticky nav, mobile hamburger, active-link highlight
    ConnectAndSignIn.tsx   → self-contained SIWE auth widget, onSessionChange prop
    AgentCard.tsx          → agent display card (fragmentId + soulHash optional extra rows)
    TaskHistory.tsx        → forge history list + TaskModal; props: division, tier, refreshKey
    PixelAvatar.tsx        → pixel art avatar renderer
    Ticker.tsx             → scrolling ticker component

  lib/
    supabase.ts            → anon Supabase client (public reads, RLS enforced)
    supabase-admin.ts      → service-role client (admin writes only, server-side)
    supabase-forge.ts      → forge types (PreMintAgent, SoulFragment) + WL_THRESHOLD=500
    fragment-rates.ts      → FRAGMENT_RATES { RECRUIT:10, OPERATOR:25, DIRECTOR:50, NUMINA PRIME:100 }
    session.ts             → iron-session config + SessionData type (xChallenge fields added)
    session-user.ts        → requireUser() — gates user-facing API routes
    admin-auth.ts          → requireAdmin() — gates /admin API routes
    config-cache.ts        → getConfig<T>(key) with 30s in-memory TTL
    forge-config.ts        → getForgeConfig() / getSupplyConfig() — forge constants with 30s TTL + safe in-code defaults
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

Seven cards rendered in `StateC` of `/admin`:

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

---

## Points client components (`app/points/client.tsx`)

Three card-level components rendered conditionally in `PointsClient`:

- **`BindXAccountCard`** — shown when `requireXBinding: true` AND wallet has no bound X account. Two-step flow: get challenge code → tweet it → paste URL to verify.
- **`SubmitCard`** — shown when binding is satisfied (or not required). URL input + submit button.
- **`StandingCard`** — always shown when signed in. Points total, tier badge, progress bar, last 10 submissions, bound X handle.

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
- OpenRouter (LLM) — used only in /summon via /api/summon-task

**External services**
- Supabase (PostgreSQL + RLS)
- fxtwitter API — free, unauthenticated, tweet data scraping
- WalletConnect Cloud — projectId for RainbowKit modal
- OpenRouter — LLM completions for summon preview

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
OPENROUTER_API_KEY           LLM key — used in /api/summon-task only
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
bound_x_id       text  NULLABLE    Twitter/X user ID string (Stage 3.5)
bound_x_handle   text  NULLABLE    Twitter/X screen_name without @ (Stage 3.5)
bound_at         timestamptz NULLABLE  when binding was completed (Stage 3.5)
```

**`submissions`**
```
id               uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet_address   text  REFERENCES wallets(address)
tweet_url        text  UNIQUE (canonical: https://x.com/{author}/status/{id})
tweet_id         text  UNIQUE
tweet_author     text  NULLABLE
x_account_id     text  NULLABLE    Twitter/X user ID of tweet author (Stage 3.5)
tweet_text_hash  text  NULLABLE    SHA-1 of normalized tweet text (Stage 3.5)
status           text  DEFAULT 'pending'  ('pending' | 'approved' | 'rejected')
points_awarded   int   DEFAULT 0
rejection_note   text  NULLABLE
raw_data         jsonb NULLABLE  (full TweetData from fxtwitter)
created_at       timestamptz DEFAULT now()
verified_at      timestamptz NULLABLE
```

**`config`**
```
key        text  PRIMARY KEY
value      jsonb
updated_at timestamptz
```

**`x_account_activity`** (Stage 3.5)
```
x_account_id    text  PRIMARY KEY  Twitter/X user ID string
x_handle        text  NULLABLE     screen_name without @
submission_count int  DEFAULT 0    cumulative approved submissions
last_seen_at    timestamptz
```

**`collab_requests`** (Forge F7)
```
id                  uuid  PRIMARY KEY DEFAULT gen_random_uuid()
project_name        text  NOT NULL
twitter_handle      text  NOT NULL    stored without @, lowercase
wallet              text  NOT NULL    lowercase
offering            text  NOT NULL
verification_tweet  text  NOT NULL    URL of verification tweet
status              text  DEFAULT 'pending'  ('pending' | 'approved' | 'rejected')
spots_allocated     integer DEFAULT 0  max 50, enforced server-side
reviewed_by         text  NULLABLE    admin wallet address
created_at          timestamptz DEFAULT now()
resolved_at         timestamptz NULLABLE
```

**`raffle_entries`** (Forge F7)
```
id          uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet      text  NOT NULL REFERENCES wallets(address)
tickets     integer DEFAULT 1
won         boolean DEFAULT false
created_at  timestamptz DEFAULT now()
```


**`pre_mint_agents`** (Forge F1+F2+F4)
```
id           uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet       text  NOT NULL  REFERENCES wallets(address)
division     text  NOT NULL
tier         text  NOT NULL
fragment_id  text  NOT NULL  ("Fragment #XXXX")
soul_hash    text  NOT NULL  (sha256(division+tier+wallet+timestamp) hex)
is_active    bool  DEFAULT true
task_count   int   DEFAULT 0   cumulative tasks run (Forge F2)
burned_at    timestamptz NULLABLE  set when agent is burned (Forge F4)
created_at   timestamptz DEFAULT now()
```

**`soul_fragments`** (Forge F1)
```
wallet          text  PRIMARY KEY  REFERENCES wallets(address)
balance         int   DEFAULT 0
updated_at      timestamptz DEFAULT now()
```

**`training_tasks`** (Forge F2)
```
id               uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet           text  NOT NULL  REFERENCES wallets(address)
agent_id         uuid  NOT NULL  REFERENCES pre_mint_agents(id)
input            text  NOT NULL  (max 200 chars, enforced server + client)
output           text  NOT NULL
fragments_earned int   DEFAULT 0
task_hash        text  NOT NULL  (sha256(input+output) hex)
created_at       timestamptz DEFAULT now()
=======
**`swap_listings`** (Forge F6)
```
id              uuid  PRIMARY KEY DEFAULT gen_random_uuid()
offerer_wallet  text  NOT NULL REFERENCES wallets(address)
agent_id        uuid  NOT NULL REFERENCES pre_mint_agents(id)
wants_division  text  NULLABLE    division key offerer wants (null = any)
status          text  DEFAULT 'open'  ('open' | 'resolved' | 'cancelled')
matched_wallet  text  NULLABLE    wallet that accepted the swap
created_at      timestamptz DEFAULT now()
resolved_at     timestamptz NULLABLE
expires_at      timestamptz DEFAULT now() + interval '72 hours'
```

**RLS policy:** public SELECT on all tables. All writes go through
`supabaseAdmin` (service role) in server-side API routes only.

**SQL to run in Supabase before Forge F7 goes live:**
```sql
CREATE TABLE IF NOT EXISTS collab_requests (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name        text NOT NULL,
  twitter_handle      text NOT NULL,
  wallet              text NOT NULL,
  offering            text NOT NULL,
  verification_tweet  text NOT NULL,
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
```

**SQL to run in Supabase before Forge F6 goes live:**
```sql
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
```

**SQL to run in Supabase before Stage 3.5 features go live:**
```sql
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

-- Forge F1 tables
CREATE TABLE IF NOT EXISTS pre_mint_agents (
  id           uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet       text  NOT NULL  REFERENCES wallets(address),
  division     text  NOT NULL,
  tier         text  NOT NULL,
  fragment_id  text  NOT NULL,
  soul_hash    text  NOT NULL,
  is_active    bool  DEFAULT true,
  created_at   timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS soul_fragments (
  wallet      text  PRIMARY KEY  REFERENCES wallets(address),
  balance     int   DEFAULT 0,
  updated_at  timestamptz DEFAULT now()
);

-- Forge F2 — training tasks + task_count column
ALTER TABLE pre_mint_agents ADD COLUMN IF NOT EXISTS task_count int DEFAULT 0;

CREATE TABLE IF NOT EXISTS training_tasks (
  id               uuid  PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet           text  NOT NULL  REFERENCES wallets(address),
  agent_id         uuid  NOT NULL  REFERENCES pre_mint_agents(id),
  input            text  NOT NULL,
  output           text  NOT NULL,
  fragments_earned int   DEFAULT 0,
  task_hash        text  NOT NULL,
  created_at       timestamptz DEFAULT now()
);

-- Forge F4 — burn mechanic
ALTER TABLE pre_mint_agents ADD COLUMN IF NOT EXISTS burned_at timestamptz;
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
| `sybil_rules` | `{ requireXBinding, maxXAccountSubmissionsPerDay, minTweetSimilarityDistance, minAccountFollowingCount, minAccountTotalTweets, blockDefaultProfileImages }` | sybil resistance (Stage 3.5) |
| `moderation` | `{ manualReviewAboveTier: string\|null, manualReviewKeywords: string[] }` | pending queue triggers (Stage 5) |
| `forge_config` | `{ wl_guaranteed, wl_bonus, daily_task_limit, burn_carry_rate, swap_expiry_hours, max_task_input, collab_pool }` | forge runtime constants (all numeric) |
| `supply_config` | `{ supply: string, mint_price: string, chain: string }` | display values for /mint and /docs |

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
requireXBinding: false          // keeps existing users unblocked during migration
maxXAccountSubmissionsPerDay: 3
minTweetSimilarityDistance: 0.7 // 0 = identical, 1 = maximally different
minAccountFollowingCount: 0     // 0 = disabled
minAccountTotalTweets: 0        // 0 = disabled
blockDefaultProfileImages: false
```

---

## `lib/tweet-text.ts` (Stage 3.5)

```typescript
normalizeTweetText(text)    // lowercase, strip URLs + @mentions, collapse whitespace
hashTweetText(text)         // SHA-1 hex of normalized text (Node crypto)
levenshteinDistance(a, b)   // Wagner-Fischer DP, O(mn) time, O(n) space
normalizedDistance(a, b)    // 0 = identical, 1 = maximally different
                            // reject when dist < sybil_rules.minTweetSimilarityDistance
```

---

## `lib/fxtwitter.ts` — TweetData shape

```typescript
type TweetData = {
  id: string;               // Twitter user ID (string — exceeds 32-bit int)
  text: string;
  author: {
    id: string;             // Twitter user ID — used for X binding comparison
    screen_name: string;
    followers: number;
    following: number;      // used for account quality check
    statuses_count: number; // total tweets — used for account quality check
    avatar_url: string;     // "default_profile" in URL → no custom image
    account_created_at: string;
  };
  created_at: string;
  has_media: boolean;
  is_quote: boolean;
  is_reply: boolean;
  parent_id: string | null;
  mentioned_handles: string[];          // lowercase, no @, deduplicated
  _thread_continuation_count: number;   // from thread.tweets in fxtwitter response
};
```

Mention extraction merges three sources into a Set:
1. `tweet.entities.user_mentions[].screen_name`
2. `tweet.mentions[].screen_name` (alternate fxtwitter field)
3. `/@(\w{1,15})/g` regex on raw `tweet.text` — most reliable fallback

---

## `lib/session.ts` — SessionData

```typescript
interface SessionData {
  address?: string;
  nonce?: string;
  expiresAt?: number;
  xChallenge?: string;        // "NUMINA-XB-XXXXXXXX" (Stage 3.5)
  xChallengeExpires?: number; // Unix ms timestamp (Stage 3.5)
}
```

---

## DB write ordering in `submissions/create`

**Critical** — FK constraint `submissions.wallet_address → wallets.address`.

```
Step 1: supabaseAdmin.upsert(wallets, { address, last_active_at })
        ← must happen FIRST; new users have no wallet row yet
Step 2: supabaseAdmin.insert(submissions, { ..., x_account_id, tweet_text_hash })
        ← FK satisfied because wallet row is guaranteed present
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

**fxtwitter field names are unstable** — the same field may be named differently
across API response variants (e.g. `statuses` vs `tweets` vs `statuses_count` for
total tweet count; `avatar_url` vs `profile_image_url` for avatar; `joined` vs
`created_at` for account age). Always read all variants with `??` fallback chains.

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
HOME / SUMMON / DOCS / MINT / POINTS / LEADERBOARD
```

`/admin` is intentionally NOT in nav — hidden route, wallet-gated.

---

## Routes

**Exists and ships:**
```
/               landing
/forge          persistent agent (wallet-gated, SIWE, pre_mint_agents + soul_fragments)
/summon         agent preview (OpenRouter, no chain)
/docs           NUMINA info page
/mint           coming-soon
/points         campaign (STANDBY or live based on config)
/leaderboard    public top-100 wallets by points (no auth, server component)
/admin          config panel (hidden, wallet-gated)
/admin/queue    moderation queue (hidden, admin-gated, shows pending submissions)
/divisions      lore
/lore           lore
/factory        agent factory
/forge          forge hub (wallet-gated, links to swap + collab)
/forge/swap     swap marketplace (wallet-gated, Forge F6)
/collab         partner collab request form (public, no auth)
/admin/collab   collab queue review (hidden, admin-gated)
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

POST /api/forge/summon       — create persistent agent (or return existing)
GET  /api/forge/status       — fetch active agent + fragment balance + tasks_today
POST /api/forge/train        — run LLM task, earn fragments, enforce 10/day limit
GET  /api/forge/history      — last 20 training_tasks for signed-in wallet (desc)
POST /api/forge/burn         — burn active agent (is_active→false, burned_at=now), carry 50% fragments, create new agent; 24h cooldown

POST /api/summon-task
GET  /api/factory-submissions
POST /api/factory-submit

GET  /api/forge/swap         — open listings (public)
POST /api/forge/swap         — body: { action: "list"|"accept"|"cancel", ... }

GET  /api/collab             — pending count (admin only)
POST /api/collab             — submit collab request (public)
POST /api/admin/collab       — body: { action: "approve"|"reject", id, spots_allocated? }
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
| fxtwitter returns 200 but tweet is deleted | `tweet` object present but `id`/`text` null | `fetchTweet` returns `{ ok: false, error: 'unavailable' }` |
| Postgres error 23503 (FK violation) on submission insert | `submissions.wallet_address` FK requires wallet row to exist first | Always upsert wallet row **before** inserting submission (Step 1 before Step 2) |
| Mobile share URLs (`x.com/i/status/{id}`) parsed wrong | `\w+` regex captures `"i"` as author | `parse-tweet-url.ts` has `INTERNAL_SEGMENTS` set; returns `author: null`, re-resolves after fxtwitter fetch |
| Valid mention rejected with `no_mention` | fxtwitter's `entities.user_mentions` sometimes missing | Mention extraction merges 3 sources; regex on raw text is the reliable fallback |
| fxtwitter returns different field names across tweet types | API is unstable — uses `statuses`/`tweets`/`statuses_count`, `joined`/`created_at`, `avatar_url`/`profile_image_url` depending on response variant | Always use `??` fallback chains covering all known variants (see `fxtwitter.ts` `FxAuthor` type) |
| X binding challenge expired between steps | 10-min TTL on `xChallenge` in session | `/api/x-binding/verify` returns `{ error: "Challenge expired" }` with 400; client shows "GET NEW CODE" button |

---

## Build status

```
Stage 1   ✅  Foundation — Supabase, SIWE, wallet connect, /points STANDBY
Stage 2   ✅  Admin UI — wallet-gated /admin, 5 live config cards
Stage 3   ✅  Submission engine — fxtwitter validation, points, dashboard
Stage 3.5 ✅  Anti-sybil — X binding, quality checks, content similarity
Stage 4   ✅  Leaderboard — public /leaderboard, stats grid, tier breakdown, top-100 table
Stage 5   ✅  Moderation queue — /admin/queue, approve/reject, pending hold on points

Forge F1  ✅  Agent persistence — /forge, pre_mint_agents, soul_fragments, fragment meter
Forge F2  ✅  Training + fragments — /api/forge/train, training_tasks, 10/day limit, live meter
Forge F3  ✅  Save + history — /api/forge/history, TaskHistory component, deploy/history tabs, summon save
Forge F4  ✅  Burn mechanic — /api/forge/burn, BurnModal, 24h cooldown, 50% fragment carry-over
Forge F5  ✅  Leaderboard upgrade — FRAGMENTS tab (soul_fragments top 100, division/tier join, WL status badges, top-50 highlight); POINTS tab preserved; default tab = FRAGMENTS
Forge F6  ✅  Forge constants configurable from admin UI — forge_config + supply_config keys, ForgeConfigCard + SupplyConfigCard in /admin, getForgeConfig() / getSupplyConfig() helpers
=======
Forge F6  ✅  Swap marketplace — /forge/swap, open listings, accept/cancel, 72h expiry
Forge F7  ✅  Collab + raffle — /collab form, admin queue, raffle populate/draw
```

All stages targeting a single production launch (not shipped yet).
Phase 1 v1 feature-complete — ready for pre-launch review.

Last successful build: `npm run build` exits 0, no type errors.
=======
Last successful build: `npm run build` exits 0, 32 routes, no type errors.

---

## When making changes

1. Read this file first — do not re-explore what's documented here
2. State scope explicitly: "I am only modifying X, Y, Z"
3. Ask before improvising anything not in the task spec
4. Always use `supabaseAdmin` for writes, `supabase` for reads
5. Always store addresses lowercase
6. Run `npm run build` from `numina/` before committing
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

## training_tasks column names (CRITICAL)
Column is `input` NOT `task`. Always use `input` when inserting.
  wallet: text
  agent_id: uuid FK
  input: text        ← NOT "task"
  output: text
  fragments_earned: int
  task_hash: text
  created_at: timestamptz

## soul_fragments column names
  wallet: text (always lowercase)
  total_earned: int
  current_balance: int
  wl_status: text
  updated_at: timestamptz

## WALLET CASING RULE
Always lowercase wallet addresses before any DB read or write.
  const wallet = address.toLowerCase()
Never store or query mixed case wallet addresses.