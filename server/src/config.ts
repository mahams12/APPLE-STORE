/**
 * Production configuration validation.
 * Development may use embedded Postgres via `npm run dev`.
 * Production MUST supply an external DATABASE_URL — no silent fallback.
 */

import "dotenv/config";

export type AppConfig = {
  isProd: boolean;
  apiPort: number;
  appUrl: string;
  apiUrl: string;
  databaseUrl: string;
  sessionSecret: string;
  paymentWebhookSecret: string;
  redisUrl: string | null;
  s3: {
    endpoint: string;
    region: string;
    bucket: string;
    accessKey: string;
    secretKey: string;
    publicUrl: string;
  } | null;
  smtp: {
    host: string;
    port: number;
    user: string;
    password: string;
    from: string;
  } | null;
  paymentProvider: "hosted-stub" | "stripe" | "safepay";
  stripeSecretKey: string | null;
  stripeWebhookSecret: string | null;
  safepay: {
    clientKey: string;
    secretKey: string;
    environment: "sandbox" | "production";
  } | null;
};

function required(name: string, value: string | undefined): string {
  if (!value?.trim()) {
    throw new Error(
      `[I.STORE config] Missing required environment variable: ${name}. ` +
        `Copy server/.env.production.example and set real values before starting production.`,
    );
  }
  return value.trim();
}

export function assertProductionDatabase() {
  const isProd = process.env.NODE_ENV === "production";
  if (!isProd) return;

  if (process.env.USE_EMBEDDED_POSTGRES === "true") {
    throw new Error(
      "[I.STORE config] USE_EMBEDDED_POSTGRES=true is not allowed in production. " +
        "Use an external PostgreSQL DATABASE_URL.",
    );
  }

  if (!process.env.DATABASE_URL?.trim()) {
    throw new Error(
      "[I.STORE config] DATABASE_URL is required in production. " +
        "Embedded PostgreSQL will not start. Set DATABASE_URL to your managed Postgres connection string.",
    );
  }
}

export function loadConfig(): AppConfig {
  const isProd = process.env.NODE_ENV === "production";
  assertProductionDatabase();

  if (isProd) {
    required("SESSION_SECRET", process.env.SESSION_SECRET);
    required("PAYMENT_WEBHOOK_SECRET", process.env.PAYMENT_WEBHOOK_SECRET);
    required("APP_URL", process.env.APP_URL);
    required("API_URL", process.env.API_URL);
  }

  const s3Ready =
    Boolean(process.env.S3_ENDPOINT?.trim()) &&
    Boolean(process.env.S3_BUCKET?.trim()) &&
    Boolean(process.env.S3_ACCESS_KEY?.trim()) &&
    Boolean(process.env.S3_SECRET_KEY?.trim());

  const smtpReady =
    Boolean(process.env.SMTP_HOST?.trim()) &&
    Boolean(process.env.SMTP_FROM?.trim());

  const providerEnv = (process.env.PAYMENT_PROVIDER || "hosted-stub").toLowerCase();
  const paymentProvider: "hosted-stub" | "stripe" | "safepay" =
    providerEnv === "stripe" ? "stripe" : providerEnv === "safepay" ? "safepay" : "hosted-stub";

  if (isProd && paymentProvider === "hosted-stub") {
    // Allowed to boot API for health/admin, but card checkout must refuse (enforced in payment service).
  }

  if (isProd && paymentProvider === "stripe" && !process.env.STRIPE_SECRET_KEY?.trim()) {
    throw new Error(
      "[I.STORE config] PAYMENT_PROVIDER=stripe requires STRIPE_SECRET_KEY in production.",
    );
  }

  const safepayClientKey = process.env.SAFE_PAY_CLIENT_KEY?.trim() || null;
  const safepaySecretKey = process.env.SAFE_PAY_SECRET_KEY?.trim() || null;
  const safepayEnv = (process.env.SAFE_PAY_ENVIRONMENT || "sandbox").toLowerCase() === "production" ? "production" : "sandbox";
  if (paymentProvider === "safepay" && (!safepayClientKey || !safepaySecretKey)) {
    throw new Error(
      "[I.STORE config] PAYMENT_PROVIDER=safepay requires SAFE_PAY_CLIENT_KEY and SAFE_PAY_SECRET_KEY.",
    );
  }

  return {
    isProd,
    apiPort: Number(process.env.API_PORT) || 4000,
    appUrl: process.env.APP_URL || "http://localhost:3456",
    apiUrl: process.env.API_URL || `http://localhost:${process.env.API_PORT || 4000}`,
    databaseUrl: process.env.DATABASE_URL || "",
    sessionSecret: process.env.SESSION_SECRET || "dev-session-secret-change-me",
    paymentWebhookSecret: process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret",
    redisUrl: process.env.REDIS_URL?.trim() || null,
    s3: s3Ready
      ? {
          endpoint: process.env.S3_ENDPOINT!.trim(),
          region: process.env.S3_REGION?.trim() || "auto",
          bucket: process.env.S3_BUCKET!.trim(),
          accessKey: process.env.S3_ACCESS_KEY!.trim(),
          secretKey: process.env.S3_SECRET_KEY!.trim(),
          publicUrl: (process.env.S3_PUBLIC_URL || process.env.S3_ENDPOINT || "").replace(/\/$/, ""),
        }
      : null,
    smtp: smtpReady
      ? {
          host: process.env.SMTP_HOST!.trim(),
          port: Number(process.env.SMTP_PORT) || 587,
          user: process.env.SMTP_USER || "",
          password: process.env.SMTP_PASSWORD || "",
          from: process.env.SMTP_FROM!.trim(),
        }
      : null,
    paymentProvider,
    stripeSecretKey: process.env.STRIPE_SECRET_KEY?.trim() || null,
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET?.trim() || null,
    safepay:
      safepayClientKey && safepaySecretKey
        ? { clientKey: safepayClientKey, secretKey: safepaySecretKey, environment: safepayEnv }
        : null,
  };
}
