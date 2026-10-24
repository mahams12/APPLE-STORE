import { BadRequestException, Body, Controller, Delete, Get, Headers, Inject, Param, Patch, Post, Put, Query, Req, Res, UnauthorizedException, UploadedFile, UseInterceptors } from "@nestjs/common";
import { FileInterceptor } from "@nestjs/platform-express";
import { createHmac, timingSafeEqual } from "node:crypto";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import type { Request, Response } from "express";
import { ShopService } from "./shop.service";

@Controller()
export class ApiController {
  private readonly shop: ShopService;

  constructor(@Inject(ShopService) shop: ShopService) {
    this.shop = shop;
  }

  private actor(req: Request) {
    return this.shop.actorFrom((req.cookies ?? {}) as Record<string, string | undefined>);
  }

  @Get("health")
  health() {
    return { ok: true, store: "I.STORE" };
  }

  @Get("me")
  me(@Req() req: Request) {
    return this.actor(req).then((actor) => this.shop.me(actor));
  }

  @Post("auth/register")
  async register(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: { email: string; password: string; firstName: string; lastName: string }) {
    return this.shop.register(body, await this.actor(req), res);
  }

  @Post("auth/login")
  async login(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: { email: string; password: string }) {
    return this.shop.login(body, await this.actor(req), res);
  }

  @Post("auth/logout")
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.shop.logout("customer", (req.cookies ?? {}) as Record<string, string | undefined>, res);
  }

  @Post("auth/admin/login")
  loginAdmin(@Body() body: { email: string; password: string }) {
    return this.shop.loginAdmin(body);
  }

  @Post("auth/admin/login/verify")
  verifyAdminLogin(@Res({ passthrough: true }) res: Response, @Body() body: { email: string; code: string }) {
    return this.shop.verifyAdminLogin(body, res);
  }

  @Post("auth/admin/logout")
  logoutAdmin(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.shop.logout("admin", (req.cookies ?? {}) as Record<string, string | undefined>, res);
  }

  @Post("auth/forgot")
  forgot(@Body() body: { email: string }) {
    return this.shop.forgot(body.email || "");
  }

  @Post("auth/reset")
  reset(@Body() body: { token: string; password: string }) {
    return this.shop.reset(body.token || "", body.password || "");
  }

  @Post("auth/verify")
  verify(@Body() body: { token: string }) {
    return this.shop.verify(body.token || "");
  }

  @Get("products")
  async products(@Query() query: { q?: string; category?: string; page?: string; pageSize?: string }, @Res({ passthrough: true }) res: Response) {
    const payload = await this.shop.listProducts(query);
    res.setHeader("Cache-Control", "public, max-age=15, stale-while-revalidate=60");
    return payload;
  }

  @Get("products/:slug")
  async product(@Param("slug") slug: string, @Res({ passthrough: true }) res: Response) {
    const payload = await this.shop.productBySlug(slug);
    res.setHeader("Cache-Control", "public, max-age=30, stale-while-revalidate=120");
    return payload;
  }

  @Get("cart")
  async cart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.shop.getCart(await this.actor(req), res);
  }

  @Post("cart/items")
  async addItem(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: { productId: string; slug?: string; color: string; storage: string; extra: string; qty?: number }) {
    return this.shop.addItem(await this.actor(req), res, body);
  }

  @Patch("cart/items/:id")
  async setQty(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string, @Body() body: { qty: number }) {
    return this.shop.setQty(await this.actor(req), res, id, Number(body.qty));
  }

  @Delete("cart/items/:id")
  async removeItem(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Param("id") id: string) {
    return this.shop.removeItem(await this.actor(req), res, id);
  }

  @Delete("cart")
  async clearCart(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.shop.clearCart(await this.actor(req), res);
  }

  @Post("cart/coupon")
  async coupon(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: { code: string }) {
    return this.shop.applyCoupon(await this.actor(req), res, body.code || "");
  }

  @Post("checkout")
  async checkout(@Req() req: Request, @Res({ passthrough: true }) res: Response, @Body() body: { firstName: string; lastName: string; email: string; phone?: string; line: string; city: string; postal: string; method: string; consent: boolean }, @Headers("idempotency-key") key?: string) {
    return this.shop.checkout(await this.actor(req), res, body, key);
  }

  @Get("orders")
  async orders(@Req() req: Request) {
    return this.shop.orders(await this.actor(req));
  }

  @Get("orders/:id")
  async order(@Req() req: Request, @Param("id") id: string) {
    return this.shop.order(await this.actor(req), id);
  }

  @Patch("admin/orders/:id")
  async updateOrder(@Req() req: Request, @Param("id") id: string, @Body() body: { status?: string; trackingNumber?: string; note?: string }) {
    return this.shop.updateOrder(await this.actor(req), id, body);
  }

  @Post("admin/products")
  async saveProduct(@Req() req: Request, @Body() body: Parameters<ShopService["saveProduct"]>[1]) {
    return this.shop.saveProduct(await this.actor(req), body);
  }

  @Delete("admin/products/:id")
  async deleteProduct(@Req() req: Request, @Param("id") id: string) {
    return this.shop.deleteProduct(await this.actor(req), id);
  }

  @Get("admin/inventory")
  async inventory(@Req() req: Request) {
    return this.shop.inventory(await this.actor(req));
  }

  @Post("admin/inventory/:id")
  async adjust(@Req() req: Request, @Param("id") id: string, @Body() body: { delta: number; reason?: string }) {
    return this.shop.adjustStock(await this.actor(req), id, Number(body.delta), body.reason || "ADJUST");
  }

  @Get("admin/customers")
  async customers(@Req() req: Request) {
    return this.shop.customers(await this.actor(req));
  }

  @Get("admin/coupons")
  async coupons(@Req() req: Request) {
    return this.shop.coupons(await this.actor(req));
  }

  @Post("admin/coupons")
  async saveCoupon(@Req() req: Request, @Body() body: { code: string; type: string; amount: number; active?: boolean }) {
    return this.shop.saveCoupon(await this.actor(req), body);
  }

  @Get("settings")
  settings() {
    return this.shop.settings();
  }

  @Put("admin/settings")
  async saveSettings(@Req() req: Request, @Body() body: { name: string; email: string; phone: string; regNo: string; taxId: string; creditLimit?: number }) {
    return this.shop.saveSettings(await this.actor(req), body);
  }

  @Get("admin/staff")
  async staff(@Req() req: Request) {
    return this.shop.staff(await this.actor(req));
  }

  @Post("admin/staff")
  async saveStaff(@Req() req: Request, @Body() body: Parameters<ShopService["saveStaff"]>[1]) {
    const id = await this.shop.saveStaff(await this.actor(req), body);
    return { id };
  }

  @Delete("admin/staff/:id")
  async deleteStaff(@Req() req: Request, @Param("id") id: string) {
    return this.shop.deleteStaff(await this.actor(req), id);
  }

  @Post("admin/roles")
  async saveRole(@Req() req: Request, @Body() body: { id?: string; name: string; description: string; permissions: string[]; disabled?: boolean }) {
    const id = await this.shop.saveRole(await this.actor(req), body);
    return { id };
  }

  @Get("account/addresses")
  async addresses(@Req() req: Request) {
    return this.shop.addresses(await this.actor(req));
  }

  @Post("account/addresses")
  async saveAddress(@Req() req: Request, @Body() body: { id?: string; label: string; line: string; city: string; postal: string; isDefault?: boolean }) {
    return this.shop.saveAddress(await this.actor(req), body);
  }

  @Delete("account/addresses/:id")
  async deleteAddress(@Req() req: Request, @Param("id") id: string) {
    return this.shop.deleteAddress(await this.actor(req), id);
  }

  @Post("newsletter")
  subscribe(@Body() body: { email: string }) {
    return this.shop.subscribe(body.email || "");
  }

  @Get("admin/audits")
  async audits(@Req() req: Request) {
    return this.shop.audits(await this.actor(req));
  }

  @Get("payments/hosted/:id")
  async hosted(@Param("id") id: string, @Res() res: Response) {
    res.type("html").send(await this.shop.hostedPayment(id));
  }

  @Post("payments/hosted/:id/confirm")
  async confirm(@Param("id") id: string, @Res() res: Response) {
    const orderId = await this.shop.markPaid(id, "hosted");
    res.redirect(`${process.env.APP_URL || "http://localhost:3456"}/orders/${orderId}`);
  }

  @Post("payments/webhook")
  async webhook(@Req() req: Request, @Body() body: { event?: string; paymentId?: string }) {
    const secret = process.env.PAYMENT_WEBHOOK_SECRET || "dev-webhook-secret";
    const payload = JSON.stringify(body);
    const expected = createHmac("sha256", secret).update(payload).digest("hex");
    const given = req.header("x-istore-signature") || "";
    const left = Buffer.from(expected);
    const right = Buffer.from(given);
    if (left.length !== right.length || !timingSafeEqual(left, right)) throw new UnauthorizedException("Invalid payment signature.");
    if (body.event === "payment.paid" && body.paymentId) await this.shop.markPaid(body.paymentId, "webhook");
    return { ok: true };
  }

  @Post("admin/uploads")
  @UseInterceptors(FileInterceptor("file", { limits: { fileSize: 4 * 1024 * 1024 } }))
  async upload(@Req() req: Request, @UploadedFile() file?: { mimetype: string; buffer: Buffer; originalname: string }) {
    await this.shop.requireAdmin(await this.actor(req));
    if (!file) throw new BadRequestException("Choose an image to upload.");
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) throw new BadRequestException("Use a JPEG, PNG, or WebP image.");
    const b = file.buffer;
    const isJpeg = b.length > 2 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
    const isPng = b.length > 8 && b.readUInt32BE(0) === 0x89504e47 && b.readUInt32BE(4) === 0x0d0a1a0a;
    const isWebp = b.length > 12 && b.toString("ascii", 0, 4) === "RIFF" && b.toString("ascii", 8, 12) === "WEBP";
    if (!isJpeg && !isPng && !isWebp) throw new BadRequestException("That file is not a real image.");
    const ext = file.mimetype === "image/png" ? "png" : file.mimetype === "image/webp" ? "webp" : "jpg";
    const dir = path.join(process.cwd(), "../web/public/uploads");
    mkdirSync(dir, { recursive: true });
    const name = `${Date.now()}-${Math.random().toString(16).slice(2)}.${ext}`;
    writeFileSync(path.join(dir, name), file.buffer);
    return { url: `/uploads/${name}` };
  }
}
