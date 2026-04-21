import { DIVISIONS, type DivisionKey } from "@/lib/divisions";

// 8×8 pixel patterns (1=primary, 2=dim, 0=transparent)
const PATTERNS: Record<string, string[]> = {
  engineering: [
    "00111100","01111110","11011011","11111111",
    "11011011","11111111","01100110","00111100",
  ],
  design: [
    "00011000","00111100","01111110","11111111",
    "11111111","01111110","00111100","00011000",
  ],
  product: [
    "01111110","11000011","10100101","10000001",
    "10100101","10011001","11000011","01111110",
  ],
  analytics: [
    "10000001","11000011","01100110","00111100",
    "00111100","01100110","11000011","10000001",
  ],
  security: [
    "00111100","01111110","11111111","11111111",
    "11011011","10111101","01000010","00111100",
  ],
  research: [
    "00011000","00111100","01111110","11011011",
    "11111111","01111110","00100100","01000010",
  ],
  community: [
    "01100110","11111111","11111111","01111110",
    "01111110","11111111","11111111","01100110",
  ],
  collab: [
    "11000011","11100111","01111110","00111100",
    "00111100","01111110","11100111","11000011",
  ],
  growth: [
    "00000001","00000011","00001111","00111111",
    "11111111","11111110","11111100","11110000",
  ],
  brand: [
    "10000001","11000011","11100111","11111111",
    "11111111","11100111","11000011","10000001",
  ],
  strategy: [
    "00010000","00110000","01110000","11111111",
    "11111111","01110000","00110000","00010000",
  ],
  alpha: [
    "00011000","00111100","01111110","11111111",
    "00011000","00011000","00011000","00011000",
  ],
};

const DEFAULT_PATTERN = [
  "00111100","01111110","11111111","11011011",
  "11011011","11111111","01111110","00111100",
];

export default function PixelAvatar({
  division, size = 64, className = ""
}: { division: string; size?: number; className?: string }) {
  const div = DIVISIONS[division as DivisionKey];
  const color   = div?.color   ?? "#FFFFFF";
  const dimClr  = div?.dimColor ?? "#333333";
  const pattern = PATTERNS[division] ?? DEFAULT_PATTERN;

  return (
    <div className={`pixel-avatar scanlines ${className}`}
         style={{ width: size, height: size, display: "inline-block", position: "relative" }}>
      <svg width={size} height={size} viewBox="0 0 8 8"
           style={{ imageRendering: "pixelated", display: "block" }}>
        {pattern.map((row, y) =>
          row.split("").map((px, x) =>
            px !== "0" ? (
              <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1}
                    fill={px === "1" ? color : dimClr} />
            ) : null
          )
        )}
      </svg>
    </div>
  );
}
