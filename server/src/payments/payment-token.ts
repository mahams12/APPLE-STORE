import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

const DEFAULT_TTL_MS = 15 * 60 * 1000;

export function hashConfirmToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function mintConfirmToken() {
  const token = randomBytes(32).toString("base64url");
  return {
    token,
    hash: hashConfirmToken(token),
    expiresAt: new Date(Date.now() + DEFAULT_TTL_MS),
  };
}

export function tokensMatch(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}
