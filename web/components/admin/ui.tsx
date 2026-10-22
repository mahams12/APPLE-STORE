"use client";

import { m } from "framer-motion";
import { Search } from "lucide-react";
import { cn } from "@/lib/format";

export function PageHeader({ title, subtitle, actions }: { title: string; subtitle?: string; actions?: React.ReactNode }) {
  return (
    <m.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div><h1 className="text-[28px] font-semibold tracking-tight">{title}</h1>{subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}</div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </m.div>
  );
}

export function DemoBanner({ live }: { live: boolean }) {
  if (live) return null;
  return <div className="mb-5 rounded-xl border border-star/30 bg-star/10 px-4 py-2.5 text-sm text-ink/80">Demo data — changes stay in this browser. <a href="/admin/login" className="font-medium text-brand-500 hover:underline">Sign in as admin</a> to manage live data.</div>;
}

export function SearchInput({ value, onChange, placeholder = "Search" }: { value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <div className="relative">
      <Search size={16} className="absolute top-1/2 left-3.5 -translate-y-1/2 text-muted" />
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder} className="input h-10 w-full pl-10 sm:w-64" />
    </div>
  );
}

export function Table({ head, children, empty, className }: { head: React.ReactNode[]; children: React.ReactNode; empty?: boolean; className?: string }) {
  return (
    <div className={cn("card overflow-hidden", className)}>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="bg-canvas/70"><tr className="text-left text-muted">{head.map((h, i) => <th key={i} className="px-5 py-3.5 font-medium first:pl-6 last:pr-6">{h}</th>)}</tr></thead>
          <tbody className="divide-y divide-line">{children}</tbody>
        </table>
      </div>
      {empty && <p className="py-12 text-center text-sm text-muted">Nothing here yet.</p>}
    </div>
  );
}

export function Row({ children, i = 0, onClick }: { children: React.ReactNode; i?: number; onClick?: () => void }) {
  return (
    <m.tr initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }} onClick={onClick} className={cn("transition-colors hover:bg-canvas/50 [&>td]:px-5 [&>td]:py-3.5 [&>td:first-child]:pl-6 [&>td:last-child]:pr-6", onClick && "cursor-pointer")}>
      {children}
    </m.tr>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label?: string }) {
  return (
    <button type="button" role="switch" aria-checked={checked} aria-label={label} onClick={() => onChange(!checked)} className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors duration-300", checked ? "bg-brand-500" : "bg-line")}>
      <m.span layout transition={{ type: "spring", stiffness: 500, damping: 32 }} className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow", checked ? "right-0.5" : "left-0.5")} />
    </button>
  );
}

export function Tabs<T extends string>({ value, onChange, items, id }: { value: T; onChange: (v: T) => void; items: { key: T; label: string; count?: number }[]; id: string }) {
  return (
    <div className="no-scrollbar mb-5 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 shadow-[0_1px_2px_rgba(16,24,40,0.05)]">
      {items.map((t) => (
        <button key={t.key} onClick={() => onChange(t.key)} className={cn("relative shrink-0 rounded-lg px-4 py-2 text-sm transition-colors", value === t.key ? "text-white" : "text-muted hover:text-ink")}>
          {value === t.key && <m.span layoutId={`tabs-${id}`} className="absolute inset-0 rounded-lg bg-brand-500" />}
          <span className="relative">{t.label}{t.count !== undefined && <span className="ml-1.5 opacity-70">{t.count}</span>}</span>
        </button>
      ))}
    </div>
  );
}
