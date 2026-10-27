import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreatePaymentInput, PaymentProvider, PaymentStatus, WebhookResult } from "../provider";
import { logWarn } from "../../logger";

/**
 * Stripe-shaped provider boundary.
 * Does not invent credentials — activate only when STRIPE_SECRET_KEY is set.
 * Checkout must not call Stripe APIs without real keys.
 */
export class StripeProvider implements PaymentProvider {
  readonly name = "stripe";

  constructor(
    private readonly secretKey: string,
    private readonly webhookSecret: string | null,
  ) {}

  async createPayment(input: CreatePaymentInput): Promise<{ redirectUrl: string | null; externalId?: string }> {
    // Boundary only: wire Stripe Checkout / PaymentIntents when credentials are live.
    // Until then, refuse rather than fake a successful charge.
    if (!this.secretKey.startsWith("sk_")) {
      throw new Error("Stripe secret key is invalid. Card payments are disabled.");
    }
    logWarn("stripe.createPayment.not_wired", {
      orderId: input.orderId,
      message: "Stripe SDK integration boundary ready — set live keys and wire Checkout Session",
    });
    throw new Error(
      "Stripe Checkout Session is not fully wired yet. Provide STRIPE_SECRET_KEY and complete provider wiring before accepting live cards.",
    );
  }

  async verifyPayment(): Promise<PaymentStatus> {
    return "PENDING";
  }

  async handleWebhook(rawBody: string, signature: string | undefined): Promise<WebhookResult> {
    if (!this.webhookSecret) return null;
    // Signature verification shape (Stripe-compatible header); full event parse when wired.
    if (!signature) return null;
    const expected = createHmac("sha256", this.webhookSecret).update(rawBody).digest("hex");
    const given = signature.replace(/^t=\d+,v1=/, "").split(",")[0] || signature;
    const left = Buffer.from(expected);
    const right = Buffer.from(given);
    if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
    try {
      const body = JSON.parse(rawBody) as {
        id?: string;
        type?: string;
        data?: { object?: { metadata?: { paymentId?: string }; id?: string } };
      };
      if (body.type === "payment_intent.succeeded" && body.data?.object?.metadata?.paymentId) {
        return {
          paymentId: body.data.object.metadata.paymentId,
          status: "PAID",
          eventId: body.id || body.data.object.id || `stripe-${Date.now()}`,
        };
      }
    } catch {
      return null;
    }
    return null;
  }

  async refundPayment() {
    return { ok: false };
  }

  async getPaymentStatus(): Promise<PaymentStatus> {
    return "PENDING";
  }
}
