"use client";

import { AnimatePresence, m } from "framer-motion";
import { LogOut, MapPin, Package, Plus, Trash2, User } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { EmptyState, Skeleton, StatusPill } from "@/components/ui/misc";
import { loadLocalOrders } from "@/lib/cart-store";
import { api, errorMessage } from "@/lib/client";
import { cn, money, fmtDate } from "@/lib/format";
import { useSession } from "@/lib/session-store";
import type { Address, Order } from "@/lib/types";

type Tab = "orders" | "addresses" | "profile";

export default function AccountPage() {
  const router = useRouter();
  const { user, ready, logout } = useSession();
  const [tab, setTab] = useState<Tab>("orders");
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ label: "Home", line: "", city: "", postal: "", isDefault: false });

  const loadAddresses = useCallback(() => api<Address[] | { addresses: Address[] }>("/account/addresses").then((r) => setAddresses(Array.isArray(r) ? r : r.addresses)).catch(() => {}), []);

  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setOrders(loadLocalOrders());
      return;
    }
    api<{ orders: Order[] }>("/orders").then((r) => setOrders(r.orders)).catch(() => setOrders(loadLocalOrders()));
    void loadAddresses();
  }, [ready, user, loadAddresses]);

  const saveAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api("/account/addresses", { method: "POST", json: form });
      toast.success("Address saved");
      setAdding(false);
      setForm({ label: "Home", line: "", city: "", postal: "", isDefault: false });
      void loadAddresses();
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const removeAddress = async (id: string) => {
    try {
      await api(`/account/addresses/${id}`, { method: "DELETE" });
      setAddresses((list) => list.filter((a) => a.id !== id));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  if (!ready) return <div className="container-x py-10"><Skeleton className="h-96" /></div>;

  const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
    { key: "orders", label: "Orders", icon: Package },
    ...(user ? [{ key: "addresses" as Tab, label: "Addresses", icon: MapPin }, { key: "profile" as Tab, label: "Profile", icon: User }] : []),
  ];

  return (
    <div className="container-x py-8">
      <div className="grid items-start gap-6 lg:grid-cols-[260px_1fr] [&>*]:min-w-0">
        <aside className="card p-5 lg:sticky lg:top-36">
          <div className="flex items-center gap-3">
            <span className="grid size-12 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet font-semibold text-white">{user ? `${user.firstName[0]}${user.lastName[0]}` : <User size={18} />}</span>
            <div className="min-w-0"><p className="truncate font-medium">{user ? `${user.firstName} ${user.lastName}` : "Guest"}</p><p className="truncate text-xs text-muted">{user?.email ?? "Not signed in"}</p></div>
          </div>
          <nav className="mt-5 space-y-1">
            {TABS.map(({ key, label, icon: Icon }) => (
              <button key={key} onClick={() => setTab(key)} className={cn("relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors", tab === key ? "text-brand-500" : "text-muted hover:text-ink")}>
                {tab === key && <m.span layoutId="acct-tab" className="absolute inset-0 rounded-lg bg-brand-50" />}
                <Icon size={16} className="relative" /><span className="relative">{label}</span>
              </button>
            ))}
            {user ? (
              <button onClick={async () => { await logout(); router.push("/"); }} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-danger hover:bg-danger/5"><LogOut size={16} /> Sign out</button>
            ) : (
              <Link href="/account/login" className="btn btn-primary mt-3 w-full">Sign in</Link>
            )}
          </nav>
        </aside>

        <AnimatePresence mode="wait">
          <m.section key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.25 }} className="card p-6">
            {tab === "orders" && (
              <>
                <h1 className="mb-4 text-2xl font-semibold">My orders</h1>
                {!user && <p className="mb-4 rounded-xl bg-canvas p-3 text-sm text-muted">Orders placed on this device as a guest. <Link href="/account/login" className="text-brand-500">Sign in</Link> to see your full history.</p>}
                {orders === null ? <Skeleton className="h-40" /> : orders.length === 0 ? (
                  <EmptyState icon={<Package />} title="No orders yet" action={<Link href="/shop" className="btn btn-primary">Start shopping</Link>} />
                ) : (
                  <ul className="divide-y divide-line">
                    {orders.map((o) => (
                      <li key={o.id}>
                        <Link href={`/orders/${o.id}`} className="flex flex-wrap items-center gap-4 rounded-lg px-2 py-4 transition-colors hover:bg-canvas/60">
                          <div className="flex-1"><p className="font-medium">#{o.number}</p><p className="text-xs text-muted">{fmtDate(o.date)} · {o.items.reduce((s, i) => s + i.qty, 0)} items</p></div>
                          <StatusPill status={o.status} />
                          <p className="w-24 text-right font-semibold">{money(o.total)}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {tab === "addresses" && (
              <>
                <div className="mb-4 flex items-center justify-between"><h1 className="text-2xl font-semibold">Addresses</h1><button onClick={() => setAdding((v) => !v)} className="btn btn-outline h-9"><Plus size={15} /> Add</button></div>
                <AnimatePresence>
                  {adding && (
                    <m.form onSubmit={saveAddress} initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                      <div className="mb-5 grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-2">
                        <input className="input bg-white" placeholder="Label" value={form.label} onChange={(e) => setForm({ ...form, label: e.target.value })} required />
                        <input className="input bg-white" placeholder="Street address" value={form.line} onChange={(e) => setForm({ ...form, line: e.target.value })} required />
                        <input className="input bg-white" placeholder="City" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} required />
                        <input className="input bg-white" placeholder="Postal code" value={form.postal} onChange={(e) => setForm({ ...form, postal: e.target.value })} required />
                        <label className="flex items-center gap-2 text-sm"><input type="checkbox" className="accent-brand-500" checked={form.isDefault} onChange={(e) => setForm({ ...form, isDefault: e.target.checked })} /> Default address</label>
                        <button className="btn btn-primary">Save address</button>
                      </div>
                    </m.form>
                  )}
                </AnimatePresence>
                {addresses.length === 0 ? <EmptyState icon={<MapPin />} title="No saved addresses" /> : (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {addresses.map((a) => (
                      <div key={a.id} className="relative rounded-xl border border-line p-4">
                        <p className="font-medium">{a.label} {a.isDefault && <span className="chip ml-1 bg-brand-50 text-brand-500">Default</span>}</p>
                        <p className="mt-1 text-sm text-muted">{a.line}<br />{a.city} {a.postal}</p>
                        <button onClick={() => removeAddress(a.id)} className="absolute top-3 right-3 p-1 text-muted hover:text-danger" aria-label="Delete address"><Trash2 size={15} /></button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
            {tab === "profile" && user && (
              <>
                <h1 className="mb-4 text-2xl font-semibold">Profile</h1>
                <dl className="grid gap-4 sm:grid-cols-2">
                  {[["First name", user.firstName], ["Last name", user.lastName], ["Email", user.email], ["Phone", user.phone || "—"]].map(([l, v]) => (
                    <div key={l} className="rounded-xl bg-canvas p-4"><dt className="text-xs text-muted">{l}</dt><dd className="mt-1 font-medium">{v}</dd></div>
                  ))}
                </dl>
                <p className={cn("mt-4 text-sm", user.emailVerified ? "text-success" : "text-star")}>{user.emailVerified ? "✓ Email verified" : "Email not verified yet — check your inbox."}</p>
              </>
            )}
          </m.section>
        </AnimatePresence>
      </div>
    </div>
  );
}
