#!/usr/bin/env node
"use strict";

require("dotenv").config();
const axios = require("axios");
const sharp = require("sharp");
const fs    = require("fs");
const path  = require("path");

// ── CLI ───────────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
function getArg(name) {
  const i = args.indexOf(`--${name}`);
  return i !== -1 ? args[i + 1] : null;
}
const DIVISION = getArg("division") || "ghost";
const COUNT    = parseInt(getArg("count")  || "1",        10);
const ACCENT   = getArg("accent")          || "#7B2FFF";

// ── Prompts ───────────────────────────────────────────────────────────────────

const PROMPTS = {
  ghost: [
    "mysterious hooded figure, dark cloak, barely visible face, dark background, portrait, facing forward, dramatic lighting, monochrome, digital art",
    "phantom silhouette, featureless white mask, dark robes, deep fog, portrait, facing forward, dramatic lighting, monochrome, digital art",
    "cloaked specter, hollow eyes glowing faintly, pure darkness behind, portrait, facing forward, cinematic lighting, monochrome, digital art",
  ],
  cipher: [
    "masked tactical figure, full face mask, circuit line patterns on skin, dark background, portrait, facing forward, monochrome, dramatic lighting",
    "cyberpunk operative, sleek black visor, geometric tattoos, dark background, portrait, facing forward, monochrome, dramatic lighting",
    "faceless hacker, clean visor mask, data streams, dark background, portrait, facing forward, monochrome, neon accent, digital art",
  ],
  architect: [
    "engineer in clean lab, blueprint patterns, minimalist dark background, portrait, facing forward, monochrome, dramatic lighting",
  ],
  artisan: [
    "craftsperson at work, tools visible, dark studio, portrait, facing forward, monochrome, soft dramatic lighting",
  ],
};

// ── Palette ───────────────────────────────────────────────────────────────────
// 4 luminance levels mapped to monochrome hex values

const PALETTE = [
  { lum: 0,   hex: "#000000" },
  { lum: 51,  hex: "#333333" },
  { lum: 153, hex: "#999999" },
  { lum: 255, hex: "#FFFFFF" },
];

function nearestPalette(value) {
  return PALETTE.reduce((prev, curr) =>
    Math.abs(curr.lum - value) < Math.abs(prev.lum - value) ? curr : prev
  );
}

// ── Floyd-Steinberg dithering on luminance ────────────────────────────────────

function ditherLuminance(lum, W, H) {
  const buf = new Float32Array(lum);

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx    = y * W + x;
      const oldVal = Math.max(0, Math.min(255, buf[idx]));
      const entry  = nearestPalette(oldVal);
      buf[idx]     = entry.lum;
      const err    = oldVal - entry.lum;

      if (x + 1 < W)               buf[idx + 1]     += err * 7 / 16;
      if (y + 1 < H) {
        if (x - 1 >= 0)             buf[idx + W - 1] += err * 3 / 16;
                                    buf[idx + W]     += err * 5 / 16;
        if (x + 1 < W)             buf[idx + W + 1] += err * 1 / 16;
      }
    }
  }

  return buf;
}

// ── Image buffer → 40×40 pixel art SVG ───────────────────────────────────────

async function imageToPixelArt(imageBuffer, accentHex) {
  const W = 40, H = 40, SCALE = 10;

  const raw = await sharp(imageBuffer)
    .resize(W, H, { fit: "cover" })
    .removeAlpha()
    .raw()
    .toBuffer();

  // Compute per-pixel luminance + saturation; track most saturated pixel
  const lumArray  = new Float32Array(W * H);
  let maxSat = -1, accentIdx = 0;

  for (let i = 0; i < W * H; i++) {
    const r = raw[i * 3], g = raw[i * 3 + 1], b = raw[i * 3 + 2];
    lumArray[i] = 0.299 * r + 0.587 * g + 0.114 * b;
    const max   = Math.max(r, g, b);
    const sat   = max > 0 ? (max - Math.min(r, g, b)) / max : 0;
    if (sat > maxSat) { maxSat = sat; accentIdx = i; }
  }

  // Dither the luminance channel
  const dithered = ditherLuminance(lumArray, W, H);

  // Map each dithered value to its palette hex
  const colors = Array.from({ length: W * H }, (_, i) =>
    nearestPalette(dithered[i]).hex
  );

  // Always stamp the accent color on the most saturated (or most unique) pixel
  colors[accentIdx] = accentHex;

  // Build SVG — each pixel is a crisp 10×10 rect
  const rects = colors.map((fill, i) => {
    const x = (i % W) * SCALE;
    const y = Math.floor(i / W) * SCALE;
    return `<rect x="${x}" y="${y}" width="${SCALE}" height="${SCALE}" fill="${fill}"/>`;
  }).join("\n  ");

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     viewBox="0 0 ${W * SCALE} ${H * SCALE}"`,
    `     width="${W * SCALE}" height="${H * SCALE}"`,
    `     shape-rendering="crispEdges">`,
    `  ${rects}`,
    `</svg>`,
  ].join("\n");
}

// ── Hugging Face image fetch (with model-loading retry) ───────────────────────

async function fetchHFImage(prompt, retries = 3) {
  const key = process.env.HF_API_KEY;
  if (!key) throw new Error("HF_API_KEY is not set in .env");

  console.log(`  ↳ prompt: "${prompt.slice(0, 70)}..."`);

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await axios.post(
        "https://api-inference.huggingface.co/models/runwayml/stable-diffusion-v1-5",
        { inputs: prompt },
        {
          headers: {
            Authorization:  `Bearer ${key}`,
            "Content-Type": "application/json",
          },
          responseType: "arraybuffer",
          timeout:      90_000,
        }
      );

      // 503 = model warming up — response body is JSON with estimated_time
      const ct = res.headers["content-type"] || "";
      if (ct.includes("application/json")) {
        const body = JSON.parse(Buffer.from(res.data).toString("utf8"));
        const wait = (body.estimated_time ?? 20) * 1000;
        if (attempt < retries) {
          console.log(`  ⧗ model loading — waiting ${Math.round(wait / 1000)}s (attempt ${attempt}/${retries})...`);
          await new Promise(r => setTimeout(r, wait));
          continue;
        }
        throw new Error(`HF API: ${body.error ?? JSON.stringify(body)}`);
      }

      return Buffer.from(res.data);
    } catch (err) {
      if (attempt === retries) throw err;
      console.log(`  ⧗ request failed (${err.message}) — retrying (${attempt}/${retries})...`);
      await new Promise(r => setTimeout(r, 5_000));
    }
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function pad(n, len = 3) {
  return String(n).padStart(len, "0");
}

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const prompts = PROMPTS[DIVISION];
  if (!prompts) {
    console.error(`Unknown division "${DIVISION}". Available: ${Object.keys(PROMPTS).join(", ")}`);
    process.exit(1);
  }

  const outDir = path.join(__dirname, "output", DIVISION);
  fs.mkdirSync(outDir, { recursive: true });

  // Continue numbering from any existing SVGs
  const existing = fs.readdirSync(outDir)
    .filter(f => f.endsWith(".svg"))
    .map(f => parseInt(f.match(/(\d+)\.svg$/)?.[1] ?? "0", 10))
    .filter(n => !isNaN(n));
  const startIdx = existing.length > 0 ? Math.max(...existing) + 1 : 1;

  console.log(`\n◈ NUMINA pixel art generator`);
  console.log(`  Division : ${DIVISION.toUpperCase()}`);
  console.log(`  Count    : ${COUNT}`);
  console.log(`  Accent   : ${ACCENT}`);
  console.log(`  Output   : output/${DIVISION}/\n`);

  let succeeded = 0;

  for (let i = 0; i < COUNT; i++) {
    const idx      = startIdx + i;
    const filename = `numina-${DIVISION}-${pad(idx)}.svg`;
    const filePath = path.join(outDir, filename);

    console.log(`[${i + 1}/${COUNT}] ${filename}`);

    try {
      const prompt      = randomFrom(prompts);
      const imageBuffer = await fetchHFImage(prompt);
      const svg         = await imageToPixelArt(imageBuffer, ACCENT);

      fs.writeFileSync(filePath, svg, "utf8");
      console.log(`  ✓ saved  → ${filePath}`);
      succeeded++;
    } catch (err) {
      console.error(`  ✗ failed → ${err.message}`);
    }
  }

  console.log(`\n${succeeded}/${COUNT} generated. Done.`);
}

main();
