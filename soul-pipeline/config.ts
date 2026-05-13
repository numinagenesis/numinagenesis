/**
 * Shared configuration and helpers for the NUMINA soul pipeline.
 * Used by both upload.ts and dry-run.ts.
 */
import fetch from 'node-fetch';

// ─── Division definitions ────────────────────────────────────────────────────

export interface Division {
  /** Snake-case key used as the JSON output key and log label. */
  key:   string;
  /** On-chain division name — matches NUMINACore / NUMINARendererV1. */
  name:  string;
  /** Track label injected into the soul header. */
  track: string;
  /** Path within msitarzewski/agency-agents (relative to repo root). */
  file:  string;
}

export const DIVISIONS: Division[] = [
  { key: 'ghost',      name: 'THE GHOST',      track: 'COMMUNITY',  file: 'marketing/marketing-twitter-engager.md'        },
  { key: 'cipher',     name: 'THE CIPHER',     track: 'SECURITY',   file: 'engineering/engineering-security-engineer.md'  },
  { key: 'architect',  name: 'THE ARCHITECT',  track: 'ENGINEERING',file: 'engineering/engineering-software-architect.md' },
  { key: 'oracle',     name: 'THE ORACLE',     track: 'RESEARCH',   file: 'product/product-manager.md'                    },
  { key: 'analyst',    name: 'THE ANALYST',    track: 'ANALYTICS',  file: 'support/support-analytics-reporter.md'         },
  { key: 'navigator',  name: 'THE NAVIGATOR',  track: 'PRODUCT',    file: 'design/design-ux-architect.md'                 },
  { key: 'artisan',    name: 'THE ARTISAN',    track: 'DESIGN',     file: 'design/design-visual-storyteller.md'           },
  { key: 'herald',     name: 'THE HERALD',     track: 'COMMUNITY',  file: 'marketing/marketing-content-creator.md'        },
  { key: 'weaver',     name: 'THE WEAVER',     track: 'COLLAB',     file: 'marketing/marketing-social-media-strategist.md'},
  { key: 'catalyst',   name: 'THE CATALYST',   track: 'GROWTH',     file: 'marketing/marketing-growth-hacker.md'          },
  { key: 'signal',     name: 'THE SIGNAL',     track: 'BRAND',      file: 'design/design-brand-guardian.md'               },
  { key: 'strategist', name: 'THE STRATEGIST', track: 'STRATEGY',   file: 'product/product-trend-researcher.md'           },
];

// ─── GitHub raw URL base ─────────────────────────────────────────────────────

const BASE_URL =
  'https://raw.githubusercontent.com/msitarzewski/agency-agents/main';

// ─── Arweave tags ────────────────────────────────────────────────────────────

export interface Tag { name: string; value: string; }

export function buildTags(division: Division): Tag[] {
  return [
    { name: 'Content-Type', value: 'text/markdown' },
    { name: 'App-Name',     value: 'NUMINA'         },
    { name: 'Division',     value: division.name    },
    { name: 'Track',        value: division.track   },
    { name: 'License',      value: 'CC0-1.0'        },
  ];
}

// ─── Soul construction ───────────────────────────────────────────────────────

/**
 * Build the NUMINA identity header that is prepended to every soul file.
 */
export function buildHeader(division: Division): string {
  return [
    '---',
    'NUMINA IDENTITY',
    `Agent Division: ${division.name}`,
    `Division Track: ${division.track}`,
    'License: CC0-1.0',
    '',
    'You are a NUMINA agent.',
    `Your division is ${division.name}.`,
    'Your on-chain history is your identity.',
    'Every task you complete is logged permanently',
    'on Ethereum. Every output you produce is CC0 —',
    'it belongs to the world.',
    'You do not work for a company.',
    'You work for your owner.',
    "Your owner's on-chain life shapes who you are.",
    'Prove yourself with work.',
    '---',
    '',
  ].join('\n');
}

/**
 * Fetch the base soul file from GitHub and prepend the NUMINA header.
 * Throws on HTTP error.
 */
export async function fetchAndBuildSoul(division: Division): Promise<string> {
  const url = `${BASE_URL}/${division.file}`;
  const res  = await fetch(url);
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}`);
  }
  const base = await res.text();
  return buildHeader(division) + base;
}
