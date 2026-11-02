import type { CreatePaymentInput, PaymentProvider, PaymentStatus, WebhookResult } from "../provider";
import type { AppConfig } from "../../config";

type SafepayConfig = NonNullable<AppConfig["safepay"]>;

/**
 * Safepay hosted checkout (official Payments 2.0 flow).
 * 1. POST /order/payments/v3/        -> tracker token
 * 2. POST /client/passport/v1/token  -> short-lived tbt auth token
 * 3. Redirect shopper to /checkout/pay?tracker&tbt&environment&source&redirect_url&cancel_url
 * 4. On success Safepay redirects to redirect_url?tracker=track_...
 *    We confirm by GET /reporter/api/v1/payments/{tracker} -> state === TRACKER_ENDED.
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
      ? "https://getsafepay.com"
      : "https://sandbox.api.getsafepay.com";
  }

  private headers() {
    return {
      "Content-Type": "application/json",
      "X-SFPY-MERCHANT-SECRET": this.cfg.secretKey,
    };
  }

  async createPayment(input: CreatePaymentInput) {
    const init = await fetch(`${this.apiBase()}/order/payments/v3/`, {
      method: "POST",
      headers: this.headers(),
      body: JSON.stringify({
        merchant_api_key: this.cfg.clientKey,
        intent: "CYBERSOURCE",
        mode: "payment",
        entry_mode: "raw",
        currency: input.currency || "USD",
        amount: Math.round(input.amount * 100), // lowest denomination
        metadata: { order_id: input.orderId },
      }),
    });
    const initData = (await init.json().catch(() => null)) as {
      data?: { tracker?: { token?: string } };
      status?: { message?: string };
    } | null;
    const tracker = initData?.data?.tracker?.token;
    if (!init.ok || !tracker) {
      throw new Error(
        `Safepay checkout failed (${init.status}): ${initData?.status?.message || "could not create payment"}`,
      );
    }

    const tbtRes = await fetch(`${this.apiBase()}/client/passport/v1/token`, {
      method: "POST",
      headers: this.headers(),
    });
    const tbtData = (await tbtRes.json().catch(() => null)) as { data?: string } | null;
    const tbt = tbtData?.data;
    if (!tbtRes.ok || !tbt) {
      throw new Error(`Safepay auth token failed (${tbtRes.status})`);
    }

    const params = new URLSearchParams({
      environment: this.cfg.environment,
      tbt,
      tracker,
      source: "hosted",
      redirect_url: `${this.appUrl}/backend/payments/safepay/fulfill`,
      cancel_url: input.returnUrl,
    });
    return { redirectUrl: `${this.checkoutBase()}/embedded/?${params.toString()}`, externalId: tracker };
  }

  /**
   * Confirm the tracker our redirect_url received actually completed payment.
   * Queries Safepay server-side — the return URL carries no signature to check.
   */
  async confirmPaid(tracker: string): Promise<boolean> {
    const res = await fetch(`${this.apiBase()}/reporter/api/v1/payments/${encodeURIComponent(tracker)}`, {
      headers: this.headers(),
    });
    if (!res.ok) return false;
    const data = (await res.json().catch(() => null)) as {
      data?: { state?: string; client?: { api_key?: string } };
    } | null;
    return data?.data?.state === "TRACKER_ENDED" && data?.data?.client?.api_key === this.cfg.clientKey;
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
