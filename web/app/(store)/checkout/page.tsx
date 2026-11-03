"use client";

import { m } from "framer-motion";
import { Banknote, CreditCard, Landmark, Lock, ShoppingBag, Truck } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { Summary } from "@/components/checkout/summary";
import { EmptyState } from "@/components/ui/misc";
import { useCart, saveLocalOrder } from "@/lib/cart-store";
import { api, ApiError, errorMessage } from "@/lib/client";
import { cn } from "@/lib/format";
import { useSession } from "@/lib/session-store";
import type { Order } from "@/lib/types";

const METHODS = [
  { id: "Cash on delivery", icon: Banknote, body: "Pay when it arrives", note: "COD (Cash on Delivery) lets you pay when the product is delivered to your doorstep. The courier hands over the parcel once payment is received." },
  { id: "Card", icon: CreditCard, body: "Pay securely on the next page", note: "You'll be redirected to our secure Safepay page to complete your card payment." },
  { id: "Bank transfer", icon: Landmark, body: "Invoice with bank details", note: "An invoice with our bank details will be emailed to you. Your order ships after the transfer clears." },
];

const COUNTRIES = ["Pakistan"];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, mode, reset } = useCart();
  const user = useSession((s) => s.user);
  const key = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("Cash on delivery");
  const [newsletter, setNewsletter] = useState(false);
  const [saveInfo, setSaveInfo] = useState(false);
  const [billingSame, setBillingSame] = useState(true);
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", line: "", line2: "", company: "", city: "", postal: "", country: "Pakistan" });
  const [b, setB] = useState({ firstName: "", lastName: "", line: "", line2: "", city: "", postal: "", country: "Pakistan" });
  const val = (k: keyof typeof f) => f[k] || (k === "firstName" ? user?.firstName : k === "lastName" ? user?.lastName : k === "email" ? user?.email : "") || "";

  type Form = Record<string, string>;
  const field = <T extends Form>(form: T, set: React.Dispatch<React.SetStateAction<T>>, k: keyof T & string, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="sr-only">{label}</span>
      <input className="input" placeholder={label} value={form === (f as Form) ? val(k as keyof typeof f) : form[k]} onChange={(e) => set({ ...form, [k]: e.target.value })} {...props} />
    </label>
  );
  const countrySelect = <T extends Form>(form: T, _set: React.Dispatch<React.SetStateAction<T>>) => (
    <label className="block">
      <span className="label">Country/Region — we deliver across Pakistan</span>
      <select className="input" value={form.country} disabled>
        {COUNTRIES.map((c) => <option key={c}>{c}</option>)}
      </select>
    </label>
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const shipping = {
      firstName: val("firstName"), lastName: val("lastName"), email: val("email"), phone: val("phone"),
      line: val("line"), line2: val("line2"), company: val("company"), city: val("city"), postal: val("postal"), country: val("country"),
    };
    if (!shipping.firstName.trim() || !shipping.lastName.trim() || !shipping.line.trim() || !shipping.city.trim() || !shipping.phone.trim())
      return toast.error("Please complete your name, address, city and phone.");
    const note = billingSame ? "" : `Billing: ${b.firstName} ${b.lastName}, ${b.line}${b.line2 ? ", " + b.line2 : ""}, ${b.city} ${b.postal}, ${b.country}`.trim();
    const body = { ...shipping, method, consent: true, note };
    setBusy(true);
    try {
      if (newsletter) api("/newsletter", { method: "POST", json: { email: shipping.email } }).catch(() => {});
      if (saveInfo) localStorage.setItem("istore.checkout", JSON.stringify({ f }));
      if (mode === "api") {
        try {
          const res = await api<{ order: Order; paymentUrl: string | null }>("/checkout", { method: "POST", json: body, headers: { "Idempotency-Key": key.current } });
          reset();
          if (res.paymentUrl) window.location.href = res.paymentUrl;
          else router.push(`/orders/${res.order.id}?placed=1`);
          return;
        } catch (error) {
          if (!(error instanceof ApiError && error.offline)) throw error;
        }
      }
      const id = `local-${Date.now()}`;
      saveLocalOrder({
        id, number: `IS-${String(Date.now()).slice(-6)}`, date: new Date().toISOString(), customer: `${body.firstName} ${body.lastName}`, email: body.email,
        status: "Processing", items: cart.items, subtotal: cart.totals.subtotal, discount: cart.totals.discount, shipping: cart.totals.shipping, tax: cart.totals.tax, total: cart.totals.total,
        address: `${body.line}, ${body.city} ${body.postal}`, paymentMethod: method, coupon: cart.coupon, trackingNumber: "", paymentStatus: method === "Card" ? "PAID" : "PENDING",
      });
      reset();
      router.push(`/orders/${id}?placed=1`);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (!cart.items.length)
    return <div className="container-x py-10"><div className="card"><EmptyState icon={<ShoppingBag />} title="Nothing to check out" body="Your cart is empty." action={<Link href="/shop" className="btn btn-primary">Go shopping</Link>} /></div></div>;

  const radio = (checked: boolean) => (
    <span className={cn("mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2", checked ? "border-brand-500" : "border-line")}>
      {checked && <span className="size-2.5 rounded-full bg-brand-500" />}
    </span>
  );

  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Checkout</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">Contact</h2>{!user && <Link href="/account/login?next=/checkout" className="text-sm text-brand-500 hover:underline">Sign in</Link>}</div>
            <div className="mt-4 space-y-3">
              {field(f, setF, "email", "Email", { type: "email", autoComplete: "email", required: true })}
              <label className="flex cursor-pointer items-center gap-3 text-sm text-muted">
                <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} className="size-4 accent-brand-500" />
                Email me with news and offers
              </label>
            </div>
          </m.section>

          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="card p-6">
            <h2 className="text-lg font-semibold">Delivery</h2>
            <div className="mt-4 space-y-3">
              {countrySelect(f, setF)}
              <div className="grid gap-3 sm:grid-cols-2">
                {field(f, setF, "firstName", "First name", { autoComplete: "given-name", required: true })}
                {field(f, setF, "lastName", "Last name", { autoComplete: "family-name", required: true })}
              </div>
              {field(f, setF, "company", "Company (optional)", { autoComplete: "organization" })}
              {field(f, setF, "line", "Address", { autoComplete: "street-address", required: true })}
              {field(f, setF, "line2", "Apartment, suite, etc. (optional)", {})}
              <div className="grid gap-3 sm:grid-cols-2">
                {field(f, setF, "city", "City", { autoComplete: "address-level2", required: true })}
                {field(f, setF, "postal", "Postal code (optional)", { autoComplete: "postal-code" })}
              </div>
              {field(f, setF, "phone", "Phone", { type: "tel", autoComplete: "tel", required: true })}
              <label className="flex cursor-pointer items-center gap-3 text-sm text-muted">
                <input type="checkbox" checked={saveInfo} onChange={(e) => setSaveInfo(e.target.checked)} className="size-4 accent-brand-500" />
                Save this information for next time
              </label>
            </div>
          </m.section>

          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card p-6">
            <h2 className="text-lg font-semibold">Shipping method</h2>
            <div className="mt-4 flex items-center justify-between rounded-xl border border-brand-500 bg-brand-50/60 p-4">
              <span className="flex items-center gap-3 font-medium"><Truck size={18} className="text-brand-500" /> Shipping charges</span>
              <span className="font-semibold">{cart.totals.shipping ? cart.totals.shipping.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "Free"}</span>
            </div>
          </m.section>

          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="card p-6">
            <h2 className="text-lg font-semibold">Payment</h2>
            <p className="mt-1 text-sm text-muted">All transactions are secure and encrypted.</p>
            <div className="mt-4 space-y-3">
              {METHODS.map(({ id, icon: Icon, body, note }) => (
                <button type="button" key={id} onClick={() => setMethod(id)} aria-pressed={method === id} className={cn("block w-full rounded-xl border p-4 text-left transition-all duration-300", method === id ? "border-brand-500 bg-brand-50/60" : "border-line hover:border-brand-300")}>
                  <span className="flex items-center gap-3">
                    {radio(method === id)}
                    <Icon size={18} className={method === id ? "text-brand-500" : "text-muted"} />
                    <span className="font-medium">{id}</span>
                    <span className="ml-auto text-xs text-muted">{body}</span>
                  </span>
                  {method === id && <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 rounded-lg bg-white/70 p-3 text-xs leading-relaxed text-muted">{note}</m.p>}
                </button>
              ))}
            </div>
          </m.section>

          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card p-6">
            <h2 className="text-lg font-semibold">Billing address</h2>
            <div className="mt-4 space-y-3">
              <button type="button" onClick={() => setBillingSame(true)} className={cn("flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all", billingSame ? "border-brand-500 bg-brand-50/60" : "border-line hover:border-brand-300")}>
                {radio(billingSame)} <span className="font-medium">Same as shipping address</span>
              </button>
              <button type="button" onClick={() => setBillingSame(false)} className={cn("flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-all", !billingSame ? "border-brand-500 bg-brand-50/60" : "border-line hover:border-brand-300")}>
                {radio(!billingSame)} <span className="font-medium">Use a different billing address</span>
              </button>
              {!billingSame && (
                <m.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} className="space-y-3 overflow-hidden rounded-xl border border-line p-4">
                  {countrySelect(b, setB)}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {field(b, setB, "firstName", "First name", { required: true })}
                    {field(b, setB, "lastName", "Last name", { required: true })}
                  </div>
                  {field(b, setB, "line", "Address", { required: true })}
                  {field(b, setB, "line2", "Apartment, suite, etc. (optional)", {})}
                  <div className="grid gap-3 sm:grid-cols-2">
                    {field(b, setB, "city", "City", { required: true })}
                    {field(b, setB, "postal", "Postal code (optional)", {})}
                  </div>
                </m.div>
              )}
            </div>
          </m.section>
        </div>

        <div className="lg:sticky lg:top-36">
          <Summary showItems cta={<button onClick={submit} disabled={busy} className="btn btn-primary mt-6 h-12 w-full text-base"><Lock size={16} /> {busy ? "Placing order…" : "Complete order"}</button>} />
          <p className="mt-3 text-center text-xs text-muted">{mode === "local" ? "Demo mode — the API is offline, orders are saved in this browser." : "Payments are encrypted and processed securely."}</p>
        </div>
      </div>
    </div>
  );
}
