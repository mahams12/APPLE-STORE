import { createHmac, timingSafeEqual } from "node:crypto";
import type { CreatePaymentInput, PaymentProvider, PaymentStatus, WebhookResult } from "../provider";
import type { AppConfig } from "../../config";

type SafepayConfig = NonNullable<AppConfig["safepay"]>;

/**
 * Safepay hosted checkout.
 * Flow: create a tracker via /order/v1/init -> redirect the customer to the
 * hosted /components page -> Safepay posts back `tracker` + `sig` to our
 * fulfill endpoint -> we verify sig = HMAC-SHA256(secret, tracker).
 */
export class SafepayProvider implements PaymentProvider {
  readonly name = "safepay";
  private readonly cfg: SafepayConfig;
  private readonly appUrl: string;

  constructor(cfg: SafepayConfig, appUrl: string) {
    this.cfg = cfg;
    this.appUrl = appUrl;
  }

  private apiBase() {
    return this.cfg.environment === "production"
      ? "https://api.getsafepay.com"
      : "https://sandbox.api.getsafepay.com";
  }

  private checkoutBase() {
    return this.cfg.environment === "production"
      ? "https://www.getsafepay.com"
      : "https://sandbox.api.getsafepay.com";
  }

  async createPayment(input: CreatePaymentInput) {
    const res = await fetch(`${this.apiBase()}/order/v1/init`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client: this.cfg.clientKey,
        amount: input.amount,
        currency: input.currency || "USD",
        environment: this.cfg.environment,
      }),
    });
    const data = (await res.json().catch(() => null)) as {
      data?: { token?: string };
      status?: { message?: string };
    } | null;
    const tracker = data?.data?.token;
    if (!res.ok || !tracker) {
      throw new Error(
        `Safepay checkout failed (${res.status}): ${data?.status?.message || "could not create payment"}`,
      );
    }
    const params = new URLSearchParams({
      env: this.cfg.environment,
      beacon: tracker,
      source: "custom",
      order_id: input.orderId,
      redirect_url: `${this.appUrl}/backend/payments/safepay/fulfill`,
      cancel_url: input.returnUrl,
    });
    return { redirectUrl: `${this.checkoutBase()}/components?${params.toString()}`, externalId: tracker };
  }

  /** Verify the tracker return signature posted back by Safepay checkout. */
  verifySignature(tracker: string, signature: string): boolean {
    const expected = createHmac("sha256", this.cfg.secretKey).update(tracker).digest("hex");
    const left = Buffer.from(expected);
    const right = Buffer.from(signature || "");
    return left.length === right.length && timingSafeEqual(left, right);
  }

  async verifyPayment(): Promise<PaymentStatus> {
    return "PENDING";
  }

  async handleWebhook(): Promise<WebhookResult> {
    return null;
  }

  async getPaymentStatus(): Promise<PaymentStatus> {
    return "PENDING";
  }

  async refundPayment() {
    return { ok: false };
  }
}
