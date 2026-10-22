"use client";

import { AlertTriangle, ClipboardList, DollarSign, Package, PackageX } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { AreaChart, Donut, StatCard } from "@/components/charts/charts";
import { DemoBanner, PageHeader } from "@/components/admin/ui";
import { Reveal } from "@/components/ui/reveal";
import { StatusPill } from "@/components/ui/misc";
import { ORDERS, ORDER_SERIES, PRODUCTS } from "@/lib/catalog";
import { fmtDate, money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { InventoryRow, Order } from "@/lib/types";

const LOW_STOCK = 5;

export default function AdminDashboard() {
  const orders = useAdminData<Order[]>("/orders", (r) => (r as { orders: Order[] }).orders, ORDERS);
  const inventory = useAdminData<InventoryRow[]>("/admin/inventory", (r) => (r as { inventory: InventoryRow[] }).inventory ?? (r as { items: InventoryRow[] }).items ?? [], []);
  const live = orders.live;
  const revenue = orders.data.reduce((s, o) => s + (o.status === "Cancelled" || o.status === "Refunded" ? 0 : o.total), 0);
  const series = useMemo(() => {
    if (!live) return ORDER_SERIES.map((v) => v * 42);
    const m = Array(12).fill(0);
    orders.data.forEach((o) => { m[new Date(o.date).getMonth()] += o.total; });
    return m;
  }, [orders.data, live]);
  const byStatus = useMemo(() => {
    const map = new Map<string, number>();
    orders.data.forEach((o) => map.set(o.status, (map.get(o.status) ?? 0) + 1));
    return Array.from(map, ([label, value]) => ({ label, value }));
  }, [orders.data]);
  const top = useMemo(() => {
    const map = new Map<string, { name: string; image: string; qty: number; revenue: number }>();
    orders.data.forEach((o) => o.items.forEach((i) => {
      const cur = map.get(i.productId) ?? { name: i.name, image: i.image, qty: 0, revenue: 0 };
      cur.qty += i.qty; cur.revenue += i.qty * i.unitPrice;
      map.set(i.productId, cur);
    }));
    return Array.from(map.values()).sort((a, b) => b.revenue - a.revenue).slice(0, 5);
  }, [orders.data]);
  const stock = useMemo(() => {
    const rows = inventory.data;
    const low = rows.filter((r) => r.available > 0 && r.available <= LOW_STOCK);
    const out = rows.filter((r) => r.available <= 0);
    return { rows, low, out, inStock: rows.length - out.length };
  }, [inventory.data]);
  return (
    <>
      <PageHeader title="Dashboard" subtitle="Sales and stock at a glance." />
      <DemoBanner live={live} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(revenue)} delta={8} icon={<DollarSign size={20} />} />
        <StatCard label="Orders" value={String(orders.data.length)} delta={4} icon={<ClipboardList size={20} />} />
        <StatCard label="Variants in stock" value={String(stock.inStock)} icon={<Package size={20} />} />
        <StatCard label="Out of stock" value={String(stock.out.length)} icon={<PackageX size={20} />} />
      </div>
      {stock.out.length + stock.low.length > 0 && (
        <Reveal className="mt-6 card border-danger/20 bg-danger/[0.03] p-5">
          <div className="flex items-center gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-danger/10 text-danger"><AlertTriangle size={18} /></span>
            <p className="text-sm">
              <span className="font-semibold">{stock.out.length} out of stock</span>
              {stock.low.length > 0 && <>, <span className="font-semibold">{stock.low.length} low on stock</span></>}
              {" "}— restock them in <Link href="/admin/inventory" className="font-medium text-brand-500 hover:underline">Inventory</Link>.
            </p>
          </div>
          <ul className="mt-3 divide-y divide-line text-sm">
            {stock.out.concat(stock.low).slice(0, 5).map((r) => (
              <li key={r.id} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">{r.name} <span className="text-muted">· {r.color}{r.storage ? ` ${r.storage}` : ""}</span></span>
                <span className={`chip shrink-0 ${r.available <= 0 ? "bg-danger/10 text-danger" : "bg-star/10 text-star"}`}>{r.available <= 0 ? "Out" : `${r.available} left`}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      )}
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Reveal className="card p-6"><h2 className="mb-3 text-lg font-semibold">Revenue</h2><AreaChart data={series} format={money} /></Reveal>
        <Reveal className="card p-6"><h2 className="mb-4 text-lg font-semibold">Orders by status</h2><Donut data={byStatus.length ? byStatus : [{ label: "No orders", value: 1 }]} size={160} /></Reveal>
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Reveal className="card overflow-hidden">
          <div className="flex items-center justify-between p-6 pb-3"><h2 className="text-lg font-semibold">Recent orders</h2><Link href="/admin/orders" className="text-sm text-brand-500 hover:underline">View all</Link></div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-sm">
              <tbody className="divide-y divide-line">
                {orders.data.slice(0, 6).map((o) => (
                  <tr key={o.id} className="hover:bg-canvas/50 [&>td]:py-3.5"><td className="pl-6 font-medium">#{o.number}</td><td>{o.customer}</td><td className="text-muted">{fmtDate(o.date)}</td><td className="font-medium">{money(o.total)}</td><td className="pr-6"><StatusPill status={o.status} /></td></tr>
                ))}
              </tbody>
            </table>
          </div>
        </Reveal>
        <Reveal className="card p-6">
          <h2 className="mb-4 text-lg font-semibold">Top products</h2>
          <ul className="space-y-3">
            {(top.length ? top : PRODUCTS.slice(0, 5).map((p) => ({ name: p.name, image: p.image, qty: 0, revenue: 0 }))).map((p) => (
              <li key={p.name} className="flex items-center gap-3">
                <span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-canvas">{p.image && <Image src={p.image} alt="" fill sizes="44px" className="object-cover" />}</span>
                <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{p.name}</span><span className="text-xs text-muted">{p.qty} sold</span></span>
                <span className="text-sm font-semibold">{money(p.revenue)}</span>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </>
  );
}
