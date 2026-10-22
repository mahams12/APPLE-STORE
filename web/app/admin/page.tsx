"use client";

import { ClipboardList, DollarSign, FileText, Users } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { AreaChart, Donut, StatCard } from "@/components/charts/charts";
import { DemoBanner, PageHeader } from "@/components/admin/ui";
import { Reveal } from "@/components/ui/reveal";
import { StatusPill } from "@/components/ui/misc";
import { ORDERS, ORDER_SERIES, PRODUCTS, QUOTES, STAFF } from "@/lib/catalog";
import { fmtDate, money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Order, Quote } from "@/lib/types";

export default function AdminDashboard() {
  const orders = useAdminData<Order[]>("/orders", (r) => (r as { orders: Order[] }).orders, ORDERS);
  const quotes = useAdminData<Quote[]>("/admin/quotes", (r) => (r as { quotes: Quote[] }).quotes, QUOTES);
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

  return (
    <>
      <PageHeader title="Dashboard" subtitle="Your store at a glance." />
      <DemoBanner live={live} />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Revenue" value={money(revenue)} delta={8} icon={<DollarSign size={20} />} />
        <StatCard label="Orders" value={String(orders.data.length)} delta={4} icon={<ClipboardList size={20} />} />
        <StatCard label="Pending quotes" value={String(quotes.data.filter((q) => q.status === "PENDING").length)} icon={<FileText size={20} />} />
        <StatCard label="Company users" value={String(STAFF.length)} icon={<Users size={20} />} />
      </div>
      <div className="mt-6 grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <Reveal className="card p-6"><h2 className="mb-3 text-lg font-semibold">Revenue</h2><AreaChart data={series} format={money} /></Reveal>
        <Reveal className="card p-6"><h2 className="mb-4 text-lg font-semibold">Orders by status</h2><Donut data={byStatus} size={160} /></Reveal>
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
