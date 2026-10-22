/**
 * Payment provider abstraction for I.STORE.
 * Real card processing requires a configured provider (e.g. Stripe).
 * The hosted stub is development-only and must not process real cards in production.
 */

export type CreatePaymentInput = {
  orderId: string;
  paymentId: string;
  amount: number;
  currency: string;
  customerEmail: string;
  returnUrl: string;
  /** One-time confirmation token (hosted stub). Never guessable by payment id alone. */
  confirmToken?: string;
};

export type PaymentStatus = "PENDING" | "PAID" | "FAILED" | "REFUNDED";

export type WebhookResult = {
  paymentId: string;
  status: PaymentStatus;
  eventId: string;
} | null;

export interface PaymentProvider {
  readonly name: string;
  createPayment(input: CreatePaymentInput): Promise<{ redirectUrl: string | null; externalId?: string }>;
  verifyPayment(paymentId: string): Promise<PaymentStatus>;
  handleWebhook(rawBody: string, signature: string | undefined): Promise<WebhookResult>;
  getPaymentStatus(paymentId: string): Promise<PaymentStatus>;
  refundPayment(paymentId: string, amount?: number): Promise<{ ok: boolean }>;
}
