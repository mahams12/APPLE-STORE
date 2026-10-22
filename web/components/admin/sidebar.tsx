"use client";

import { AnimatePresence, m } from "framer-motion";
import { Building2, ChevronDown, ClipboardList, FileText, History, LayoutDashboard, LogOut, Package, ShieldCheck, Tag, Users, Warehouse, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Logo } from "@/components/site/logo";
import { cn } from "@/lib/format";
import { useSession } from "@/lib/session-store";

type Item = { href: string; label: string; icon: typeof Users; children?: { href: string; label: string }[] };

const NAV: Item[] = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/company", label: "Company Information", icon: Building2, children: [{ href: "/admin/company", label: "Details" }, { href: "/admin/company#credit", label: "Credit" }, { href: "/admin/company#addresses", label: "Addresses" }] },
  { href: "/admin/quotes", label: "Quotes", icon: FileText },
  { href: "/admin/orders", label: "Orders", icon: ClipboardList, children: [{ href: "/admin/orders?tab=open", label: "Open Orders" }, { href: "/admin/orders?tab=confirmed", label: "Confirmed Orders" }, { href: "/admin/orders?tab=invoices", label: "Invoices" }] },
  { href: "/admin/users", label: "User Management", icon: Users, children: [{ href: "/admin/users", label: "Users" }, { href: "/admin/roles", label: "Roles" }] },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/inventory", label: "Inventory", icon: Warehouse },
  { href: "/admin/coupons", label: "Coupons", icon: Tag },
  { href: "/admin/audit", label: "Audit Log", icon: History },
];

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const isActive = (item: Item) => (item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href) || !!item.children?.some((c) => pathname.startsWith(c.href.split(/[?#]/)[0])));
  const [openKey, setOpenKey] = useState<string | null>(NAV.find((n) => n.children && isActive(n))?.href ?? null);
  return (
    <nav className="space-y-1">
      {NAV.map((item) => {
        const active = isActive(item);
        const Icon = item.icon;
        const expanded = openKey === item.href;
        return (
          <div key={item.href}>
            <div className="relative flex items-center">
              {active && <m.span layoutId="admin-nav" className="absolute inset-0 rounded-xl bg-brand-500 shadow-[0_10px_24px_-10px_rgba(201,162,39,0.55)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />}
              <Link href={item.href} onClick={() => { if (item.children) setOpenKey(item.href); onNavigate?.(); }} className={cn("relative flex flex-1 items-center gap-3 rounded-xl px-3.5 py-3 text-sm transition-colors", active ? "text-white" : "text-white/60 hover:text-white")}>
                <Icon size={18} /> {item.label}
              </Link>
              {item.children && (
                <button onClick={() => setOpenKey(expanded ? null : item.href)} className={cn("relative mr-2 p-1", active ? "text-white" : "text-white/60")} aria-label={`Toggle ${item.label}`}>
                  <ChevronDown size={15} className={cn("transition-transform duration-300", expanded && "rotate-180")} />
                </button>
              )}
            </div>
            <AnimatePresence initial={false}>
              {item.children && expanded && (
                <m.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                  <div className="ml-6 space-y-0.5 border-l border-white/10 py-1 pl-4">
                    {item.children.map((c) => (
                      <Link key={c.href} href={c.href} onClick={onNavigate} className="block rounded-lg px-3 py-2 text-sm text-white/60 transition-colors hover:bg-white/10 hover:text-white">{c.label}</Link>
                    ))}
                  </div>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        );
      })}
    </nav>
  );
}

export function AdminSidebar({ mobileOpen, onClose }: { mobileOpen: boolean; onClose: () => void }) {
  const { admin, logout } = useSession();
  const footer = (
    <div className="mt-auto space-y-3 border-t border-white/10 pt-4">
      {admin ? (
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet text-sm font-semibold text-white">{admin.firstName[0]}{admin.lastName[0]}</span>
          <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium text-white">{admin.firstName} {admin.lastName}</p><p className="flex items-center gap-1 text-xs text-white/50"><ShieldCheck size={12} /> {admin.role.name}</p></div>
          <button onClick={() => logout("admin")} className="p-2 text-white/60 hover:text-danger" aria-label="Sign out"><LogOut size={16} /></button>
        </div>
      ) : (
        <Link href="/admin/login" className="btn btn-primary w-full">Admin sign in</Link>
      )}
      <Link href="/" className="block text-center text-xs text-white/60 hover:text-brand-300">← Back to store</Link>
    </div>
  );
  return (
    <>
      <aside className="sticky top-0 hidden h-dvh w-72 shrink-0 flex-col border-r border-white/10 bg-ink p-5 lg:flex">
        <Logo href="/admin" light className="mb-8 px-2" />
        <div data-lenis-prevent className="no-scrollbar -mx-1 flex-1 overflow-y-auto px-1"><NavList /></div>
        {footer}
      </aside>
      <AnimatePresence>
        {mobileOpen && (
          <>
            <m.div className="fixed inset-0 z-[60] bg-ink/30 lg:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
            <m.aside data-lenis-prevent className="fixed inset-y-0 left-0 z-[61] flex w-[86%] max-w-xs flex-col overflow-y-auto bg-ink p-5 lg:hidden" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}>
              <div className="mb-6 flex items-center justify-between"><Logo href="/admin" light /><button onClick={onClose} className="grid size-9 place-items-center rounded-full bg-white/10 text-white" aria-label="Close menu"><X size={16} /></button></div>
              <NavList onNavigate={onClose} />
              {footer}
            </m.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
