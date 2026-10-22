import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import bcrypt from "bcryptjs";
import type { Response } from "express";
import { PrismaService } from "./prisma.service";
import { clearCookie, hashToken, newToken, setCookie } from "./auth.util";
import { priceTotals, round2 } from "./pricing";
import { PaymentService } from "./payments/payment.service";
import { RateLimitService } from "./redis/rate-limit";
import { RedisService } from "./redis/redis.service";
import { JobsService } from "./jobs/jobs.service";
import type { EmailTemplate } from "./email/email.service";
import { logInfo } from "./logger";

type Actor = { userId?: string; adminId?: string; guest?: string; receipts: string[] };

const PERMISSIONS = [
  "company.view", "company.edit", "users.view", "users.create", "users.edit", "users.status",
  "roles.view", "roles.create", "roles.edit", "orders.view", "orders.update", "orders.refund",
  "products.view", "products.create", "products.edit", "products.archive",
];

@Injectable()
export class ShopService {
  private readonly prisma: PrismaService;
  private readonly payments: PaymentService;
  private readonly rateLimit: RateLimitService;
  private readonly redis: RedisService;
  private readonly jobs: JobsService;

  constructor(
    @Inject(PrismaService) prisma: PrismaService,
    @Inject(PaymentService) payments: PaymentService,
    @Inject(RateLimitService) rateLimit: RateLimitService,
    @Inject(RedisService) redis: RedisService,
    @Inject(JobsService) jobs: JobsService,
  ) {
    this.prisma = prisma;
    this.payments = payments;
    this.rateLimit = rateLimit;
    this.redis = redis;
    this.jobs = jobs;
  }

  async limit(bucket: string, identity: string) {
    await this.rateLimit.check(bucket, identity);
  }

  async actorFrom(cookies: Record<string, string | undefined>): Promise<Actor> {
    const receipts = (cookies.istore_receipts ?? "").split(",").filter(Boolean);
    const actor: Actor = { guest: cookies.istore_guest, receipts };
    if (cookies.istore_customer) {
      const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(cookies.istore_customer) } });
      if (session && session.expiresAt > new Date() && session.userId) actor.userId = session.userId;
    }
    if (cookies.istore_admin) {
      const session = await this.prisma.session.findUnique({ where: { tokenHash: hashToken(cookies.istore_admin) } });
      if (session && session.expiresAt > new Date() && session.adminId) actor.adminId = session.adminId;
    }
    return actor;
  }

  async requireAdmin(actor: Actor) {
    if (!actor.adminId) throw new ForbiddenException("Admin sign-in is required.");
    return this.prisma.adminUser.findUniqueOrThrow({ where: { id: actor.adminId }, include: { role: true } });
  }

  async me(actor: Actor) {
    const user = actor.userId
      ? await this.prisma.user.findUnique({ where: { id: actor.userId }, select: { id: true, email: true, firstName: true, lastName: true, phone: true, emailVerified: true } })
      : null;
    const admin = actor.adminId
      ? await this.prisma.adminUser.findUnique({ where: { id: actor.adminId }, select: { id: true, email: true, firstName: true, lastName: true, role: { select: { name: true, permissions: true } } } })
      : null;
    return { user, admin };
  }

  private async openSession(kind: "customer" | "admin", id: string, res: Response) {
    const token = newToken();
    await this.prisma.session.create({
      data: {
        tokenHash: hashToken(token),
        kind,
        expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        userId: kind === "customer" ? id : undefined,
        adminId: kind === "admin" ? id : undefined,
      },
    });
    setCookie(res, kind === "customer" ? "istore_customer" : "istore_admin", token);
  }

  async register(body: { email: string; password: string; firstName: string; lastName: string }, actor: Actor, res: Response) {
    clearCookie(res, "istore_receipts");
    await this.limit("register", body.email);
    const email = body.email.trim().toLowerCase();
    if (!email.includes("@") || body.password.length < 8) throw new BadRequestException("Use a valid email and a password of at least 8 characters.");
    const existing = await this.prisma.user.findUnique({ where: { email } });
    if (existing) throw new BadRequestException("An account with that email already exists.");
    const verifyToken = newToken();
    const user = await this.prisma.user.create({
      data: {
        email,
        passwordHash: await bcrypt.hash(body.password, 10),
        firstName: body.firstName.trim(),
        lastName: body.lastName.trim(),
        verifyToken: hashToken(verifyToken),
      },
    });
    await this.openSession("customer", user.id, res);
    await this.mergeGuestCart(actor.guest, user.id, res);
    await this.note("welcome", email, {});
    await this.note("verify-email", email, { path: `/account/verify?token=${verifyToken}` });
    return { ok: true, devVerifyPath: process.env.NODE_ENV === "production" ? undefined : `/account/verify?token=${verifyToken}` };
  }

  async login(body: { email: string; password: string }, actor: Actor, res: Response) {
    clearCookie(res, "istore_receipts");
    await this.limit("login", body.email);
    const user = await this.prisma.user.findUnique({ where: { email: body.email.trim().toLowerCase() } });
    if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) throw new UnauthorizedException("Email or password is incorrect.");
    await this.openSession("customer", user.id, res);
    await this.mergeGuestCart(actor.guest, user.id, res);
    return { ok: true };
  }

  async loginAdmin(body: { email: string; password: string }, res: Response) {
    await this.limit("admin-auth", body.email);
    const admin = await this.prisma.adminUser.findUnique({ where: { email: body.email.trim().toLowerCase() }, include: { role: true } });
    if (!admin || admin.status !== "Active" || admin.role.disabled || !(await bcrypt.compare(body.password, admin.passwordHash))) {
      throw new UnauthorizedException("Admin email or password is incorrect.");
    }
    await this.openSession("admin", admin.id, res);
    return { ok: true, role: admin.role.name };
  }

  async logout(kind: "customer" | "admin", cookies: Record<string, string | undefined>, res: Response) {
    const raw = cookies[kind === "customer" ? "istore_customer" : "istore_admin"];
    if (raw) await this.prisma.session.deleteMany({ where: { tokenHash: hashToken(raw) } });
    clearCookie(res, kind === "customer" ? "istore_customer" : "istore_admin");
    if (kind === "customer") clearCookie(res, "istore_receipts");
    return { ok: true };
  }

  async forgot(email: string) {
    await this.limit("password-reset", email || "unknown");
    const user = await this.prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
    if (!user) return { ok: true };
    const token = newToken();
    await this.prisma.user.update({ where: { id: user.id }, data: { resetToken: hashToken(token), resetExpires: new Date(Date.now() + 60 * 60 * 1000) } });
    await this.note("reset-password", user.email, { path: `/account/reset?token=${token}` });
    return { ok: true, devResetPath: process.env.NODE_ENV === "production" ? undefined : `/account/reset?token=${token}` };
  }

  async reset(token: string, password: string) {
    if (password.length < 8) throw new BadRequestException("Use a password of at least 8 characters.");
    const user = await this.prisma.user.findFirst({ where: { resetToken: hashToken(token), resetExpires: { gt: new Date() } } });
    if (!user) throw new BadRequestException("This reset link is invalid or expired.");
    await this.prisma.user.update({ where: { id: user.id }, data: { passwordHash: await bcrypt.hash(password, 10), resetToken: null, resetExpires: null } });
    return { ok: true };
  }

  async verify(token: string) {
    const user = await this.prisma.user.findFirst({ where: { verifyToken: hashToken(token) } });
    if (!user) throw new BadRequestException("This verification link is invalid.");
    await this.prisma.user.update({ where: { id: user.id }, data: { emailVerified: true, verifyToken: null } });
    return { ok: true };
  }

  private async note(template: EmailTemplate, to: string, payload: Record<string, unknown> = {}) {
    // Non-blocking for checkout: queue when Redis/BullMQ available; otherwise log/send inline.
    void this.jobs.enqueueEmail(template, to, payload, `${template}:${to}:${String(payload.number || payload.path || Date.now())}`).catch(() => undefined);
  }

  private async rules() {
    const [setting, method] = await Promise.all([
      this.prisma.storeSetting.findUniqueOrThrow({ where: { id: "store" } }),
      this.prisma.shippingMethod.findFirstOrThrow({ where: { active: true } }),
    ]);
    return {
      setting,
      ship: { freeOver: Number(method.freeOver), shippingFee: Number(method.fee), taxRate: Number(setting.taxRate) },
    };
  }

  async listProducts(query: { q?: string; category?: string; page?: string; pageSize?: string }) {
    const page = Math.max(1, Number(query.page) || 1);
    const pageSize = Math.min(60, Math.max(1, Number(query.pageSize) || 24));
    const q = query.q?.trim();
    if (q) await this.limit("search", q.slice(0, 40));
    const cacheKey = `products:${page}:${pageSize}:${query.category || ""}:${q || ""}`;
    const redisCached = await this.redis.get(`catalog:${cacheKey}`);
    if (redisCached) {
      try {
        return JSON.parse(redisCached) as { products: unknown[]; total: number; page: number; pageSize: number };
      } catch {
        /* fall through */
      }
    }
    const cached = catalogCache.get(cacheKey);
    if (cached && cached.expires > Date.now()) return cached.value;

    const where = {
      published: true,
      ...(query.category ? { category: { name: query.category } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { sku: { contains: q, mode: "insensitive" as const } },
              { brand: { contains: q, mode: "insensitive" as const } },
              { category: { name: { contains: q, mode: "insensitive" as const } } },
            ],
          }
        : {}),
    };
    const started = Date.now();
    const [total, rows] = await Promise.all([
      this.prisma.product.count({ where }),
      this.prisma.product.findMany({
        where,
        include: listInclude,
        orderBy: [{ bestSeller: "desc" }, { featured: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
    ]);
    const value = { products: rows.map(presentProduct), total, page, pageSize };
    catalogCache.set(cacheKey, { value, expires: Date.now() + 30_000 });
    logInfo("listProducts", { ms: Date.now() - started, total, page, pageSize, q: q || null });
    return value;
  }

  async productBySlug(slug: string) {
    const product = await this.prisma.product.findUnique({ where: { slug }, include: productInclude });
    if (!product || !product.published) throw new NotFoundException("This product is no longer available.");
    return presentProduct(product);
  }

  private async cartFor(actor: Actor, res?: Response) {
    if (actor.userId) {
      return this.prisma.cart.upsert({
        where: { userId: actor.userId },
        update: {},
        create: { userId: actor.userId },
        include: cartInclude,
      });
    }
    if (actor.guest) {
      const existing = await this.prisma.cart.findUnique({ where: { guestToken: actor.guest }, include: cartInclude });
      if (existing) return existing;
    }
    const guestToken = newToken();
    const cart = await this.prisma.cart.create({ data: { guestToken }, include: cartInclude });
    if (res) setCookie(res, "istore_guest", guestToken);
    actor.guest = guestToken;
    return cart;
  }

  async getCart(actor: Actor, res: Response) {
    const cart = await this.cartFor(actor, res);
    return this.presentCart(cart);
  }

  async addItem(actor: Actor, res: Response, body: { productId: string; slug?: string; color: string; storage: string; extra: string; qty?: number }) {
    const qty = Math.max(1, Math.min(10, Number(body.qty) || 1));
    const variant = await this.prisma.productVariant.findFirst({
      where: {
        color: body.color,
        storage: body.storage,
        extra: body.extra,
        product: { published: true, OR: body.slug ? [{ id: body.productId }, { slug: body.slug }] : [{ id: body.productId }] },
      },
    });
    if (!variant) throw new BadRequestException("That configuration is not available.");
    if (variant.stock - variant.reserved < qty) throw new BadRequestException("That configuration does not have enough stock.");
    const cart = await this.cartFor(actor, res);
    await this.prisma.cartItem.upsert({
      where: { cartId_variantId: { cartId: cart.id, variantId: variant.id } },
      create: { cartId: cart.id, variantId: variant.id, qty },
      update: { qty: { increment: qty } },
    });
    return this.getCart(actor, res);
  }

  async setQty(actor: Actor, res: Response, itemId: string, qty: number) {
    const cart = await this.cartFor(actor, res);
    const item = await this.prisma.cartItem.findFirst({ where: { id: itemId, cartId: cart.id }, include: { variant: true } });
    if (!item) throw new NotFoundException("That item is not in your cart.");
    if (qty <= 0) await this.prisma.cartItem.delete({ where: { id: item.id } });
    else {
      if (item.variant.stock - item.variant.reserved < qty) throw new BadRequestException("That configuration does not have enough stock.");
      await this.prisma.cartItem.update({ where: { id: item.id }, data: { qty } });
    }
    return this.getCart(actor, res);
  }

  async removeItem(actor: Actor, res: Response, itemId: string) {
    const cart = await this.cartFor(actor, res);
    await this.prisma.cartItem.deleteMany({ where: { id: itemId, cartId: cart.id } });
    return this.getCart(actor, res);
  }

  async clearCart(actor: Actor, res: Response) {
    const cart = await this.cartFor(actor, res);
    await this.prisma.cartItem.deleteMany({ where: { cartId: cart.id } });
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: "" } });
    return this.getCart(actor, res);
  }

  async applyCoupon(actor: Actor, res: Response, code: string) {
    const cart = await this.cartFor(actor, res);
    const normalized = code.trim().toUpperCase();
    if (normalized) {
      const coupon = await this.prisma.coupon.findUnique({ where: { code: normalized } });
      if (!coupon || !coupon.active) throw new BadRequestException("That coupon is not valid.");
    }
    await this.prisma.cart.update({ where: { id: cart.id }, data: { couponCode: normalized } });
    return this.getCart(actor, res);
  }

  private async presentCart(cart: { id: string; couponCode: string; items: CartRow[] }) {
    const { ship } = await this.rules();
    const coupon = cart.couponCode ? await this.prisma.coupon.findUnique({ where: { code: cart.couponCode } }) : null;
    const items = cart.items.map(presentCartItem);
    const subtotal = round2(items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0));
    const priced = priceTotals(subtotal, coupon ? { type: coupon.type, amount: Number(coupon.amount) } : null, ship);
    return { items, coupon: cart.couponCode, totals: { subtotal, ...priced, valid: true } };
  }

  async checkout(actor: Actor, res: Response, body: CheckoutBody, idempotencyKey?: string) {
    if (!body.consent) throw new BadRequestException("Please accept the order terms.");
    if (!body.firstName || !body.lastName || !body.email?.includes("@") || !body.line || !body.city || !body.postal) {
      throw new BadRequestException("Add your contact details and shipping address.");
    }
    if (!["Card", "Bank transfer", "Cash on delivery"].includes(body.method)) throw new BadRequestException("Choose a payment method.");
    if (idempotencyKey) {
      const existing = await this.prisma.order.findUnique({ where: { idempotencyKey }, include: orderInclude });
      if (existing) return { order: presentOrder(existing), paymentUrl: existing.payment?.provider === "card" && existing.payment.status !== "PAID" ? `/backend/payments/hosted/${existing.payment.id}` : null };
    }
    const cart = await this.cartFor(actor, res);
    const full = await this.prisma.cart.findUnique({ where: { id: cart.id }, include: cartInclude });
    if (!full || full.items.length === 0) throw new BadRequestException("Your cart is empty.");
    const orderId = await this.prisma.$transaction(async (tx) => {
      const setting = await tx.storeSetting.findUniqueOrThrow({ where: { id: "store" } });
      const method = await tx.shippingMethod.findFirstOrThrow({ where: { active: true } });
      const coupon = full.couponCode ? await tx.coupon.findUnique({ where: { code: full.couponCode } }) : null;
      if (full.couponCode && (!coupon || !coupon.active)) throw new BadRequestException("That coupon is not valid.");
      const lines = [];
      for (const item of full.items) {
        const locked = await tx.$queryRaw<Array<{ id: string; stock: number; reserved: number; price: string }>>`
          SELECT id, stock, reserved, price::text FROM "ProductVariant" WHERE id = ${item.variantId} FOR UPDATE`;
        const row = locked[0];
        if (!row || !item.variant.product.published) throw new BadRequestException("A product in your cart is no longer available.");
        if (row.stock - row.reserved < item.qty) throw new BadRequestException(`${item.variant.product.name} does not have enough stock.`);
        lines.push({ item, unitPrice: Number(row.price) });
      }
      const subtotal = round2(lines.reduce((sum, line) => sum + line.unitPrice * line.item.qty, 0));
      const priced = priceTotals(subtotal, coupon ? { type: coupon.type, amount: Number(coupon.amount) } : null, {
        freeOver: Number(method.freeOver),
        shippingFee: Number(method.fee),
        taxRate: Number(setting.taxRate),
      });
      const count = await tx.order.count();
      const card = body.method === "Card";
      const order = await tx.order.create({
        data: {
          number: `IST-${1001 + count}`,
          userId: actor.userId,
          email: body.email.trim().toLowerCase(),
          customerName: `${body.firstName.trim()} ${body.lastName.trim()}`,
          status: card ? "PENDING" : "CONFIRMED",
          paymentMethod: body.method,
          couponCode: coupon?.code,
          subtotal,
          discount: priced.discount,
          shipping: priced.shipping,
          tax: priced.tax,
          total: priced.total,
          addressLine: body.line.trim(),
          city: body.city.trim(),
          postal: body.postal.trim(),
          idempotencyKey: idempotencyKey || null,
          items: {
            create: lines.map((line) => ({
              productId: line.item.variant.productId,
              variantId: line.item.variantId,
              name: line.item.variant.product.name,
              sku: line.item.variant.sku,
              image: line.item.variant.product.images[0]?.url ?? "",
              color: line.item.variant.color,
              storage: line.item.variant.storage,
              extra: line.item.variant.extra,
              unitPrice: line.unitPrice,
              qty: line.item.qty,
            })),
          },
          payment: { create: { provider: card ? "card" : body.method === "Cash on delivery" ? "cod" : "bank", status: "PENDING", amount: priced.total } },
          shipment: { create: { method: method.code, status: "PENDING" } },
        },
      });
      for (const line of lines) {
        if (card) {
          await tx.productVariant.update({ where: { id: line.item.variantId }, data: { reserved: { increment: line.item.qty } } });
          await tx.inventoryTransaction.create({ data: { variantId: line.item.variantId, delta: 0, reason: "RESERVE", orderId: order.id, note: `Reserved ${line.item.qty}` } });
        } else {
          await tx.productVariant.update({ where: { id: line.item.variantId }, data: { stock: { decrement: line.item.qty } } });
          await tx.inventoryTransaction.create({ data: { variantId: line.item.variantId, delta: -line.item.qty, reason: "SALE", orderId: order.id } });
        }
      }
      if (coupon) await tx.couponUsage.create({ data: { couponId: coupon.id, orderId: order.id, email: order.email } });
      await tx.cartItem.deleteMany({ where: { cartId: full.id } });
      await tx.cart.update({ where: { id: full.id }, data: { couponCode: "" } });
      return order.id;
    });
    const order = await this.prisma.order.findUniqueOrThrow({ where: { id: orderId }, include: orderInclude });
    const receipts = Array.from(new Set([...actor.receipts, order.id]));
    setCookie(res, "istore_receipts", receipts.join(","));
    await this.note("order-received", order.email, { number: order.number });
    let paymentUrl: string | null = null;
    if (order.payment?.provider === "card" && order.payment.id) {
      const created = await this.payments.createHostedPayment({
        orderId: order.id,
        paymentId: order.payment.id,
        amount: Number(order.total),
        currency: "USD",
        customerEmail: order.email,
        returnUrl: `${process.env.APP_URL || "http://localhost:3456"}/orders/${order.id}`,
      });
      paymentUrl = created.redirectUrl;
    }
    return {
      order: presentOrder(order),
      paymentUrl,
    };
  }

  async markPaid(paymentId: string, source: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id: paymentId }, include: { order: { include: { items: true } } } });
    if (!payment) throw new NotFoundException("Payment not found.");
    if (payment.status === "PAID") return payment.orderId;
    await this.prisma.$transaction(async (tx) => {
      const updated = await tx.payment.updateMany({ where: { id: payment.id, status: { not: "PAID" } }, data: { status: "PAID" } });
      if (updated.count === 0) return;
      await tx.paymentTransaction.create({ data: { paymentId: payment.id, event: `PAID:${source}`, payload: source } });
      await tx.order.update({ where: { id: payment.orderId }, data: { status: "CONFIRMED" } });
      if (payment.provider === "card") {
        for (const item of payment.order.items) {
          await tx.productVariant.update({ where: { id: item.variantId }, data: { stock: { decrement: item.qty }, reserved: { decrement: item.qty } } });
          await tx.inventoryTransaction.create({ data: { variantId: item.variantId, delta: -item.qty, reason: "SALE", orderId: payment.orderId, note: "Payment confirmed" } });
        }
      }
    });
    return payment.orderId;
  }

  async hostedPayment(id: string) {
    const payment = await this.prisma.payment.findUnique({ where: { id }, include: { order: true } });
    if (!payment) throw new NotFoundException("Payment not found.");
    const app = process.env.APP_URL || "http://localhost:3456";
    return `<!doctype html><html><head><meta charset="utf-8"><title>I.STORE payment</title>
      <style>body{font-family:sans-serif;background:#f4f6fa;display:grid;place-items:center;min-height:100vh;margin:0}main{background:#fff;padding:32px;border-radius:16px;max-width:420px}button{background:#3b5bfe;color:#fff;border:0;border-radius:10px;height:44px;padding:0 16px;font-weight:700}</style></head>
      <body><main><p>I.STORE</p><h1>Card payment</h1><p>Order ${payment.order.number} · $${Number(payment.amount).toFixed(2)}</p>
      <p>This page stands in for the payment provider. The store does not mark the order paid by itself.</p>
      <form method="post" action="${payment.id}/confirm"><button>Confirm payment</button></form>
      <p><a href="${app}/orders/${payment.orderId}">Return without paying</a></p></main></body></html>`;
  }

  async orders(actor: Actor) {
    const where = actor.adminId
      ? {}
      : actor.userId
        ? { userId: actor.userId }
        : { id: { in: actor.receipts.length ? actor.receipts : ["none"] } };
    const rows = await this.prisma.order.findMany({ where, include: orderInclude, orderBy: { createdAt: "desc" } });
    return { orders: rows.map(presentOrder) };
  }

  async order(actor: Actor, id: string) {
    const row = await this.prisma.order.findUnique({ where: { id }, include: orderInclude });
    if (!row) throw new NotFoundException("Order not found.");
    const allowed = actor.adminId || (row.userId ? row.userId === actor.userId : actor.receipts.includes(row.id));
    if (!allowed) throw new ForbiddenException("You cannot view this order.");
    return presentOrder(row);
  }

  async updateOrder(actor: Actor, id: string, body: { status?: string; trackingNumber?: string; note?: string }) {
    const admin = await this.requireAdmin(actor);
    const before = await this.prisma.order.findUnique({ where: { id }, include: { shipment: true } });
    if (!before) throw new NotFoundException("Order not found.");
    const allowed = ["PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED", "RETURN_REQUESTED", "RETURNED", "REFUNDED", "ON_HOLD", "PACKED"];
    const status = body.status ? fromUiStatus(body.status) : undefined;
    if (status && !allowed.includes(status)) throw new BadRequestException("Unknown order status.");
    if (status === "CANCELLED" && !["CANCELLED", "REFUNDED"].includes(before.status)) await this.restoreStock(before.id, before.status);
    if (status === "REFUNDED" && before.status !== "REFUNDED") await this.restoreStock(before.id, before.status);
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: status ?? before.status,
        note: body.note ?? before.note,
        shipment: body.trackingNumber !== undefined ? { update: { trackingNumber: body.trackingNumber, status: body.status === "SHIPPED" ? "SHIPPED" : undefined } } : undefined,
      },
      include: orderInclude,
    });
    await this.audit(admin.id, "order.update", "Order", id, before.status, order.status);
    return presentOrder(order);
  }

  private async restoreStock(orderId: string, previous: string) {
    const items = await this.prisma.orderItem.findMany({ where: { orderId } });
    for (const item of items) {
      if (previous === "PENDING") {
        await this.prisma.productVariant.update({ where: { id: item.variantId }, data: { reserved: { decrement: item.qty } } });
        await this.prisma.inventoryTransaction.create({ data: { variantId: item.variantId, delta: 0, reason: "RELEASE", orderId, note: "Reservation released" } });
      } else {
        await this.prisma.productVariant.update({ where: { id: item.variantId }, data: { stock: { increment: item.qty } } });
        await this.prisma.inventoryTransaction.create({ data: { variantId: item.variantId, delta: item.qty, reason: "RETURN", orderId } });
      }
    }
  }

  async saveProduct(actor: Actor, body: ProductInput) {
    const admin = await this.requireAdmin(actor);
    if (!body.name || Number(body.salePrice) <= 0) throw new BadRequestException("Add a name and a sale price.");
    const category = await this.prisma.category.upsert({ where: { name: body.category || "Accessories" }, update: {}, create: { name: body.category || "Accessories", slug: slugify(body.category || "accessories") } });
    const colors = body.colors?.length ? body.colors : [{ name: "Black", hex: "#1C1C1E" }];
    const storages = body.storages?.length ? body.storages : ["128GB"];
    const extras = body.extras?.length ? body.extras : ["Standard"];
    const slug = uniqueSlug(body.slug || slugify(body.name));
    const data = {
      name: body.name,
      slug,
      sku: body.sku || `AP-${Math.floor(10000 + Math.random() * 89999)}`,
      brand: body.brand || "Apple",
      description: body.description || "",
      price: Number(body.price) || Number(body.salePrice),
      salePrice: Number(body.salePrice),
      extraLabel: body.extraLabel || "Finish",
      highlights: body.highlights || [],
      featured: Boolean(body.popular),
      published: body.published !== false,
      categoryId: category.id,
    };
    const existing = body.id ? await this.prisma.product.findUnique({ where: { id: body.id } }) : null;
    const product = existing
      ? await this.prisma.product.update({ where: { id: existing.id }, data: { ...data, slug: existing.slug, sku: existing.sku } })
      : await this.prisma.product.create({ data });
    if (existing) {
      await this.prisma.productImage.deleteMany({ where: { productId: product.id } });
    }
    const images = [body.image, ...(body.gallery || [])].filter(Boolean);
    await this.prisma.productImage.createMany({ data: (images.length ? images : ["/products/iphone.jpg"]).map((url, sort) => ({ productId: product.id, url: url as string, sort })) });
    const combos = colors.flatMap((color) => storages.flatMap((storage, storageIndex) => extras.map((extra) => ({ color, storage, extra, storageIndex }))));
    const each = Math.floor(Number(body.stock || 0) / combos.length);
    let remainder = Number(body.stock || 0) - each * combos.length;
    for (const combo of combos) {
      const step = ["iPhone", "iPad", "Mac"].includes(body.category) ? 100 : body.category === "Watch" ? 50 : 0;
      const price = Number(body.salePrice) + combo.storageIndex * step;
      const stock = each + (remainder > 0 ? 1 : 0);
      if (remainder > 0) remainder -= 1;
      await this.prisma.productVariant.upsert({
        where: { productId_color_storage_extra: { productId: product.id, color: combo.color.name, storage: combo.storage, extra: combo.extra } },
        create: { productId: product.id, sku: `${product.sku}-${slugify(combo.color.name)}-${slugify(combo.storage)}-${slugify(combo.extra)}`, color: combo.color.name, colorHex: combo.color.hex, storage: combo.storage, extra: combo.extra, price, stock },
        update: { price, stock, colorHex: combo.color.hex },
      });
    }
    await this.audit(admin.id, body.id ? "product.update" : "product.create", "Product", product.id, "", product.name);
    invalidateCatalogCache();
    const saved = await this.prisma.product.findUniqueOrThrow({ where: { id: product.id }, include: productInclude });
    return presentProduct(saved);
  }

  async deleteProduct(actor: Actor, id: string) {
    const admin = await this.requireAdmin(actor);
    await this.prisma.product.update({ where: { id }, data: { published: false } });
    await this.audit(admin.id, "product.archive", "Product", id, "published", "archived");
    invalidateCatalogCache();
    return { ok: true };
  }

  async inventory(actor: Actor) {
    await this.requireAdmin(actor);
    const rows = await this.prisma.productVariant.findMany({ include: { product: true }, orderBy: { sku: "asc" } });
    return {
      items: rows.map((row) => ({
        id: row.id,
        sku: row.sku,
        name: row.product.name,
        color: row.color,
        storage: row.storage,
        stock: row.stock,
        reserved: row.reserved,
        available: row.stock - row.reserved,
      })),
    };
  }

  async adjustStock(actor: Actor, variantId: string, delta: number, reason: string) {
    const admin = await this.requireAdmin(actor);
    const variant = await this.prisma.productVariant.update({ where: { id: variantId }, data: { stock: { increment: delta } } });
    if (variant.stock < 0) throw new BadRequestException("Stock cannot go below zero.");
    await this.prisma.inventoryTransaction.create({ data: { variantId, delta, reason: reason || "ADJUST", note: admin.email } });
    await this.audit(admin.id, "inventory.adjust", "ProductVariant", variantId, "", String(delta));
    return { ok: true, stock: variant.stock };
  }

  async customers(actor: Actor) {
    await this.requireAdmin(actor);
    const users = await this.prisma.user.findMany({ include: { _count: { select: { orders: true } } }, orderBy: { createdAt: "desc" } });
    return { customers: users.map((user) => ({ id: user.id, name: `${user.firstName} ${user.lastName}`, email: user.email, orders: user._count.orders, verified: user.emailVerified })) };
  }

  async coupons(actor: Actor) {
    await this.requireAdmin(actor);
    const rows = await this.prisma.coupon.findMany({ orderBy: { code: "asc" } });
    return { coupons: rows.map((row) => ({ id: row.id, code: row.code, type: row.type, amount: Number(row.amount), active: row.active })) };
  }

  async saveCoupon(actor: Actor, body: { code: string; type: string; amount: number; active?: boolean }) {
    const admin = await this.requireAdmin(actor);
    const code = body.code.trim().toUpperCase();
    if (!code) throw new BadRequestException("Coupon code is required.");
    const coupon = await this.prisma.coupon.upsert({
      where: { code },
      create: { code, type: body.type, amount: body.amount, active: body.active !== false },
      update: { type: body.type, amount: body.amount, active: body.active !== false },
    });
    await this.audit(admin.id, "coupon.save", "Coupon", coupon.id, "", `${coupon.code} ${coupon.active ? "active" : "inactive"}`);
    return { id: coupon.id, code: coupon.code, type: coupon.type, amount: Number(coupon.amount), active: coupon.active };
  }

  async settings() {
    const setting = await this.prisma.storeSetting.findUniqueOrThrow({ where: { id: "store" } });
    const sections = await this.prisma.homepageSection.findMany({ orderBy: { sort: "asc" } });
    return {
      name: setting.name,
      email: setting.email,
      phone: setting.phone,
      regNo: setting.regNo,
      taxId: setting.taxId,
      taxRate: Number(setting.taxRate),
      creditLimit: setting.creditLimit,
      creditUsed: setting.creditUsed,
      addresses: [] as [],
      onlineOnly: setting.onlineOnly,
      sections,
    };
  }

  async saveSettings(actor: Actor, body: { name: string; email: string; phone: string; regNo: string; taxId: string; creditLimit?: number }) {
    const admin = await this.requireAdmin(actor);
    const setting = await this.prisma.storeSetting.update({
      where: { id: "store" },
      data: { name: body.name, email: body.email, phone: body.phone, regNo: body.regNo, taxId: body.taxId, creditLimit: body.creditLimit ?? undefined },
    });
    await this.audit(admin.id, "settings.update", "StoreSetting", "store", "", setting.name);
    return this.settings();
  }

  async staff(actor: Actor) {
    await this.requireAdmin(actor);
    const [users, roles] = await Promise.all([
      this.prisma.adminUser.findMany({ include: { role: true } }),
      this.prisma.role.findMany(),
    ]);
    return {
      users: users.map((user) => ({ id: user.id, firstName: user.firstName, lastName: user.lastName, email: user.email, roleId: user.roleId, creditLimit: user.creditLimit, status: user.status, password: "", address: user.addressNote })),
      roles: roles.map((role) => ({ id: role.id, name: role.name, description: role.description, permissions: role.permissions, disabled: role.disabled })),
    };
  }

  async saveStaff(actor: Actor, body: { id?: string; firstName: string; lastName: string; email: string; roleId: string; creditLimit: number; status: string; password?: string; address?: string }) {
    const admin = await this.requireAdmin(actor);
    if (!body.firstName || !body.email?.includes("@")) throw new BadRequestException("First name and a valid email are required.");
    const existing = body.id ? await this.prisma.adminUser.findUnique({ where: { id: body.id } }) : null;
    if (existing) {
      const user = await this.prisma.adminUser.update({
        where: { id: existing.id },
        data: { firstName: body.firstName, lastName: body.lastName, email: body.email.toLowerCase(), roleId: body.roleId, creditLimit: Number(body.creditLimit) || 0, status: body.status, addressNote: body.address || "", ...(body.password ? { passwordHash: await bcrypt.hash(body.password, 10) } : {}) },
      });
      await this.audit(admin.id, "staff.update", "AdminUser", user.id, existing.email, user.email);
      return user.id;
    }
    const user = await this.prisma.adminUser.create({
      data: { firstName: body.firstName, lastName: body.lastName, email: body.email.toLowerCase(), roleId: body.roleId, creditLimit: Number(body.creditLimit) || 0, status: body.status || "Active", addressNote: body.address || "", passwordHash: await bcrypt.hash(body.password || "ChangeMe!2026", 10) },
    });
    await this.audit(admin.id, "staff.create", "AdminUser", user.id, "", user.email);
    return user.id;
  }

  async deleteStaff(actor: Actor, id: string) {
    const admin = await this.requireAdmin(actor);
    if (admin.id === id) throw new BadRequestException("You cannot remove the account you are using.");
    await this.prisma.adminUser.delete({ where: { id } });
    await this.audit(admin.id, "staff.delete", "AdminUser", id, "", "");
    return { ok: true };
  }

  async saveRole(actor: Actor, body: { id?: string; name: string; description: string; permissions: string[]; disabled?: boolean }) {
    const admin = await this.requireAdmin(actor);
    if (!body.name) throw new BadRequestException("Role name is required.");
    const permissions = (body.permissions || []).filter((item) => PERMISSIONS.includes(item));
    const existing = body.id ? await this.prisma.role.findUnique({ where: { id: body.id } }) : null;
    if (existing) {
      await this.prisma.role.update({ where: { id: existing.id }, data: { name: body.name, description: body.description, permissions, disabled: Boolean(body.disabled) } });
      await this.audit(admin.id, "role.update", "Role", existing.id, `${existing.permissions.length} permissions`, `${permissions.length} permissions`);
      return existing.id;
    }
    const role = await this.prisma.role.create({ data: { name: body.name, description: body.description, permissions, disabled: Boolean(body.disabled) } });
    await this.audit(admin.id, "role.create", "Role", role.id, "", role.name);
    return role.id;
  }

  async addresses(actor: Actor) {
    if (!actor.userId) throw new UnauthorizedException("Sign in to manage addresses.");
    const rows = await this.prisma.address.findMany({ where: { userId: actor.userId }, orderBy: { isDefault: "desc" } });
    return { addresses: rows };
  }

  async saveAddress(actor: Actor, body: { id?: string; label: string; line: string; city: string; postal: string; isDefault?: boolean }) {
    if (!actor.userId) throw new UnauthorizedException("Sign in to manage addresses.");
    if (!body.line || !body.city) throw new BadRequestException("Street and city are required.");
    if (body.isDefault) await this.prisma.address.updateMany({ where: { userId: actor.userId }, data: { isDefault: false } });
    if (body.id) return this.prisma.address.update({ where: { id: body.id, userId: actor.userId }, data: body });
    return this.prisma.address.create({ data: { ...body, label: body.label || "Shipping", userId: actor.userId } });
  }

  async deleteAddress(actor: Actor, id: string) {
    if (!actor.userId) throw new UnauthorizedException("Sign in to manage addresses.");
    await this.prisma.address.deleteMany({ where: { id, userId: actor.userId } });
    return { ok: true };
  }

  async subscribe(email: string) {
    if (!email.includes("@")) throw new BadRequestException("Enter a valid email.");
    await this.prisma.newsletterSubscriber.upsert({ where: { email: email.toLowerCase() }, update: {}, create: { email: email.toLowerCase() } });
    return { ok: true };
  }

  async quote(body: { name: string; email: string; amount: number; note: string }) {
    const row = await this.prisma.quoteRequest.create({ data: { name: body.name, email: body.email, amount: Number(body.amount), note: body.note || "" } });
    return { id: row.id, name: row.name, email: row.email, amount: Number(row.amount), note: row.note, date: row.createdAt.toISOString().slice(0, 10), status: row.status };
  }

  async quotes(actor: Actor) {
    await this.requireAdmin(actor);
    const rows = await this.prisma.quoteRequest.findMany({ orderBy: { createdAt: "desc" } });
    return { quotes: rows.map((row) => ({ id: row.id, name: row.name, email: row.email, amount: Number(row.amount), note: row.note, date: row.createdAt.toISOString().slice(0, 10), status: row.status })) };
  }

  async setQuote(actor: Actor, id: string, status: string) {
    const admin = await this.requireAdmin(actor);
    const quote = await this.prisma.quoteRequest.update({ where: { id }, data: { status } });
    await this.audit(admin.id, "quote.update", "QuoteRequest", id, "", quote.status);
    return { ok: true };
  }

  async audits(actor: Actor) {
    await this.requireAdmin(actor);
    const rows = await this.prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 100, include: { admin: true } });
    return { audits: rows.map((row) => ({ id: row.id, action: row.action, entity: row.entity, entityId: row.entityId, before: row.before, after: row.after, admin: row.admin?.email ?? "", date: row.createdAt.toISOString() })) };
  }

  private async mergeGuestCart(guest: string | undefined, userId: string, res: Response) {
    if (!guest) return;
    const guestCart = await this.prisma.cart.findUnique({ where: { guestToken: guest }, include: { items: true } });
    const userCart = await this.prisma.cart.upsert({ where: { userId }, update: {}, create: { userId } });
    if (guestCart) {
      for (const item of guestCart.items) {
        await this.prisma.cartItem.upsert({
          where: { cartId_variantId: { cartId: userCart.id, variantId: item.variantId } },
          create: { cartId: userCart.id, variantId: item.variantId, qty: item.qty },
          update: { qty: { increment: item.qty } },
        });
      }
      if (guestCart.couponCode) await this.prisma.cart.update({ where: { id: userCart.id }, data: { couponCode: guestCart.couponCode } });
      await this.prisma.cart.delete({ where: { id: guestCart.id } });
    }
    clearCookie(res, "istore_guest");
  }

  private async audit(adminId: string, action: string, entity: string, entityId: string, before: string, after: string) {
    await this.prisma.auditLog.create({ data: { adminId, action, entity, entityId, before, after } });
  }
}

const productInclude = { images: { orderBy: { sort: "asc" as const } }, variants: true, specs: true, reviews: { where: { status: "APPROVED" } }, category: true };
const listInclude = {
  images: { orderBy: { sort: "asc" as const }, take: 4 },
  variants: true,
  category: true,
};
const cartInclude = { items: { include: { variant: { include: { product: { include: { images: { take: 1, orderBy: { sort: "asc" as const } } } } } } } } };
const orderInclude = { items: true, payment: true, shipment: true };

const catalogCache = new Map<string, { value: { products: unknown[]; total: number; page: number; pageSize: number }; expires: number }>();

export function invalidateCatalogCache() {
  catalogCache.clear();
}

type ProductRow = {
  id: string; name: string; slug: string; sku: string; brand: string; description: string; price: { toString(): string }; salePrice: { toString(): string };
  extraLabel: string; highlights: string[]; featured: boolean; bestSeller: boolean; createdAt: Date; warranty: string;
  category: { name: string };
  images: { url: string }[];
  variants: { id: string; sku: string; color: string; colorHex: string; storage: string; extra: string; price: { toString(): string }; stock: number; reserved: number }[];
  specs?: { label: string; value: string }[];
  reviews?: { id: string; author: string; rating: number; text: string; createdAt: Date }[];
};

function presentProduct(product: ProductRow) {
  const available = product.variants.reduce((sum, variant) => sum + Math.max(0, variant.stock - variant.reserved), 0);
  const colors = unique(product.variants.map((variant) => ({ name: variant.color, hex: variant.colorHex })), (item) => item.name);
  const storages = unique(product.variants.map((variant) => variant.storage), (item) => item);
  const extras = unique(product.variants.map((variant) => variant.extra), (item) => item);
  const reviews = product.reviews ?? [];
  const rating = reviews.length ? reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length : 5;
  return {
    id: product.id,
    slug: product.slug,
    sku: product.sku,
    name: product.name,
    category: product.category.name,
    brand: product.brand,
    image: product.images[0]?.url ?? "/products/iphone.jpg",
    gallery: product.images.map((image) => image.url),
    rating: Math.round(rating * 10) / 10,
    reviewCount: reviews.length,
    price: Number(product.price),
    salePrice: Number(product.salePrice),
    stock: available,
    warehouses: [{ name: "Available online", qty: available }],
    colors,
    storages,
    extraLabel: product.extraLabel,
    extras,
    description: product.description,
    highlights: product.highlights,
    specs: product.specs ?? [],
    reviews: reviews.map((review) => ({ id: review.id, name: review.author, rating: review.rating, text: review.text, date: review.createdAt.toISOString().slice(0, 10) })),
    popular: product.featured || product.bestSeller,
    createdAt: product.createdAt.toISOString().slice(0, 10),
    variants: product.variants.map((variant) => ({ id: variant.id, sku: variant.sku, color: variant.color, storage: variant.storage, extra: variant.extra, price: Number(variant.price), stock: Math.max(0, variant.stock - variant.reserved) })),
  };
}

type CartRow = { id: string; qty: number; variant: { id: string; productId: string; color: string; storage: string; extra: string; price: { toString(): string }; product: { name: string; images: { url: string }[] } } };

function presentCartItem(item: CartRow) {
  return {
    id: item.id,
    productId: item.variant.productId,
    name: item.variant.product.name,
    image: item.variant.product.images[0]?.url ?? "",
    color: item.variant.color,
    storage: item.variant.storage,
    extra: item.variant.extra,
    unitPrice: Number(item.variant.price),
    qty: item.qty,
  };
}

function presentOrder(order: {
  id: string; number: string; createdAt: Date; customerName: string; email: string; status: string;
  subtotal: { toString(): string }; discount: { toString(): string }; shipping: { toString(): string }; tax: { toString(): string }; total: { toString(): string };
  addressLine: string; city: string; postal: string; paymentMethod: string; couponCode: string | null;
  items: CartRow extends never ? never : { id: string; productId: string; name: string; image: string; color: string; storage: string; extra: string; unitPrice: { toString(): string }; qty: number }[];
  shipment?: { trackingNumber: string; status: string } | null;
  payment?: { status: string; provider: string } | null;
}) {
  return {
    id: order.id,
    number: order.number,
    date: order.createdAt.toISOString().slice(0, 10),
    customer: order.customerName,
    email: order.email,
    status: toUiStatus(order.status),
    items: order.items.map((item) => ({ id: item.id, productId: item.productId, name: item.name, image: item.image, color: item.color, storage: item.storage, extra: item.extra, unitPrice: Number(item.unitPrice), qty: item.qty })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    shipping: Number(order.shipping),
    tax: Number(order.tax),
    total: Number(order.total),
    address: `${order.addressLine}, ${order.city} ${order.postal}`,
    paymentMethod: order.paymentMethod,
    coupon: order.couponCode ?? undefined,
    trackingNumber: order.shipment?.trackingNumber ?? "",
    paymentStatus: order.payment?.status ?? "PENDING",
  };
}

function unique<T>(items: T[], key: (item: T) => string) {
  const seen = new Set<string>();
  return items.filter((item) => {
    const id = key(item);
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

function slugify(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "item";
}

function uniqueSlug(value: string) {
  return value;
}

const UI_STATUS: Record<string, string> = {
  PENDING: "Processing",
  CONFIRMED: "Confirmed",
  PROCESSING: "Processing",
  PACKED: "Packed",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  CANCELLED: "Cancelled",
  RETURN_REQUESTED: "On Hold",
  RETURNED: "Refunded",
  REFUNDED: "Refunded",
  ON_HOLD: "On Hold",
};

function toUiStatus(status: string) {
  return UI_STATUS[status] ?? status;
}

function fromUiStatus(status: string) {
  const map: Record<string, string> = {
    Processing: "PROCESSING",
    Confirmed: "CONFIRMED",
    Packed: "PACKED",
    Shipped: "SHIPPED",
    Delivered: "DELIVERED",
    Cancelled: "CANCELLED",
    Refunded: "REFUNDED",
    "On Hold": "ON_HOLD",
  };
  return map[status] ?? status;
}

type CheckoutBody = { firstName: string; lastName: string; email: string; phone?: string; line: string; city: string; postal: string; method: string; consent: boolean };
type ProductInput = {
  id?: string; name: string; slug?: string; sku?: string; category: string; brand: string; description?: string;
  price: number; salePrice: number; stock: number; image?: string; gallery?: string[]; storages?: string[];
  colors?: { name: string; hex: string }[]; extras?: string[]; extraLabel?: string; highlights?: string[];
  popular?: boolean; published?: boolean;
};

export { PERMISSIONS };
