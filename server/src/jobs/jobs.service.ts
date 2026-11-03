import { Inject, Injectable, OnModuleDestroy } from "@nestjs/common";
import { Queue, Worker, type Job } from "bullmq";
import { RedisService } from "../redis/redis.service";
import { EmailService, type EmailTemplate } from "../email/email.service";
import { PrismaService } from "../prisma.service";
import { logInfo, logWarn } from "../logger";

const STALE_CARD_ORDER_MINUTES = 30;

type EmailJob = { template: EmailTemplate; to: string; payload: Record<string, unknown>; idempotencyKey?: string };

@Injectable()
export class JobsService implements OnModuleDestroy {
  private queue: Queue | null = null;
  private worker: Worker | null = null;
  private readonly email: EmailService;
  private readonly redis: RedisService;
  private readonly prisma: PrismaService;

  constructor(@Inject(EmailService) email: EmailService, @Inject(RedisService) redis: RedisService, @Inject(PrismaService) prisma: PrismaService) {
    this.email = email;
    this.redis = redis;
    this.prisma = prisma;
  }

  async start() {
    const client = this.redis.getClient();
    if (!client) {
      logInfo("jobs.disabled", { reason: "redis unavailable" });
      return;
    }
    try {
      this.queue = new Queue("istore-jobs", {
        connection: client.duplicate({ maxRetriesPerRequest: null }),
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
          } else if (job.name === "release-stale-orders") {
            await this.releaseStaleCardOrders();
          }
        },
        { connection: client.duplicate({ maxRetriesPerRequest: null }) },
      );
      this.worker.on("failed", (job, err) => {
        logWarn("jobs.failed", { name: job?.name, message: err.message });
      });
      await this.queue.upsertJobScheduler("release-stale-orders", { every: 5 * 60_000 }, { name: "release-stale-orders" }).catch(() => undefined);
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
          idempotencyKey ? { jobId: `email-${idempotencyKey}` } : undefined,
        );
        return;
      } catch (error) {
        logWarn("jobs.enqueue_failed", { message: error instanceof Error ? error.message : "enqueue failed" });
      }
    }
    // Graceful degrade: send/log inline so checkout is not blocked on Redis.
    await this.email.send(template, to, payload);
  }

  /** Card orders abandoned before payment keep stock reserved; cancel them and release it. */
  private async releaseStaleCardOrders() {
    const cutoff = new Date(Date.now() - STALE_CARD_ORDER_MINUTES * 60_000);
    const stale = await this.prisma.order.findMany({
      where: { status: "PENDING", createdAt: { lt: cutoff }, payment: { is: { provider: "card", status: "PENDING" } } },
      select: { id: true, number: true, payment: { select: { id: true } }, items: { select: { variantId: true, qty: true } } },
    });
    for (const order of stale) {
      await this.prisma.$transaction(async (tx) => {
        const cancelled = await tx.order.updateMany({ where: { id: order.id, status: "PENDING" }, data: { status: "CANCELLED" } });
        if (cancelled.count === 0) return;
        if (order.payment) await tx.payment.update({ where: { id: order.payment.id }, data: { status: "FAILED" } });
        for (const item of order.items) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { reserved: { decrement: item.qty } } });
          await tx.inventoryTransaction.create({ data: { variantId: item.variantId, delta: 0, reason: "RELEASE", orderId: order.id, note: "Unpaid card order expired" } });
        }
      });
      logInfo("jobs.stale_order_cancelled", { order: order.number });
    }
  }

  async onModuleDestroy() {
    await this.worker?.close().catch(() => undefined);
    await this.queue?.close().catch(() => undefined);
  }
}
