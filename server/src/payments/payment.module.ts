import { Module } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { PaymentService } from "./payment.service";
import { WebhookService } from "./webhook.service";

@Module({
  providers: [PrismaService, PaymentService, WebhookService],
  exports: [PaymentService, WebhookService],
})
export class PaymentModule {}
