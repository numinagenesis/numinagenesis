"use client";

import { useEffect, useRef } from "react";
import type { GeneratedToken } from "@/lib/generateToken";
import { drawToken } from "@/lib/drawToken";
import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

// ── New API: token-based canvas renderer ─────────────────────────────────────

interface TokenProps {
  token:     GeneratedToken;
  size?:     number;      // canvas intrinsic px — default 320
  animated?: boolean;     // prime ring animation
  // legacy props not allowed when token is present
  division?: never;
  className?: never;
}

// ── Legacy API: division-based placeholder (backward compat) ─────────────────
// Used by pages we cannot modify (summon/page.tsx, etc.)

interface LegacyProps {
  division:  string;
  size?:     number;
  className?: string;
  // new props not allowed in legacy mode
  token?:    never;
  animated?: never;
}

type PixelAvatarProps = TokenProps | LegacyProps;

export default function PixelAvatar(props: PixelAvatarProps) {
  if ("token" in props && props.token) {
    return <CanvasAvatar token={props.token} size={props.size ?? 320} animated={props.animated ?? false} />;
  }
  // Legacy fallback — simple coloured block, keeps old callers compiling
  const legacyProps = props as LegacyProps;
  return <LegacyAvatar division={legacyProps.division} size={legacyProps.size ?? 64} className={legacyProps.className ?? ""} />;
}

// ── Canvas avatar (new) ───────────────────────────────────────────────────────

function CanvasAvatar({
  token,
  size,
  animated,
}: {
  token: GeneratedToken;
  size: number;
  animated: boolean;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef    = useRef<number | null>(null);
  const phaseRef  = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.imageSmoothingEnabled = false;

    // Cancel any previous animation loop
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    if (animated && token.tierKey === "prime") {
      const loop = () => {
        phaseRef.current += 0.025;
        drawToken(ctx, token, size, size, phaseRef.current);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);
    } else {
      phaseRef.current = 0;
      drawToken(ctx, token, size, size, 0);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [token, size, animated]);

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      style={{
        width:          "90%",
        height:         "90%",
        imageRendering: "pixelated",
        display:        "block",
        margin:         "0 auto",
      }}
    />
  );
}

// ── Legacy placeholder (old API, backward compat) ────────────────────────────

function LegacyAvatar({
  division,
  size,
  className,
}: {
  division: string;
  size: number;
  className: string;
}) {
  const div   = DIVISIONS[division as DivisionKey];
  const color = div?.color ?? "#444444";

  return (
    <div
      className={`pixel-avatar scanlines ${className}`}
      style={{
        width:           size,
        height:          size,
        display:         "inline-flex",
        alignItems:      "center",
        justifyContent:  "center",
        background:      "#080808",
        border:          `1px solid ${color}44`,
        position:        "relative",
        flexShrink:      0,
      }}
    >
      <span style={{ color, fontSize: Math.floor(size * 0.3), lineHeight: 1 }}>◆</span>
    </div>
  );
}
