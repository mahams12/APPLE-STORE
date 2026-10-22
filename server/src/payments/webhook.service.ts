import { createHmac, timingSafeEqual } from "node:crypto";
import { Inject, Injectable, UnauthorizedException } from "@nestjs/common";
import { loadConfig } from "../config";
import { logInfo } from "../logger";
import { PaymentService } from "./payment.service";

@Injectable()
export class WebhookService {
  private readonly payments: PaymentService;

  constructor(@Inject(PaymentService) payments: PaymentService) {
    this.payments = payments;
  }

  verifyIstoreSignature(rawBody: string, signature: string | undefined) {
    const secret = loadConfig().paymentWebhookSecret;
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    const given = signature || "";
    const left = Buffer.from(expected);
    const right = Buffer.from(given);
    if (left.length !== right.length || !timingSafeEqual(left, right)) {
      throw new UnauthorizedException("Invalid payment signature.");
    }
  }

  async handleIstoreWebhook(body: { event?: string; paymentId?: string; eventId?: string }, signature: string | undefined) {
    const raw = JSON.stringify(body);
    this.verifyIstoreSignature(raw, signature);

    if (body.event === "payment.paid" && body.paymentId) {
      const eventId = body.eventId || `legacy-${body.paymentId}`;
      await this.payments.markPaidFromWebhook(body.paymentId, eventId);
      logInfo("webhook.processed", { paymentId: body.paymentId, eventId });
    }
    return { ok: true };
  }
}
