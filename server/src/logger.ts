type LogLevel = "info" | "warn" | "error";

const SENSITIVE = /(password|secret|token|authorization|card|cvv|cookie)/i;

function scrub(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(scrub);
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
      out[key] = SENSITIVE.test(key) ? "[redacted]" : scrub(entry);
    }
    return out;
  }
  return value;
}

export function log(level: LogLevel, event: string, data: Record<string, unknown> = {}) {
  const line = JSON.stringify({
    level,
    service: "istore-api",
    event,
    ts: new Date().toISOString(),
    env: process.env.NODE_ENV || "development",
    ...((scrub(data) as Record<string, unknown>) || {}),
  });
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);
}

export function logInfo(event: string, data?: Record<string, unknown>) {
  log("info", event, data);
}

export function logWarn(event: string, data?: Record<string, unknown>) {
  log("warn", event, data);
}

export function logError(event: string, data?: Record<string, unknown>) {
  log("error", event, data);
}
