import { BadRequestException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import { PrismaService } from "../prisma.service";
import { loadConfig } from "../config";
import { logInfo, logWarn } from "../logger";
import { hashConfirmToken, mintConfirmToken, tokensMatch } from "./payment-token";
import type { PaymentProvider } from "./provider";
import { HostedStubProvider } from "./providers/hosted-stub.provider";
import { StripeProvider } from "./providers/stripe.provider";
import { SafepayProvider } from "./providers/safepay.provider";

@Injectable()
export class PaymentService {
  private readonly prisma: PrismaService;
  private provider: PaymentProvider;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.prisma = prisma;
    this.provider = this.buildProvider();
  }

  private buildProvider(): PaymentProvider {
    const cfg = loadConfig();
    if (cfg.paymentProvider === "stripe" && cfg.stripeSecretKey) {
      return new StripeProvider(cfg.stripeSecretKey, cfg.stripeWebhookSecret);
    }
    if (cfg.paymentProvider === "safepay" && cfg.safepay) {
      return new SafepayProvider(cfg.safepay, cfg.appUrl);
    }
    return new HostedStubProvider();
  }

  getProvider() {
    return this.provider;
  }

  /** Production must not process fake / stub card payments. */
  assertCardPaymentsAllowed() {
    const cfg = loadConfig();
    if (cfg.isProd && this.provider.name === "hosted-stub") {
      throw new BadRequestException(
        "Card payments are not configured for production. Set PAYMENT_PROVIDER=safepay (or stripe) with valid credentials.",
      );
    }
  }

  async createHostedPayment(input: {
    orderId: string;
    paymentId: string;
    amount: number;
    currency: string;
    customerEmail: string;
    returnUrl: string;
  }) {
    this.assertCardPaymentsAllowed();
    const minted = mintConfirmToken();
    await this.prisma.payment.update({
      where: { id: input.paymentId },
      data: {
        confirmTokenHash: minted.hash,
        confirmTokenExpires: minted.expiresAt,
        confirmTokenUsedAt: null,
      },
    });
    const created = await this.provider.createPayment({
      ...input,
      confirmToken: minted.token,
    });
    if (created.externalId) {
      await this.prisma.payment.update({
        where: { id: input.paymentId },
        data: { externalId: created.externalId },
      });
    }
    logInfo("payment.created", { paymentId: input.paymentId, provider: this.provider.name });
    return created;
  }

  /**
   * Safepay posts `tracker` + `sig` back to /backend/payments/safepay/fulfill.
   * Verifies the HMAC signature and resolves the tracker to our payment id.
   */
  async verifySafepayReturn(tracker: string | undefined, sig: string | undefined): Promise<string> {
    const provider = this.provider as Partial<SafepayProvider>;
    if (this.provider.name !== "safepay" || typeof provider.verifySignature !== "function") {
      throw new BadRequestException("Safepay is not the active payment provider.");
    }
    if (!tracker || !sig || !provider.verifySignature(tracker, sig)) {
      throw new UnauthorizedException("Invalid payment signature.");
    }
    const payment = await this.prisma.payment.findFirst({ where: { externalId: tracker } });
    if (!payment) throw new NotFoundException("Payment not found.");
    return payment.id;
  }

  async hostedPage(paymentId: string, token: string | undefined) {
    // Do not reveal payment state by id alone.
    if (!token) throw new UnauthorizedException("Payment confirmation token required.");
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
    if (!payment?.confirmTokenHash || !payment.confirmTokenExpires) {
      throw new UnauthorizedException("Invalid or expired payment link.");
    }
    if (payment.confirmTokenUsedAt) throw new UnauthorizedException("This payment link has already been used.");
    if (payment.confirmTokenExpires < new Date()) throw new UnauthorizedException("This payment link has expired.");
    if (!tokensMatch(payment.confirmTokenHash, hashConfirmToken(token))) {
      throw new UnauthorizedException("Invalid payment confirmation token.");
    }
    if (payment.status === "PAID") {
      const app = loadConfig().appUrl;
      return `<!doctype html><html><head><meta charset="utf-8"><title>I.STORE payment</title></head>
        <body style="font-family:sans-serif;display:grid;place-items:center;min-height:100vh"><main>
        <p>This payment is already confirmed.</p>
        <p><a href="${app}/orders/${payment.orderId}">View order</a></p>
        </main></body></html>`;
    }
    const app = loadConfig().appUrl;
    return `<!doctype html><html><head><meta charset="utf-8"><title>I.STORE payment</title>
      <style>body{font-family:sans-serif;background:#f4f6fa;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fff;padding:32px;border-radius:16px;max-width:420px}button{background:#111;color:#fff;border:0;border-radius:10px;height:44px;padding:0 16px;font-weight:700;cursor:pointer}</style></head>
      <body><main><p>I.STORE</p><h1>Card payment</h1><p>Order ${payment.order.number} · $${Number(payment.amount).toFixed(2)}</p>
      <p>Development payment page. Confirmation uses a one-time signed token — payment id alone cannot mark this paid.</p>
      <form method="post" action="${payment.id}/confirm"><input type="hidden" name="token" value="${token}" /><button type="submit">Confirm payment</button></form>
      <p><a href="${app}/orders/${payment.orderId}">Return without paying</a></p></main></body></html>`;
  }

  async confirmWithToken(paymentId: string, token: string | undefined, source: string) {
    if (!token) throw new UnauthorizedException("Payment confirmation token required.");
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });
    if (!payment?.confirmTokenHash || !payment.confirmTokenExpires) {
      throw new UnauthorizedException("Invalid or expired payment link.");
    }
    if (payment.confirmTokenUsedAt) throw new UnauthorizedException("This payment link has already been used.");
    if (payment.confirmTokenExpires < new Date()) throw new UnauthorizedException("This payment link has expired.");
    if (!tokensMatch(payment.confirmTokenHash, hashConfirmToken(token))) {
      throw new UnauthorizedException("Invalid payment confirmation token.");
    }
    if (payment.status === "PAID") return payment.orderId;

    await this.prisma.$transaction(async (tx) => {
      const claim = await tx.payment.updateMany({
        where: {
          id: payment.id,
          confirmTokenUsedAt: null,
          status: { not: "PAID" },
        },
        data: { confirmTokenUsedAt: new Date() },
      });
      if (claim.count === 0) return;

      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "PAID" } },
        data: { status: "PAID" },
      });
      if (updated.count === 0) return;

      await tx.paymentTransaction.create({
        data: { paymentId: payment.id, event: `PAID:${source}`, payload: source },
      }).catch(() => {
        /* idempotent unique */
      });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
      if (payment.provider === "card") {
        for (const item of payment.order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.qty }, reserved: { decrement: item.qty } },
          });
          await tx.inventoryTransaction.create({
            data: {
              variantId: item.variantId,
              delta: -item.qty,
              reason: "SALE",
              orderId: payment.orderId,
              note: "Payment confirmed",
            },
          });
        }
      }
    });

    logInfo("payment.confirmed", { paymentId, source });
    return payment.orderId;
  }

  /**
   * Server-authoritative mark-paid used by verified webhooks only.
   * Idempotent via PaymentTransaction unique (paymentId, event).
   */
  async markPaidFromWebhook(paymentId: string, eventId: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
      include: { order: { include: { items: true } } },
    });
    if (!payment) throw new NotFoundException("Payment not found.");
    if (payment.status === "PAID") return payment.orderId;

    const eventKey = `PAID:webhook:${eventId}`;
    try {
      await this.prisma.paymentTransaction.create({
        data: { paymentId: payment.id, event: eventKey, payload: eventId },
      });
    } catch {
      logInfo("payment.webhook.duplicate", { paymentId, eventId });
      return payment.orderId;
    }

    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({
        where: { id: payment.id, status: { not: "PAID" } },
        data: { status: "PAID", confirmTokenUsedAt: new Date() },
      });
      if (updated.count === 0) return;
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
      if (payment.provider === "card") {
        for (const item of payment.order.items) {
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: { decrement: item.qty }, reserved: { decrement: item.qty } },
          });
          await tx.inventoryTransaction.create({
            data: {
              variantId: item.variantId,
              delta: -item.qty,
              reason: "SALE",
              orderId: payment.orderId,
              note: "Webhook payment confirmed",
            },
          });
        }
      }
    });

    logInfo("payment.webhook.paid", { paymentId, eventId });
    return payment.orderId;
  }
}
