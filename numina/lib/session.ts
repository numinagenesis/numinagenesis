import type { SessionOptions } from "iron-session";

export interface SessionData {
  address?: string;
  nonce?: string;
  expiresAt?: number;
  /** X account binding challenge code (e.g. "NUMINA-XB-A1B2C3D4") */
  xChallenge?: string;
  /** Unix ms timestamp when the challenge expires */
  xChallengeExpires?: number;
}

export const sessionOptions: SessionOptions = {
  password: process.env.SIWE_SECRET!,
  cookieName: "numina-session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
    httpOnly: true,
    sameSite: "lax",
  },
};
