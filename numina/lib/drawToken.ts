import type { GeneratedToken } from './generateToken';
import { DIVISION_PIXELS, TIER_DATA, type DivisionPixelKey } from './divisionData';

// ── Helpers ───────────────────────────────────────────────────────────────────

function hexToRgb(hex: string): string {
  const h = hex.startsWith('#') ? hex.slice(1) : hex;
  const r = parseInt(h.slice(0, 2), 16) || 0;
  const g = parseInt(h.slice(2, 4), 16) || 0;
  const b = parseInt(h.slice(4, 6), 16) || 0;
  return `${r},${g},${b}`;
}

function gridMetrics(
  grid: string[],
  W: number,
  H: number,
): { ps: number; ox: number; oy: number } {
  const rows = grid.length;
  const cols  = grid[0]?.length ?? 20;
  const ps   = Math.floor(Math.min(W / cols, H / rows));
  const ox   = Math.floor((W - cols * ps) / 2);
  const oy   = Math.floor((H - rows * ps) / 2);
  return { ps, ox, oy };
}

// ── Core pixel renderer ───────────────────────────────────────────────────────

export function drawGrid(
  ctx: CanvasRenderingContext2D,
  grid: string[],
  W: number,
  H: number,
  palette: Record<string, string | null>,
): { ps: number; ox: number; oy: number } {
  const { ps, ox, oy } = gridMetrics(grid, W, H);

  grid.forEach((row, r) =>
    row.split("").forEach((ch, c) => {
      const col = palette[ch];
      if (!col) return;
      const x = ox + c * ps;
      const y = oy + r * ps;
      // main pixel
      ctx.fillStyle = col;
      ctx.fillRect(x, y, ps, ps);
      // scanline shadow (bottom 20% of pixel)
      ctx.fillStyle = 'rgba(0,0,0,0.22)';
      ctx.fillRect(x, y + Math.floor(ps * 0.68), ps, Math.ceil(ps * 0.18));
      // right edge depth
      ctx.fillStyle = 'rgba(0,0,0,0.18)';
      ctx.fillRect(x + ps - 1, y, 1, ps);
    }),
  );

  return { ps, ox, oy };
}

// ── Vignette ──────────────────────────────────────────────────────────────────

export function drawVignette(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
): void {
  const g = ctx.createRadialGradient(W / 2, H / 2, H * 0.25, W / 2, H / 2, H * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
}

// ── Tier backgrounds ──────────────────────────────────────────────────────────

export function drawTierBG(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  tierKey: string,
  ac: string,
): void {
  // Base
  ctx.fillStyle = '#080808';
  ctx.fillRect(0, 0, W, H);

  if (tierKey === 'recruit') return;

  if (tierKey === 'operator') {
    // Dot grid every 14px at 7% accent opacity
    ctx.fillStyle = `rgba(${hexToRgb(ac)}, 0.07)`;
    for (let x = 0; x < W; x += 14) {
      for (let y = 0; y < H; y += 14) {
        ctx.fillRect(x, y, 2, 2);
      }
    }
    return;
  }

  if (tierKey === 'director') {
    // Horizontal lines every 18px
    ctx.strokeStyle = 'rgba(255,255,255,0.07)';
    ctx.lineWidth = 1;
    for (let y = 0; y < H; y += 18) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(W, y);
      ctx.stroke();
    }
    // Vertical segments every 32px with node dots
    for (let x = 0; x < W; x += 32) {
      ctx.strokeStyle = 'rgba(255,255,255,0.05)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
      // Node dot at each grid crossing
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      for (let y = 0; y < H; y += 18) {
        ctx.fillRect(x - 1, y - 1, 3, 3);
      }
    }
    return;
  }

  if (tierKey === 'prime') {
    // Radial gradient gold center
    const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.5);
    rg.addColorStop(0, 'rgba(255,215,0,0.08)');
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.fillRect(0, 0, W, H);

    // 8 gold particle dots at edges
    const dots: [number, number][] = [
      [0.10, 0.10], [0.50, 0.05], [0.90, 0.10],
      [0.95, 0.50],
      [0.90, 0.90], [0.50, 0.95], [0.10, 0.90],
      [0.05, 0.50],
    ];
    ctx.fillStyle = 'rgba(255,215,0,0.4)';
    dots.forEach(([fx, fy]) => {
      ctx.fillRect(Math.floor(fx * W) - 1, Math.floor(fy * H) - 1, 3, 3);
    });

    // Double corner brackets (gold, 0.35 opacity)
    const bw  = Math.floor(W * 0.12);
    const bh  = Math.floor(H * 0.12);
    ctx.strokeStyle = 'rgba(255,215,0,0.35)';
    ctx.lineWidth   = 1;

    const bracket = (x1: number, y1: number, x2: number, y2: number, x3: number, y3: number) => {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.stroke();
    };

    // Outer brackets
    bracket(4,       4 + bh, 4,       4,       4 + bw, 4);       // TL
    bracket(W - 4,   4 + bh, W - 4,   4,       W-4-bw, 4);       // TR
    bracket(4,       H-4-bh, 4,       H - 4,   4 + bw, H - 4);   // BL
    bracket(W - 4,   H-4-bh, W - 4,   H - 4,   W-4-bw, H - 4);   // BR

    // Inner brackets (tighter)
    bracket(7,       7 + bh - 3, 7,       7,       7 + bw - 3, 7);
    bracket(W - 7,   7 + bh - 3, W - 7,   7,       W-7-bw+3,   7);
    bracket(7,       H-7-bh+3,   7,       H - 7,   7 + bw - 3, H - 7);
    bracket(W - 7,   H-7-bh+3,   W - 7,   H - 7,   W-7-bw+3,   H - 7);
  }
}

// ── Prime pulse ring (animated) ───────────────────────────────────────────────

export function drawPrimeRing(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  phase: number,
): void {
  const cx = W / 2;
  const cy = H / 2;
  const r  = Math.floor(W * 0.44);

  ctx.save();
  const alpha = 0.25 + Math.sin(phase) * 0.1;
  ctx.strokeStyle     = `rgba(255,215,0,${alpha.toFixed(2)})`;
  ctx.lineWidth       = 1;
  ctx.setLineDash([4, 6]);
  ctx.lineDashOffset  = -(phase * 8) % 10;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.restore();
}

// ── Glow behind figure ────────────────────────────────────────────────────────

function drawGlow(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  ac: string,
  opacity: number,
): void {
  if (opacity <= 0) return;
  const rg = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.38);
  rg.addColorStop(0, `rgba(${hexToRgb(ac)}, ${opacity})`);
  rg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = rg;
  ctx.fillRect(0, 0, W, H);
}

// ── Division-specific BG decorations ─────────────────────────────────────────

function drawDivisionBG(
  ctx: CanvasRenderingContext2D,
  W: number,
  H: number,
  divisionKey: string,
): void {
  if (divisionKey === 'navigator') {
    // Sparse static star field
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const seeds = [7, 13, 23, 37, 53, 71, 89, 97, 113, 127, 149, 167];
    seeds.forEach(s => {
      const x = (s * 37 + 11) % W;
      const y = (s * 53 + 17) % H;
      ctx.fillRect(x, y, 1, 1);
    });
  }
  // Other divisions rely purely on tier BG + figure color
}

// ── Director glitch FX ────────────────────────────────────────────────────────

function drawDirectorGlitch(
  ctx: CanvasRenderingContext2D,
  ac: string,
  metrics: { ps: number; ox: number; oy: number },
  W: number,
): void {
  const { ps, ox, oy } = metrics;
  ctx.fillStyle = `rgba(${hexToRgb(ac)}, 0.38)`;
  // Left side glitch strips
  const lx = Math.max(0, ox - ps * 2);
  ctx.fillRect(lx,          oy + ps * 3, ps, ps * 2);
  ctx.fillRect(lx + ps,     oy + ps * 7, ps, ps);
  // Right side
  const rx = Math.min(W - ps, ox + 20 * ps + ps);
  ctx.fillRect(rx,           oy + ps * 4, ps, ps * 2);
  ctx.fillRect(rx - ps,      oy + ps * 9, ps, ps);
}

// ── Master draw function ──────────────────────────────────────────────────────

export function drawToken(
  ctx: CanvasRenderingContext2D,
  token: GeneratedToken,
  W: number,
  H: number,
  phase: number = 0,   // animation phase for prime ring
): void {
  const { divisionKey, tierKey, accentColor } = token;

  const tierDef = TIER_DATA.find(t => t.key === tierKey) ?? TIER_DATA[TIER_DATA.length - 1];

  // 1. Clear + base fill
  ctx.clearRect(0, 0, W, H);

  // 2. Tier background
  drawTierBG(ctx, W, H, tierKey, accentColor);

  // 3. Subtle glow BEHIND figure
  drawGlow(ctx, W, H, accentColor, tierDef.glowOpacity);

  // 4. Division-specific BG decorations
  drawDivisionBG(ctx, W, H, divisionKey);

  // 5. THE FIGURE
  const palette: Record<string, string | null> = {
    '0': null,
    '1': '#FFFFFF',
    '2': tierDef.bodyColor,
    '4': '#222222',
    '5': accentColor,
  };

  const grid = DIVISION_PIXELS[divisionKey as DivisionPixelKey];
  let metrics = { ps: 14, ox: 0, oy: 0 };
  if (grid) {
    metrics = drawGrid(ctx, grid, W, H, palette);
  }

  // 6. Trait visual layer — accent-tinted highlights (minimal, tasteful)
  // (kept intentionally subtle — main differentiation is grid + tier + accent)

  // 7. Tier FX on top of figure
  if (tierKey === 'director' && grid) {
    drawDirectorGlitch(ctx, accentColor, metrics, W);
  }

  if (tierKey === 'prime') {
    drawPrimeRing(ctx, W, H, phase);
  }

  // 8. Vignette — always last
  drawVignette(ctx, W, H);
}
