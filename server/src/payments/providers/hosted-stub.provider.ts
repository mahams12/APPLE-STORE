import type { CreatePaymentInput, PaymentProvider, PaymentStatus, WebhookResult } from "../provider";

/**
 * Development stand-in for a hosted payment page.
 * Confirmation requires a signed one-time token — payment id alone is insufficient.
 * Must never be used for real card payments in production.
 */
export class HostedStubProvider implements PaymentProvider {
  readonly name = "hosted-stub";

  async createPayment(input: CreatePaymentInput) {
    if (!input.confirmToken) {
      throw new Error("Hosted stub requires a confirmToken for secure confirmation.");
    }
    const qs = new URLSearchParams({ token: input.confirmToken });
    return { redirectUrl: `/backend/payments/hosted/${input.paymentId}?${qs.toString()}` };
  }

  async verifyPayment(): Promise<PaymentStatus> {
    return "PENDING";
  }

  async handleWebhook(): Promise<WebhookResult> {
    return null;
  }

  async refundPayment() {
    return { ok: false };
  }

  async getPaymentStatus(): Promise<PaymentStatus> {
    return "PENDING";
  }
}
