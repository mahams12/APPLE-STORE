import { Inject, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { RedisService } from "../redis/redis.service";
import { StorageService } from "../storage/storage.service";
import { PaymentService } from "../payments/payment.service";
import { EmailService } from "../email/email.service";
import { loadConfig } from "../config";

@Injectable()
export class HealthService {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaService,
    @Inject(RedisService) private readonly redis: RedisService,
    @Inject(StorageService) private readonly storage: StorageService,
    @Inject(PaymentService) private readonly payments: PaymentService,
    @Inject(EmailService) private readonly email: EmailService,
  ) {}

  live() {
    return { ok: true, store: "I.STORE", ts: new Date().toISOString() };
  }

  async ready() {
    const cfg = loadConfig();
    let database: "up" | "down" = "down";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      database = "up";
    } catch {
      database = "down";
    }

    const storage = await this.storage.health();
    const provider = this.payments.getProvider().name;
    const cardPayments =
      cfg.isProd && provider === "hosted-stub"
        ? "disabled"
        : provider === "stripe"
          ? cfg.stripeSecretKey
            ? "configured"
            : "missing_credentials"
          : "dev_stub";

    const checks = {
      api: "up" as const,
      database,
      redis: this.redis.isReady() ? ("up" as const) : ("degraded" as const),
      storage: storage.ok ? ("up" as const) : ("degraded" as const),
      storageMode: storage.mode,
      smtp: this.email.configured() ? ("configured" as const) : ("not_configured" as const),
      paymentProvider: provider,
      cardPayments,
    };

    const ready = database === "up";
    return {
      ok: ready,
      ready,
      checks,
      // Never expose secrets
    };
  }
}
