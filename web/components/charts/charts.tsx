"use client";

import { m } from "framer-motion";
import { useId, useState } from "react";
import { money } from "@/lib/format";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function AreaChart({ data, height = 220, labels = MONTHS, format = (v: number) => String(v) }: { data: number[]; height?: number; labels?: string[]; format?: (v: number) => string }) {
  const id = useId();
  const [hover, setHover] = useState<number | null>(null);
  const w = 600;
  const h = height;
  const pad = 24;
  const max = Math.max(...data) * 1.15 || 1;
  const pts = data.map((v, i) => [pad + (i * (w - pad * 2)) / Math.max(1, data.length - 1), h - pad - (v / max) * (h - pad * 2)] as const);
  const line = pts.reduce((acc, [x, y], i) => {
    if (i === 0) return `M${x},${y}`;
    const [px, py] = pts[i - 1];
    const cx = (px + x) / 2;
    return `${acc} C${cx},${py} ${cx},${y} ${x},${y}`;
  }, "");
  const area = `${line} L${pts.at(-1)![0]},${h - pad} L${pts[0][0]},${h - pad} Z`;
  return (
    <div className="relative">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full overflow-visible" onMouseLeave={() => setHover(null)}>
        <defs>
          <linearGradient id={`g${id}`} x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="var(--color-brand-500)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-brand-500)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75, 1].map((t) => <line key={t} x1={pad} x2={w - pad} y1={h - pad - t * (h - pad * 2)} y2={h - pad - t * (h - pad * 2)} stroke="var(--color-line)" strokeDasharray="4 6" />)}
        <m.path d={area} fill={`url(#g${id})`} initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ duration: 1, delay: 0.4 }} />
        <m.path d={line} fill="none" stroke="var(--color-brand-500)" strokeWidth={3} strokeLinecap="round" initial={{ pathLength: 0 }} whileInView={{ pathLength: 1 }} viewport={{ once: true }} transition={{ duration: 1.4, ease: [0.16, 1, 0.3, 1] }} />
        {pts.map(([x, y], i) => (
          <g key={i} onMouseEnter={() => setHover(i)}>
            <rect x={x - (w - pad * 2) / data.length / 2} y={0} width={(w - pad * 2) / data.length} height={h} fill="transparent" />
            {hover === i && <line x1={x} x2={x} y1={pad} y2={h - pad} stroke="var(--color-brand-200)" />}
            <circle cx={x} cy={y} r={hover === i ? 6 : 0} fill="white" stroke="var(--color-brand-500)" strokeWidth={3} className="transition-all duration-200" />
          </g>
        ))}
      </svg>
      <div className="mt-1 flex justify-between px-4 text-[11px] text-muted">{labels.slice(0, data.length).map((l) => <span key={l}>{l}</span>)}</div>
      {hover !== null && (
        <div className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-ink px-2.5 py-1.5 text-xs whitespace-nowrap text-white shadow-lg" style={{ left: `${(pts[hover][0] / w) * 100}%`, top: `${(pts[hover][1] / h) * 100 - 4}%` }}>
          {labels[hover]}: <b>{format(data[hover])}</b>
        </div>
      )}
    </div>
  );
}

const PALETTE = ["var(--color-brand-500)", "var(--color-violet)", "var(--color-star)", "var(--color-success)", "var(--color-brand-300)", "var(--color-danger)"];

export function Donut({ data, size = 180 }: { data: { label: string; value: number }[]; size?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 70;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const shown = active === null ? null : data[active];
  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row">
      <div className="relative shrink-0" style={{ width: size, height: size }}>
        <svg viewBox="0 0 180 180" className="-rotate-90">
          <circle cx="90" cy="90" r={r} fill="none" stroke="var(--color-canvas)" strokeWidth="22" />
          {data.map((d, i) => {
            const len = (d.value / total) * c;
            const el = (
              <m.circle key={d.label} cx="90" cy="90" r={r} fill="none" stroke={PALETTE[i % PALETTE.length]} strokeWidth={active === i ? 28 : 22} strokeDasharray={`${len} ${c - len}`} strokeDashoffset={-offset}
                initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.12 }} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className="cursor-pointer transition-[stroke-width] duration-300" />
            );
            offset += len;
            return el;
          })}
        </svg>
        <div className="absolute inset-0 grid place-items-center text-center">
          <div>
            <p className="text-2xl font-semibold">{shown ? `${Math.round((shown.value / total) * 100)}%` : total}</p>
            <p className="text-xs text-muted">{shown ? shown.label : "Total orders"}</p>
          </div>
        </div>
      </div>
      <ul className="w-full space-y-2.5 text-sm">
        {data.map((d, i) => (
          <li key={d.label} onMouseEnter={() => setActive(i)} onMouseLeave={() => setActive(null)} className={`flex items-center gap-3 rounded-lg px-2 py-1 transition-colors ${active === i ? "bg-canvas" : ""}`}>
            <span className="size-2.5 rounded-full" style={{ background: PALETTE[i % PALETTE.length] }} />
            <span className="flex-1 text-muted">{d.label}</span>
            <span className="font-medium">{d.value}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function StatCard({ label, value, delta, icon }: { label: string; value: string; delta?: number; icon: React.ReactNode }) {
  return (
    <div className="card group flex items-center gap-4 p-5 transition-shadow duration-500 hover:shadow-lg">
      <span className="grid size-12 place-items-center rounded-2xl bg-brand-50 text-brand-500 transition-transform duration-500 group-hover:scale-110">{icon}</span>
      <div className="min-w-0">
        <p className="text-sm text-muted">{label}</p>
        <p className="truncate text-2xl font-semibold tracking-tight">{value}</p>
        {delta !== undefined && <p className={`text-xs ${delta >= 0 ? "text-success" : "text-danger"}`}>{delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs last month</p>}
      </div>
    </div>
  );
}

export const usd = money;
