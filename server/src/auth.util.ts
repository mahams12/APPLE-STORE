import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Response } from "express";

const WEEK = 14 * 24 * 60 * 60 * 1000;

export function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function newToken() {
  return randomBytes(32).toString("hex");
}

export function sign(value: string) {
  const secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
  return createHmac("sha256", secret).update(value).digest("hex");
}

export function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: WEEK,
  };
}

export function setCookie(res: Response, name: string, value: string) {
  res.cookie(name, value, cookieOptions());
}

export function clearCookie(res: Response, name: string) {
  res.clearCookie(name, { path: "/" });
}
