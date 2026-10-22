"use client";

import { m } from "framer-motion";
import { Banknote, CreditCard, Landmark, Lock, ShoppingBag } from "lucide-react";
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
  { id: "Card", icon: CreditCard, body: "Pay securely on the next page" },
  { id: "Bank transfer", icon: Landmark, body: "Invoice with bank details" },
  { id: "Cash on delivery", icon: Banknote, body: "Pay when it arrives" },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, mode, reset } = useCart();
  const user = useSession((s) => s.user);
  const key = useRef(crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [method, setMethod] = useState("Card");
  const [consent, setConsent] = useState(false);
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", phone: "", line: "", city: "", postal: "" });
  const val = (k: keyof typeof f) => f[k] || (k === "firstName" ? user?.firstName : k === "lastName" ? user?.lastName : k === "email" ? user?.email : "") || "";
  const field = (k: keyof typeof f, label: string, props: React.InputHTMLAttributes<HTMLInputElement> = {}) => (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" value={val(k)} onChange={(e) => setF({ ...f, [k]: e.target.value })} required={k !== "phone"} {...props} />
    </label>
  );

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return toast.error("Please accept the order terms.");
    const body = { firstName: val("firstName"), lastName: val("lastName"), email: val("email"), phone: val("phone"), line: val("line"), city: val("city"), postal: val("postal"), method, consent };
    setBusy(true);
    try {
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

  return (
    <form onSubmit={submit} className="container-x py-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Checkout</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="card p-6">
            <div className="flex items-center justify-between"><h2 className="text-lg font-semibold">1. Contact</h2>{!user && <Link href="/account/login?next=/checkout" className="text-sm text-brand-500 hover:underline">Have an account? Sign in</Link>}</div>
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              {field("firstName", "First name", { autoComplete: "given-name" })}
              {field("lastName", "Last name", { autoComplete: "family-name" })}
              {field("email", "Email", { type: "email", autoComplete: "email" })}
              {field("phone", "Phone (optional)", { type: "tel", autoComplete: "tel" })}
            </div>
          </m.section>
          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="card p-6">
            <h2 className="text-lg font-semibold">2. Shipping address</h2>
            <div className="mt-4 grid gap-4 sm:grid-cols-[2fr_1fr_1fr]">
              {field("line", "Street address", { autoComplete: "street-address" })}
              {field("city", "City", { autoComplete: "address-level2" })}
              {field("postal", "Postal code", { autoComplete: "postal-code" })}
            </div>
          </m.section>
          <m.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }} className="card p-6">
            <h2 className="text-lg font-semibold">3. Payment</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {METHODS.map(({ id, icon: Icon, body }) => (
                <button type="button" key={id} onClick={() => setMethod(id)} aria-pressed={method === id} className={cn("relative rounded-xl border p-4 text-left transition-all duration-300", method === id ? "border-brand-500 bg-brand-50/60 shadow-[0_0_0_3px] shadow-brand-100" : "border-line hover:border-brand-300")}>
                  <Icon size={20} className={method === id ? "text-brand-500" : "text-muted"} />
                  <p className="mt-3 font-medium">{id}</p>
                  <p className="text-xs text-muted">{body}</p>
                </button>
              ))}
            </div>
            <label className="mt-5 flex cursor-pointer items-start gap-3 text-sm text-muted">
              <input type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-4 accent-brand-500" />
              I agree to the terms of sale, shipping and returns policy.
            </label>
          </m.section>
        </div>
        <div className="lg:sticky lg:top-36">
          <Summary cta={<button disabled={busy} className="btn btn-primary mt-6 h-12 w-full text-base"><Lock size={16} /> {busy ? "Placing order…" : method === "Card" ? "Continue to payment" : "Place order"}</button>} />
          <p className="mt-3 text-center text-xs text-muted">{mode === "local" ? "Demo mode — the API is offline, orders are saved in this browser." : "Payments are encrypted and processed securely."}</p>
        </div>
      </div>
    </form>
  );
}
