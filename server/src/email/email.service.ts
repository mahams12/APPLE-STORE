import { Inject, Injectable } from "@nestjs/common";
import { createTransport, type Transporter } from "nodemailer";
import { PrismaService } from "../prisma.service";
import { loadConfig } from "../config";
import { logInfo, logWarn } from "../logger";

export type EmailTemplate =
  | "welcome"
  | "verify-email"
  | "reset-password"
  | "order-received"
  | "payment-confirmed"
  | "order-shipped"
  | "order-delivered"
  | "order-cancelled"
  | "refund"
  | "admin-notification";

const SUBJECTS: Record<EmailTemplate, string> = {
  welcome: "Welcome to I.STORE",
  "verify-email": "Verify your I.STORE email",
  "reset-password": "Reset your I.STORE password",
  "order-received": "We received your I.STORE order",
  "payment-confirmed": "Payment confirmed — I.STORE",
  "order-shipped": "Your I.STORE order shipped",
  "order-delivered": "Your I.STORE order was delivered",
  "order-cancelled": "Your I.STORE order was cancelled",
  refund: "Your I.STORE refund",
  "admin-notification": "I.STORE admin notification",
};

function renderBody(template: EmailTemplate, to: string, payload: Record<string, unknown>) {
  const lines = [
    `Hello,`,
    ``,
    `This is an I.STORE transactional message (${template}).`,
    payload.number ? `Order: ${payload.number}` : "",
    payload.code ? `Your sign-in code: ${payload.code}` : "",
    payload.path ? `Link: ${loadConfig().appUrl}${payload.path}` : "",
    ``,
    `— I.STORE`,
  ].filter(Boolean);
  return lines.join("\n");
}

@Injectable()
export class EmailService {
  private readonly prisma: PrismaService;
  private transporter: Transporter | null = null;

  constructor(@Inject(PrismaService) prisma: PrismaService) {
    this.prisma = prisma;
    const cfg = loadConfig();
    if (cfg.smtp) {
      this.transporter = createTransport({
        host: cfg.smtp.host,
        port: cfg.smtp.port,
        secure: cfg.smtp.port === 465,
        auth: cfg.smtp.user ? { user: cfg.smtp.user, pass: cfg.smtp.password } : undefined,
      });
    }
  }

  configured() {
    return !!this.transporter;
  }

  async send(template: EmailTemplate, to: string, payload: Record<string, unknown> = {}) {
    const row = await this.prisma.notification.create({
      data: {
        channel: "email",
        to,
        template,
        payload: JSON.stringify(payload),
        status: "QUEUED",
      },
    });

    const cfg = loadConfig();
    if (!this.transporter || !cfg.smtp) {
      await this.prisma.notification.update({
        where: { id: row.id },
        data: { status: "LOGGED" },
      });
      logInfo("email.logged_no_smtp", { template, to: "[redacted]", id: row.id });
      return { ok: true, id: row.id, delivered: false };
    }

    try {
      await this.transporter.sendMail({
        from: cfg.smtp.from,
        to,
        subject: SUBJECTS[template] || "I.STORE",
        text: renderBody(template, to, payload),
      });
      await this.prisma.notification.update({ where: { id: row.id }, data: { status: "SENT" } });
      logInfo("email.sent", { template, id: row.id });
      return { ok: true, id: row.id, delivered: true };
    } catch (error) {
      await this.prisma.notification.update({ where: { id: row.id }, data: { status: "FAILED" } });
      logWarn("email.failed", {
        template,
        id: row.id,
        message: error instanceof Error ? error.message : "send failed",
      });
      return { ok: false, id: row.id, delivered: false };
    }
  }
}
