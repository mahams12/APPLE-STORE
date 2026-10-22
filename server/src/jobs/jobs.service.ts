import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type Job } from "bullmq";
import { RedisService } from "../redis/redis.service";
import { EmailService, type EmailTemplate } from "../email/email.service";
import { logInfo, logWarn } from "../logger";

type EmailJob = { template: EmailTemplate; to: string; payload: Record<string, unknown>; idempotencyKey?: string };

@Injectable()
export class JobsService implements OnModuleDestroy {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private readonly email: EmailService;
  private readonly redis: RedisService;

  constructor(@Inject(EmailService) email: EmailService, @Inject(RedisService) redis: RedisService) {
    this.email = email;
    this.redis = redis;
  }

  async start() {
    const client = this.redis.getClient();
    if (!client) {
      logInfo("jobs.disabled", { reason: "redis unavailable" });
      return;
    }
    try {
      this.queue = new Queue("istore-jobs", {
        connection: client.duplicate(),
        defaultJobOptions: {
          attempts: 5,
          backoff: { type: "exponential", delay: 2000 },
          removeOnComplete: 1000,
          removeOnFail: 5000,
        },
      });
      this.worker = new Worker(
        "istore-jobs",
        async (job: Job) => {
          if (job.name === "email") {
            const data = job.data as EmailJob;
            await this.email.send(data.template, data.to, data.payload || {});
          }
        },
        { connection: client.duplicate() },
      );
      this.worker.on("failed", (job, err) => {
        logWarn("jobs.failed", { name: job?.name, message: err.message });
      });
      logInfo("jobs.started");
    } catch (error) {
      logWarn("jobs.start_failed", { message: error instanceof Error ? error.message : "failed" });
      this.queue = null;
      this.worker = null;
    }
  }

  async enqueueEmail(template: EmailTemplate, to: string, payload: Record<string, unknown> = {}, idempotencyKey?: string) {
    if (this.queue) {
      try {
        await this.queue.add(
          "email",
          { template, to, payload, idempotencyKey },
          idempotencyKey ? { jobId: `email:${idempotencyKey}` } : undefined,
        );
        return;
      } catch (error) {
        logWarn("jobs.enqueue_failed", { message: error instanceof Error ? error.message : "enqueue failed" });
      }
    }
    // Graceful degrade: send/log inline so checkout is not blocked on Redis.
    await this.email.send(template, to, payload);
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }
}
