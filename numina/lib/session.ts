import type { SessionOptions } from "iron-session";

export interface SessionData {
  address?: string;
  nonce?: string;
  expiresAt?: number;
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
