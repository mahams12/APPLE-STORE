"use client";

import { AnimatePresence, m } from "framer-motion";
import { Printer, X } from "lucide-react";
import Image from "next/image";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, SearchInput, Table, Tabs } from "@/components/admin/ui";
import { StatusPill } from "@/components/ui/misc";
import { ORDERS } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { fmtDate, money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Order, OrderStatus } from "@/lib/types";

type Tab = "all" | "open" | "confirmed" | "invoices";
const STATUSES: OrderStatus[] = ["Processing", "Confirmed", "Packed", "Shipped", "Delivered", "On Hold", "Cancelled", "Refunded"];
const OPEN = ["Processing", "On Hold", "Packed"];

function Orders() {
  const params = useSearchParams();
  const [tab, setTab] = useState<Tab>((params.get("tab") as Tab) || "all");
  useEffect(() => setTab((params.get("tab") as Tab) || "all"), [params]);
  const { data, setData, live, reload } = useAdminData<Order[]>("/orders", (r) => (r as { orders: Order[] }).orders, ORDERS);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<Order | null>(null);
  const [tracking, setTracking] = useState("");

  const match = (o: Order) => (tab === "open" ? OPEN.includes(o.status) : tab === "confirmed" ? ["Confirmed", "Shipped"].includes(o.status) : tab === "invoices" ? o.status === "Delivered" || o.paymentStatus === "PAID" : true);
  const list = data.filter((o) => match(o) && `${o.number} ${o.customer} ${o.email}`.toLowerCase().includes(q.toLowerCase()));

  const update = async (o: Order, patch: { status?: string; trackingNumber?: string }) => {
    try {
      if (live) {
        await api(`/admin/orders/${o.id}`, { method: "PATCH", json: patch });
        await reload();
      } else setData(data.map((x) => (x.id === o.id ? ({ ...x, ...patch } as Order) : x)));
      setSel((s) => (s && s.id === o.id ? ({ ...s, ...patch } as Order) : s));
      toast.success("Order updated");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Orders" subtitle="Track, confirm and invoice orders." actions={<SearchInput value={q} onChange={setQ} placeholder="Search orders" />} />
      <DemoBanner live={live} />
      <Tabs id="orders" value={tab} onChange={setTab} items={[{ key: "all", label: "All", count: data.length }, { key: "open", label: "Open Orders", count: data.filter((o) => OPEN.includes(o.status)).length }, { key: "confirmed", label: "Confirmed Orders" }, { key: "invoices", label: "Invoices" }]} />
      <Table head={[tab === "invoices" ? "Invoice" : "Order", "Customer", "Date", "Items", "Total", "Payment", "Status"]} empty={!list.length}>
        {list.map((o, i) => (
          <Row key={o.id} i={i} onClick={() => { setSel(o); setTracking(o.trackingNumber); }}>
            <td className="font-medium text-brand-500">{tab === "invoices" ? `INV-${o.number.replace(/\D/g, "")}` : `#${o.number}`}</td>
            <td><p className="font-medium">{o.customer}</p><p className="text-xs text-muted">{o.email}</p></td>
            <td className="text-muted">{fmtDate(o.date)}</td>
            <td>{o.items.reduce((s, x) => s + x.qty, 0)}</td>
            <td className="font-medium">{money(o.total)}</td>
            <td><StatusPill status={o.paymentStatus} /></td>
            <td><StatusPill status={o.status} /></td>
          </Row>
        ))}
      </Table>

      <AnimatePresence>
        {sel && (
          <>
            <m.div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setSel(null)} />
            <m.aside data-lenis-prevent className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
              <div className="flex items-center justify-between border-b border-line px-6 py-5"><div><h2 className="text-xl font-semibold">#{sel.number}</h2><p className="text-xs text-muted">{fmtDate(sel.date)} · {sel.paymentMethod}</p></div><div className="flex gap-1"><button onClick={() => window.print()} className="grid size-9 place-items-center rounded-full hover:bg-canvas" aria-label="Print"><Printer size={17} /></button><button onClick={() => setSel(null)} className="grid size-9 place-items-center rounded-full hover:bg-canvas" aria-label="Close"><X size={18} /></button></div></div>
              <div className="flex-1 space-y-5 p-6">
                <div><p className="label">Status</p><div className="flex flex-wrap gap-2">{STATUSES.map((s) => <button key={s} onClick={() => update(sel, { status: s })} className={`rounded-lg border px-3 py-1.5 text-sm transition-colors ${sel.status === s ? "border-brand-500 bg-brand-500 text-white" : "border-line text-muted hover:border-brand-300"}`}>{s}</button>)}</div></div>
                <div><p className="label">Tracking number</p><div className="flex gap-2"><input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} placeholder="1Z999AA10123456784" /><button onClick={() => update(sel, { trackingNumber: tracking })} className="btn btn-outline">Save</button></div></div>
                <div className="rounded-xl bg-canvas p-4 text-sm"><p className="font-medium">{sel.customer}</p><p className="text-muted">{sel.email}</p><p className="mt-2 text-muted">{sel.address}</p></div>
                <ul className="divide-y divide-line">
                  {sel.items.map((it) => (
                    <li key={it.id} className="flex items-center gap-3 py-3"><span className="relative size-12 overflow-hidden rounded-lg bg-canvas">{it.image && <Image src={it.image} alt="" fill sizes="48px" className="object-cover" />}</span><span className="flex-1 text-sm"><span className="block font-medium">{it.name}</span><span className="text-xs text-muted">{[it.color, it.storage].filter(Boolean).join(" · ")} × {it.qty}</span></span><span className="text-sm font-medium">{money(it.unitPrice * it.qty)}</span></li>
                  ))}
                </ul>
                <dl className="space-y-2 text-sm">
                  {([["Subtotal", sel.subtotal], ["Discount", -sel.discount], ["Shipping", sel.shipping], ["Tax", sel.tax]] as const).map(([l, v]) => <div key={l} className="flex justify-between"><dt className="text-muted">{l}</dt><dd>{money(v)}</dd></div>)}
                  <div className="flex justify-between border-t border-line pt-2 text-base font-semibold"><dt>Total</dt><dd>{money(sel.total)}</dd></div>
                </dl>
              </div>
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}

export default function OrdersPage() {
  return <Suspense><Orders /></Suspense>;
}
