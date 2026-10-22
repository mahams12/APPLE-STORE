"use client";

import { m } from "framer-motion";
import { Check, CircleCheckBig, Package, PackageCheck, Truck } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { EmptyState, Skeleton, StatusPill } from "@/components/ui/misc";
import { loadLocalOrders } from "@/lib/cart-store";
import { ORDERS } from "@/lib/catalog";
import { api } from "@/lib/client";
import { cn, money, fmtDate } from "@/lib/format";
import type { Order } from "@/lib/types";

const STEPS = [
  { key: "Processing", icon: Package },
  { key: "Confirmed", icon: CircleCheckBig },
  { key: "Packed", icon: PackageCheck },
  { key: "Shipped", icon: Truck },
  { key: "Delivered", icon: Check },
];

export default function OrderPage() {
  const { id } = useParams<{ id: string }>();
  const placed = useSearchParams().get("placed");
  const [order, setOrder] = useState<Order | null | undefined>(undefined);

  useEffect(() => {
    const local = () => loadLocalOrders().find((o) => o.id === id) ?? ORDERS.find((o) => o.id === id) ?? null;
    if (id.startsWith("local-")) return setOrder(local());
    api<Order>(`/orders/${id}`).then(setOrder).catch(() => setOrder(local()));
  }, [id]);

  if (order === undefined) return <div className="container-x space-y-4 py-10"><Skeleton className="h-32" /><Skeleton className="h-64" /></div>;
  if (!order) return <div className="container-x py-10"><div className="card"><EmptyState icon={<Package />} title="Order not found" body="Sign in with the account that placed this order." action={<Link href="/account/login" className="btn btn-primary">Sign in</Link>} /></div></div>;

  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  return (
    <div className="container-x py-8">
      {placed && (
        <m.div initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} className="card mb-6 flex items-center gap-4 border-success/30 bg-success/5 p-5">
          <m.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: "spring", delay: 0.15 }} className="grid size-12 shrink-0 place-items-center rounded-full bg-success text-white"><Check /></m.span>
          <div><p className="text-lg font-semibold">Thank you! Your order is placed.</p><p className="text-sm text-muted">A confirmation has been sent to {order.email}.</p></div>
        </m.div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Order</p>
          <h1 className="text-3xl font-semibold tracking-tight">#{order.number}</h1>
          <p className="mt-1 text-sm text-muted">Placed {fmtDate(order.date)}</p>
        </div>
        <StatusPill status={order.status} className="text-sm" />
      </div>

      {stepIndex >= 0 && (
        <div className="card mt-6 p-6">
          <ol className="relative grid grid-cols-5">
            <div className="absolute top-5 right-[10%] left-[10%] h-0.5 bg-line" />
            <m.div className="absolute top-5 left-[10%] h-0.5 bg-brand-500" initial={{ width: 0 }} animate={{ width: `${(stepIndex / (STEPS.length - 1)) * 80}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
            {STEPS.map(({ key, icon: Icon }, i) => (
              <li key={key} className="relative flex flex-col items-center gap-2 text-center">
                <m.span initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 0.1 * i }} className={cn("grid size-10 place-items-center rounded-full border-2 bg-white", i <= stepIndex ? "border-brand-500 text-brand-500" : "border-line text-muted")}><Icon size={17} /></m.span>
                <span className={cn("text-xs sm:text-sm", i <= stepIndex ? "text-ink" : "text-muted")}>{key}</span>
              </li>
            ))}
          </ol>
          {order.trackingNumber && <p className="mt-5 text-center text-sm text-muted">Tracking number <span className="font-medium text-ink">{order.trackingNumber}</span></p>}
        </div>
      )}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[1fr_340px]">
        <div className="card divide-y divide-line p-2 sm:p-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center gap-4 p-3">
              <div className="relative size-16 shrink-0 overflow-hidden rounded-xl bg-canvas">{item.image && <Image src={item.image} alt={item.name} fill sizes="64px" className="object-cover" />}</div>
              <div className="min-w-0 flex-1"><p className="font-medium">{item.name}</p><p className="text-sm text-muted">{[item.color, item.storage, item.extra].filter(Boolean).join(" · ")} × {item.qty}</p></div>
              <p className="font-semibold">{money(item.unitPrice * item.qty)}</p>
            </div>
          ))}
        </div>
        <div className="card space-y-3 p-6 text-sm">
          <h2 className="mb-2 text-lg font-semibold">Summary</h2>
          {([["Subtotal", money(order.subtotal)], ["Discount", order.discount ? `-${money(order.discount)}` : "—"], ["Shipping", order.shipping ? money(order.shipping) : "Free"], ["Tax", money(order.tax)]] as const).map(([l, v]) => (
            <div key={l} className="flex justify-between"><span className="text-muted">{l}</span><span>{v}</span></div>
          ))}
          <div className="flex justify-between border-t border-line pt-3 text-base font-semibold"><span>Total</span><span>{money(order.total)}</span></div>
          <div className="border-t border-line pt-3"><p className="text-muted">Ship to</p><p>{order.customer}<br />{order.address}</p></div>
          <div className="flex justify-between"><span className="text-muted">Payment</span><span>{order.paymentMethod} · <StatusPill status={order.paymentStatus} /></span></div>
        </div>
      </div>
      <div className="mt-6 flex gap-3"><Link href="/shop" className="btn btn-primary">Continue shopping</Link><Link href="/account" className="btn btn-outline">All orders</Link></div>
    </div>
  );
}
