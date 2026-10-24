import { Injectable, OnModuleDestroy } from "@nestjs/common";
import Redis from "ioredis";
import { logInfo, logWarn } from "../logger";

/**
 * Redis is optional. When unavailable, callers fall back to in-memory behaviour.
 * Never block store availability on Redis for non-critical cache/rate-limit paths.
 */
@Injectable()
export class RedisService implements OnModuleDestroy {
  private client: Redis | null = null;
  private ready = false;
  private memory = new Map<string, { value: string; expires: number }>();

  async connect(url: string | null) {
    if (!url) {
      logInfo("redis.disabled", { reason: "REDIS_URL not set" });
      return;
    }
    try {
      const redis = new Redis(url, {
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        lazyConnect: true,
        connectTimeout: 3000,
      });
      redis.on("error", (err) => {
        this.ready = false;
        logWarn("redis.error", { message: err.message });
      });
      await redis.connect();
      await redis.ping();
      this.client = redis;
      this.ready = true;
      logInfo("redis.connected");
    } catch (error) {
      this.client = null;
      this.ready = false;
      logWarn("redis.unavailable", {
        message: error instanceof Error ? error.message : "connect failed",
        fallback: "memory",
      });
    }
  }

  isReady() {
    return this.ready && !!this.client;
  }

  getClient() {
    return this.isReady() ? this.client : null;
  }

  async get(key: string): Promise<string | null> {
    const redis = this.getClient();
    if (redis) {
      try {
        return await redis.get(key);
      } catch {
        this.ready = false;
      }
    }
    const row = this.memory.get(key);
    if (!row) return null;
    if (row.expires < Date.now()) {
      this.memory.delete(key);
      return null;
    }
    return row.value;
  }

  async set(key: string, value: string, ttlSeconds: number) {
    const redis = this.getClient();
    if (redis) {
      try {
        await redis.set(key, value, "EX", ttlSeconds);
        return;
      } catch {
        this.ready = false;
      }
    }
    this.memory.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
  }

  async del(key: string) {
    const redis = this.getClient();
    if (redis) {
      try {
        await redis.del(key);
      } catch {
        this.ready = false;
      }
    }
    this.memory.delete(key);
  }

  async delPattern(pattern: string) {
    const redis = this.getClient();
    if (redis) {
      try {
        for await (const keys of redis.scanStream({ match: pattern, count: 100 })) {
          const batch = keys as string[];
          if (batch.length) await redis.del(...batch);
        }
      } catch {
        this.ready = false;
      }
    }
    const prefix = pattern.replace(/\*$/, "");
    for (const key of this.memory.keys()) if (key.startsWith(prefix)) this.memory.delete(key);
  }

  async incr(key: string, ttlSeconds: number): Promise<number> {
    const redis = this.getClient();
    if (redis) {
      try {
        const count = await redis.incr(key);
        if (count === 1) await redis.expire(key, ttlSeconds);
        return count;
      } catch {
        this.ready = false;
      }
    }
    const row = this.memory.get(key);
    const now = Date.now();
    if (!row || row.expires < now) {
      this.memory.set(key, { value: "1", expires: now + ttlSeconds * 1000 });
      return 1;
    }
    const next = Number(row.value) + 1;
    row.value = String(next);
    return next;
  }

  async onModuleDestroy() {
    if (this.client) {
      try {
        await this.client.quit();
      } catch {
        /* ignore */
      }
    }
  }
}
