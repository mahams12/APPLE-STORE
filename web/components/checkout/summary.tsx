"use client";

import { m } from "framer-motion";
import { Tag } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { useCart } from "@/lib/cart-store";
import { errorMessage } from "@/lib/client";
import { money } from "@/lib/format";

export function Summary({ cta }: { cta?: React.ReactNode }) {
  const { cart, coupon, busy } = useCart();
  const [code, setCode] = useState("");
  const t = cart.totals;
  const apply = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await coupon(code);
      toast.success(code ? `Coupon ${code.toUpperCase()} applied` : "Coupon removed");
      setCode("");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const rows: [string, string, string?][] = [
    ["Subtotal", money(t.subtotal)],
    ...(t.discount ? [["Discount" + (cart.coupon ? ` (${cart.coupon})` : ""), `-${money(t.discount)}`, "text-success"] as [string, string, string]] : []),
    ["Shipping", t.shipping ? money(t.shipping) : "Free"],
    ["Tax", money(t.tax)],
  ];
  return (
    <div className="card p-6">
      <h2 className="text-xl font-medium">Order Summary</h2>
      <form onSubmit={apply} className="mt-5 flex gap-2">
        <div className="relative flex-1">
          <Tag size={15} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
          <input className="input h-11 pl-10 uppercase placeholder:normal-case" placeholder="Coupon code (try APPLE10)" value={code} onChange={(e) => setCode(e.target.value)} aria-label="Coupon code" />
        </div>
        <button disabled={busy || !code} className="btn btn-outline h-11">Apply</button>
      </form>
      {cart.coupon && <button onClick={() => coupon("").catch(() => {})} className="mt-2 text-xs text-muted hover:text-danger">Remove coupon {cart.coupon}</button>}
      <dl className="mt-5 space-y-3 text-sm">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex justify-between"><dt className="text-muted">{label}</dt><dd className={tone}>{value}</dd></div>
        ))}
        <div className="flex justify-between border-t border-line pt-4 text-lg font-semibold"><dt>Total</dt><dd><m.span key={t.total} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block">{money(t.total)}</m.span></dd></div>
      </dl>
      {cta}
    </div>
  );
}
