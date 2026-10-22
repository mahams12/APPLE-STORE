import { Module } from "@nestjs/common";
import { ApiController } from "./api.controller";
import { PrismaService } from "./prisma.service";
import { ShopService } from "./shop.service";
import { RedisService } from "./redis/redis.service";
import { RateLimitService } from "./redis/rate-limit";
import { StorageService } from "./storage/storage.service";
import { PaymentModule } from "./payments/payment.module";
import { EmailService } from "./email/email.service";
import { JobsService } from "./jobs/jobs.service";
import { HealthService } from "./health.service";

@Module({
  imports: [PaymentModule],
  controllers: [ApiController],
  providers: [
    PrismaService,
    ShopService,
    RedisService,
    RateLimitService,
    StorageService,
    EmailService,
    JobsService,
    HealthService,
  ],
  exports: [RedisService, PaymentModule],
})
export class AppModule {}
