/**
 * Payment provider abstraction for I.STORE.
 * The hosted stub is the current development provider — not a live card processor.
 */

export type CreatePaymentInput = {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
};

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<{ redirectUrl: string | null }>;
  verifyPayment(paymentId: string): Promise<PaymentStatus>;
  handleWebhook(rawBody: string, signature: string | undefined): Promise<{ paymentId: string; status: PaymentStatus } | null>;
  refundPayment(paymentId: string, amount?: number): Promise<{ ok: boolean }>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
}

/** Development / staging stand-in. Does not process real cards. */
export class HostedStubProvider implements PaymentProvider {
  readonly name = "hosted-stub";

  async createPayment(input: CreatePaymentInput) {
    return { redirectUrl: `/backend/payments/hosted/${input.paymentId}` };
  }

  async verifyPayment(): Promise<PaymentStatus> {
    return "PENDING";
  }

  async handleWebhook(): Promise<{ paymentId: string; status: PaymentStatus } | null> {
    return null;
  }

  async refundPayment() {
    return { ok: false };
  }

  async getPaymentStatus(): Promise<PaymentStatus> {
    return "PENDING";
  }
}

let provider: PaymentProvider = new HostedStubProvider();

export function getPaymentProvider() {
  return provider;
}

export function setPaymentProvider(next: PaymentProvider) {
  provider = next;
}
