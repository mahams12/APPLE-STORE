import { spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import EmbeddedPostgres from "embedded-postgres";

async function main() {
  const databaseDir = path.join(process.cwd(), ".pgdata");
  const fresh = !existsSync(path.join(databaseDir, "PG_VERSION"));
  const pg = new EmbeddedPostgres({
    databaseDir,
    user: "istore",
    password: "istore",
    port: 5433,
    persistent: true,
  });
  if (fresh) await pg.initialise();
  await pg.start();
  if (fresh) {
    try {
      await pg.createDatabase("istore");
    } catch (error) {
      console.log(error instanceof Error ? error.message : error);
    }
  }
  process.env.DATABASE_URL = "postgresql://istore:istore@127.0.0.1:5433/istore?schema=public";
  process.env.SESSION_SECRET ||= "dev-session-secret-change-me";
  process.env.PAYMENT_WEBHOOK_SECRET ||= "dev-webhook-secret";
  process.env.APP_URL ||= "http://localhost:3456";
  process.env.API_PORT ||= "4000";
  const managed = new Set([
    "DATABASE_URL", "REDIS_URL", "API_PORT", "SESSION_SECRET",
    "PAYMENT_WEBHOOK_SECRET", "APP_URL", "USE_EMBEDDED_POSTGRES",
  ]);
  const extraEnv = existsSync(path.join(process.cwd(), ".env"))
    ? (await import("node:fs")).readFileSync(path.join(process.cwd(), ".env"), "utf8")
        .split("\n")
        .filter((line) => line.includes("=") && !managed.has(line.split("=")[0].trim()))
    : [];
  writeFileSync(
    path.join(process.cwd(), ".env"),
    [
      `DATABASE_URL=${process.env.DATABASE_URL}`,
      "REDIS_URL=redis://127.0.0.1:6379",
      `API_PORT=${process.env.API_PORT}`,
      `SESSION_SECRET=${process.env.SESSION_SECRET}`,
      `PAYMENT_WEBHOOK_SECRET=${process.env.PAYMENT_WEBHOOK_SECRET}`,
      `APP_URL=${process.env.APP_URL}`,
      "USE_EMBEDDED_POSTGRES=true",
      ...extraEnv,
      "",
    ].join("\n"),
  );
  const push = spawnSync("npx", ["prisma", "db", "push", "--skip-generate"], { stdio: "inherit", env: process.env });
  if (push.status !== 0) process.exit(push.status ?? 1);
  const seed = spawnSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit", env: process.env });
  if (seed.status !== 0) process.exit(seed.status ?? 1);
  const { startServer } = await import("./main");
  await startServer();
  const shutdown = async () => {
    await pg.stop();
    process.exit(0);
  };
  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
