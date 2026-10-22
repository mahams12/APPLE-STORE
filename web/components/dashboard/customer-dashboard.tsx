"use client";

import { m } from "framer-motion";
import { ArrowRight, CreditCard, Package, ShoppingBag, Wallet } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { BestSelling } from "@/components/home/best-selling";
import { AreaChart, Donut, StatCard } from "@/components/charts/charts";
import { QuoteForm } from "@/components/checkout/quote-form";
import { Summary } from "@/components/checkout/summary";
import { Newsletter } from "@/components/site/newsletter";
import { Reveal } from "@/components/ui/reveal";
import { StatusPill } from "@/components/ui/misc";
import { loadLocalOrders, useCart } from "@/lib/cart-store";
import { COMPANY, ORDERS, ORDER_SERIES } from "@/lib/catalog";
import { api } from "@/lib/client";
import { money, fmtDate } from "@/lib/format";
import { useSession } from "@/lib/session-store";
import type { Order, Product } from "@/lib/types";

export function CustomerDashboard({ products }: { products: Product[] }) {
  const user = useSession((s) => s.user);
  const cart = useCart((s) => s.cart);
  const [orders, setOrders] = useState<Order[]>(ORDERS);
  const [demo, setDemo] = useState(true);

  useEffect(() => {
    if (!user) {
      setOrders([...loadLocalOrders(), ...ORDERS]);
      setDemo(true);
      return;
    }
    api<{ orders: Order[] }>("/orders")
      .then((r) => { setOrders(r.orders); setDemo(false); })
      .catch(() => setOrders([...loadLocalOrders(), ...ORDERS]));
  }, [user]);

  const open = orders.filter((o) => !["Delivered", "Cancelled", "Refunded"].includes(o.status));
  const spent = orders.reduce((s, o) => s + o.total, 0);
  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    orders.forEach((o) => o.items.forEach((i) => {
      const cat = products.find((p) => p.id === i.productId)?.category ?? "Other";
      map.set(cat, (map.get(cat) ?? 0) + i.qty);
    }));
    const data = Array.from(map, ([label, value]) => ({ label, value }));
    return data.length ? data : [{ label: "iPhone", value: 12 }, { label: "Mac", value: 7 }, { label: "AirPods", value: 9 }, { label: "Watch", value: 4 }];
  }, [orders, products]);
  const series = useMemo(() => {
    if (demo) return ORDER_SERIES;
    const months = Array(12).fill(0);
    orders.forEach((o) => { months[new Date(o.date).getMonth()] += o.total; });
    return months.some(Boolean) ? months : ORDER_SERIES;
  }, [orders, demo]);

  return (
    <div className="container-x space-y-6 py-8">
      <m.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-sm text-muted">Welcome back{user ? `, ${user.firstName}` : ""}</p>
          <h1 className="text-3xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        {demo && <span className="chip bg-star/10 text-star">{user ? "Showing demo data" : "Demo data — sign in to see your orders"}</span>}
      </m.div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open orders" value={String(open.length)} icon={<Package size={20} />} />
        <StatCard label="Total spent" value={money(spent)} delta={12} icon={<Wallet size={20} />} />
        <StatCard label="In cart" value={`${cart.items.length} items`} icon={<ShoppingBag size={20} />} />
        <StatCard label="Credit available" value={money(COMPANY.creditLimit - COMPANY.creditUsed)} icon={<CreditCard size={20} />} />
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[1fr_380px] [&>*]:min-w-0">
        <div className="space-y-6">
          <Reveal className="card overflow-x-auto">
            <div className="flex items-center justify-between p-6 pb-3"><h2 className="text-xl font-medium">Open Orders</h2><Link href="/account" className="text-sm text-brand-500 hover:underline">See All</Link></div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead><tr className="text-left text-muted"><th className="px-6 py-3 font-normal">Order</th><th className="font-normal">Date</th><th className="font-normal">Items</th><th className="font-normal">Total</th><th className="pr-6 font-normal">Status</th></tr></thead>
                <tbody>
                  {open.slice(0, 5).map((o, i) => (
                    <m.tr key={o.id} initial={{ opacity: 0, x: -10 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.05 }} className="border-t border-line transition-colors hover:bg-canvas/60">
                      <td className="px-6 py-3.5"><Link href={`/orders/${o.id}`} className="font-medium text-brand-500 hover:underline">#{o.number}</Link></td>
                      <td>{fmtDate(o.date)}</td>
                      <td>
                        <div className="flex -space-x-2">{o.items.slice(0, 3).map((it) => <span key={it.id} className="relative size-8 overflow-hidden rounded-full ring-2 ring-white">{it.image && <Image src={it.image} alt="" fill sizes="32px" className="object-cover" />}</span>)}</div>
                      </td>
                      <td className="font-medium">{money(o.total)}</td>
                      <td className="pr-6"><StatusPill status={o.status} /></td>
                    </m.tr>
                  ))}
                  {open.length === 0 && <tr><td colSpan={5} className="px-6 py-10 text-center text-muted">No open orders.</td></tr>}
                </tbody>
              </table>
            </div>
          </Reveal>

          <Reveal className="card p-6">
            <div className="mb-4 flex items-center justify-between"><h2 className="text-xl font-medium">Products</h2><Link href="/shop" className="text-sm text-brand-500 hover:underline">Shop all</Link></div>
            <ul className="divide-y divide-line">
              {products.slice(0, 5).map((p) => (
                <li key={p.id} className="group flex items-center gap-4 py-3">
                  <div className="relative size-14 shrink-0 overflow-hidden rounded-xl bg-canvas"><Image src={p.image} alt={p.name} fill sizes="56px" className="object-cover transition-transform duration-500 group-hover:scale-110" /></div>
                  <div className="min-w-0 flex-1"><p className="truncate font-medium">{p.name}</p><p className="text-xs text-muted">{p.category} · {p.stock > 0 ? `${p.stock} in stock` : "Out of stock"}</p></div>
                  <div className="text-right text-sm"><p className="text-brand-500">{money(p.salePrice)}</p><p className="text-xs text-muted line-through">{money(p.price)}</p></div>
                  <Link href={`/product/${p.slug}`} className="grid size-9 place-items-center rounded-full bg-canvas text-muted transition-all group-hover:bg-brand-500 group-hover:text-white" aria-label={`View ${p.name}`}><ArrowRight size={16} /></Link>
                </li>
              ))}
            </ul>
          </Reveal>

          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr] [&>*]:min-w-0">
            <Reveal className="card p-6">
              <div className="mb-2 flex items-center justify-between"><h2 className="text-xl font-medium">Orders</h2><span className="text-xs text-muted">{demo ? "Orders / month" : "Spend / month"}</span></div>
              <AreaChart data={series} format={(v) => (demo ? `${v} orders` : money(v))} />
            </Reveal>
            <Reveal className="card p-6">
              <h2 className="mb-4 text-xl font-medium">Orders by category</h2>
              <Donut data={byCategory} size={160} />
            </Reveal>
          </div>
        </div>

        <div className="space-y-6 xl:sticky xl:top-36">
          <Summary cta={cart.items.length ? <Link href="/checkout" className="btn btn-primary mt-6 h-12 w-full text-base">Buy Now</Link> : <Link href="/shop" className="btn btn-outline mt-6 w-full">Add products</Link>} />
          <div id="quote" className="card p-6"><QuoteForm suggested={cart.totals.total} /></div>
        </div>
      </div>

      <Reveal><BestSelling products={products} /></Reveal>
      <Reveal><Newsletter /></Reveal>
    </div>
  );
}
