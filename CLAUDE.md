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
      cards.tsx            → 5 config cards: CampaignState, XHandle, EarnRates, Rules, Tiers
    summon/
      page.tsx             → /summon    agent preview flow (no chain writes)
    docs/
      page.tsx             → /docs      NUMINA overview / info page
    mint/
      page.tsx             → /mint      coming-soon page
    points/
      page.tsx             → /points    campaign page (server component, reads campaign_state)
      client.tsx           → PointsClient — session-aware UI (submit + standing)
    verify/
      page.tsx             → /verify    task hash verification (Phase 2, partial)
    divisions/
      page.tsx             → /divisions  lore page
    lore/
      page.tsx             → /lore      lore page
    factory/
      page.tsx             → /factory   agent factory page
    api/
      auth/
        nonce/route.ts     → GET  /api/auth/nonce    — generate SIWE nonce
        verify/route.ts    → POST /api/auth/verify   — verify signature, set session
        me/route.ts        → GET  /api/auth/me       — return session address
        logout/route.ts    → POST /api/auth/logout   — destroy session
      admin/
        config/route.ts    → GET/PATCH /api/admin/config  — read/write all config keys
        whoami/route.ts    → GET  /api/admin/whoami  — { isAdmin, address }
      submissions/
        create/route.ts    → POST /api/submissions/create — validate + record tweet
        me/route.ts        → GET  /api/submissions/me     — standing + last 10 subs
      factory-submissions/route.ts  → factory feature (separate from points)
      factory-submit/route.ts       → factory feature
      summon-task/route.ts          → /summon LLM call via OpenRouter

  components/
    Nav.tsx                → sticky nav, mobile hamburger, active-link highlight
    ConnectAndSignIn.tsx   → self-contained SIWE auth widget, onSessionChange prop
    AgentCard.tsx          → agent display card
    PixelAvatar.tsx        → pixel art avatar renderer
    Ticker.tsx             → scrolling ticker component

  lib/
    supabase.ts            → anon Supabase client (public reads, RLS enforced)
    supabase-admin.ts      → service-role client (admin writes only, server-side)
    session.ts             → iron-session config (cookie name, password, options)
    session-user.ts        → requireUser() — gates user-facing API routes
    admin-auth.ts          → requireAdmin() — gates /admin API routes
    config-cache.ts        → getConfig<T>(key) with 30s in-memory TTL
    parse-tweet-url.ts     → parseTweetUrl() — normalises twitter/x/mobile URLs
    fxtwitter.ts           → fetchTweet(id) via fxtwitter API, 10s timeout
    detect-thread.ts       → isThreadStarter(tweet) — thread bonus detection
    validate-submission.ts → 8-step validation pipeline
    tier-calc.ts           → calculateTier / nextTierFor / tierProgress
    divisions.ts           → divisions lore data

  public/                  → static assets (images, fonts)
  next.config.mjs          → webpack aliases for missing wagmi optional peers
  tailwind.config.ts
  tsconfig.json
  package.json
```

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
NEXT_PUBLIC_SUPABASE_URL           Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY      Supabase anon key (RLS enforced)
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID  RainbowKit/WalletConnect project ID
NEXT_PUBLIC_CHAIN                  "sepolia" or "mainnet" (informational)
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
```

**`submissions`**
```
id               uuid  PRIMARY KEY DEFAULT gen_random_uuid()
wallet_address   text  REFERENCES wallets(address)
tweet_url        text  UNIQUE (canonical: https://x.com/{author}/status/{id})
tweet_id         text  UNIQUE
tweet_author     text  NULLABLE
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

**RLS policy:** public SELECT on all 3 tables. All writes go through
`supabaseAdmin` (service role) in server-side API routes only.

---

## Config keys (Supabase `config` table)

| key              | value shape                                               | purpose                         |
|------------------|-----------------------------------------------------------|---------------------------------|
| `campaign_state` | `{ active: bool, message: string }`                       | gates /points visibility        |
| `x_handle`       | `{ handle: string, mention: string }`                     | required mention in tweets      |
| `earn_rates`     | `{ basicTweet, tweetWithMedia, thread3Plus, quoteTweet, reply, likeBonus100, likeBonus1000 }` | points per type |
| `rules`          | `{ minAccountAgeDays, minFollowers, minCharacters, maxTweetAgeDays, maxSubmissionsPerDay }` | anti-abuse |
| `tiers`          | `Array<{ name, threshold, reward }>` sorted by threshold  | tier system                     |

Config is read server-side via `getConfig()` in `lib/config-cache.ts` (30s
in-memory TTL). Admin writes go through `PATCH /api/admin/config`.

---

## Auth flow

```
ConnectAndSignIn:
  1. User connects wallet via RainbowKit (ConnectButton)
  2. GET /api/auth/nonce  → server generates nonce, stores in session
  3. Client constructs SiweMessage, calls signMessageAsync
  4. POST /api/auth/verify { message, signature }
     → server verifies, stores session.address (lowercase)
  5. onSessionChange(address) fires on parent

Session cookie: "numina-session" (httpOnly, sameSite: lax)
Session expires: 7 days from sign-in
```

**Route guards:**
- `requireUser()` — any signed-in wallet → 401 if no session
- `requireAdmin()` — session.address must match `ADMIN_WALLET` env var → 401/403

---

## Submission validation pipeline (`lib/validate-submission.ts`)

8 steps, fail-fast, returns typed result:

```
1. parseTweetUrl(url)          → invalid_url
2. DB uniqueness check         → duplicate
3. wallet rate limit (24h)     → rate_limit
4. wallet ban check            → banned
5. fetchTweet(fxtwitter)       → fetch_failed | not_found | timeout
6. rule validation             → account_too_new | low_followers |
                                  tweet_too_old | too_short | no_mention
7. points calculation          → max() over applicable earn rates
8. → { ok: true, points, tweetData, canonicalUrl, ... }
```

Points use `Math.max()`, not additive. likeBonus100/likeBonus1000 skipped in v1.

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
```
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

---

## Styling conventions

- Pure black background (`#000000` / `#040404` cards), white mono text
- Font classes: `pixel` (pixel font), `mono` (Courier New), `text-dim` (muted)
- `numina-card bracketed` — classification-corner border treatment on cards
- `btn-amber` — primary CTA button, `btn-ghost` — secondary/outline button
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
HOME / SUMMON / DOCS / MINT / POINTS
```

`/admin` is intentionally NOT in nav — hidden route, wallet-gated.

---

## Routes

**Exists and ships:**
```
/               landing
/summon         agent preview (OpenRouter, no chain)
/docs           NUMINA info page
/mint           coming-soon
/points         campaign (STANDBY or live based on config)
/admin          config panel (hidden, wallet-gated)
/divisions      lore
/lore           lore
/factory        agent factory
/verify         task hash verification (Phase 2, partial)
```

**PLANNED — not yet built:**
```
/leaderboard    Stage 4 — public top 100 by total_points
/admin/queue    Stage 5 — moderation queue for pending submissions
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
| `revalidate = 0` on `"use client"` page | Next.js 14 ignores / errors on `revalidate` in client components | Remove it; `force-dynamic` alone is sufficient |
| RainbowKit `"No projectId found"` at build | Empty string `""` fails WalletConnect validation even at build time | Use non-empty placeholder if real key unavailable |
| `spawn UNKNOWN` on Windows | Dev server exhausted process handles (concurrent builds) | Run builds sequentially; kill existing dev server first |
| `fallback-build-manifest.json` ENOENT in dev | Stale dev server pre-dates new build artifacts | Kill and restart `npm run dev` |
| First `npm run dev` compile takes 10–15s | RainbowKit + wagmi bundle size | Normal; subsequent compiles are instant |
| Webpack `Array buffer allocation failed` warning | Large wagmi/viem bundle in dev mode | Harmless; ignore |
| Supabase write from anon client fails silently | RLS blocks inserts from anon key | Always use `supabaseAdmin` for writes in API routes |
| fxtwitter returns 200 but tweet is deleted | `tweet` object present but `id`/`text` null | `fetchTweet` returns `{ ok: false, error: 'unavailable' }` |

---

## Build status

```
Stage 1 ✅  Foundation — Supabase, SIWE, wallet connect, /points STANDBY
Stage 2 ✅  Admin UI — wallet-gated /admin, 5 live config cards
Stage 3 ✅  Submission engine — fxtwitter validation, points, dashboard
Stage 4 ⏳  Leaderboard (public top 100)
Stage 5 ⏳  Moderation queue (/admin/queue for pending submissions)
```

All stages targeting a single production launch (not shipped yet).
Last successful build: `npm run build` exits 0, 24 routes, no type errors.

---

## When making changes

1. Read this file first — do not re-explore what's documented here
2. State scope explicitly: "I am only modifying X, Y, Z"
3. Ask before improvising anything not in the task spec
4. Always use `supabaseAdmin` for writes, `supabase` for reads
5. Always store addresses lowercase
6. Run `npm run build` from `numina/` before committing
7. Update this file if you add routes, env vars, conventions, or hit new gotchas
