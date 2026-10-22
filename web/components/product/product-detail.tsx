"use client";

import { AnimatePresence, m } from "framer-motion";
import { Check, ChevronDown, Minus, Plus, ShieldCheck, ShoppingBag, Truck } from "lucide-react";
import Image from "next/image";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Stars } from "@/components/ui/stars";
import { useCart } from "@/lib/cart-store";
import { errorMessage } from "@/lib/client";
import { cn, money } from "@/lib/format";
import type { Product } from "@/lib/types";

function Select({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-muted">{label}</span>
      <span className="relative block">
        <select value={value} onChange={(e) => onChange(e.target.value)} className="input h-12 cursor-pointer appearance-none pr-10">
          {options.map((o) => <option key={o}>{o}</option>)}
        </select>
        <ChevronDown size={16} className="pointer-events-none absolute top-1/2 right-3.5 -translate-y-1/2 text-muted" />
      </span>
    </label>
  );
}

export function ProductDetail({ product }: { product: Product }) {
  const gallery = product.gallery.length ? product.gallery : [product.image];
  const [active, setActive] = useState(0);
  const [color, setColor] = useState(product.colors[0]?.name ?? "");
  const [storage, setStorage] = useState(product.storages[0] ?? "");
  const [extra, setExtra] = useState(product.extras[0] ?? "");
  const [qty, setQty] = useState(1);
  const [tab, setTab] = useState<"description" | "info" | "reviews">("description");
  const [added, setAdded] = useState(false);
  const [zoom, setZoom] = useState<{ x: number; y: number } | null>(null);
  const { add, busy, setOpen } = useCart();

  const variant = product.variants?.find((v) => v.color === color && v.storage === storage && v.extra === extra);
  const step = ["iPhone", "iPad", "Mac"].includes(product.category) ? 100 : product.category === "Watch" ? 50 : 0;
  const unit = variant?.price ?? product.salePrice + Math.max(0, product.storages.indexOf(storage)) * step;
  const rr = product.price + (unit - product.salePrice);
  const available = variant ? variant.stock : product.stock;
  const warehouses = useMemo(() => product.warehouses, [product.warehouses]);

  const addToCart = async () => {
    try {
      await add(product, { color, storage, extra, qty });
      setAdded(true);
      setTimeout(() => setAdded(false), 1800);
      toast.success(`${product.name} added to cart`, { action: { label: "View cart", onClick: () => setOpen(true) } });
    } catch (e) {
      toast.error(errorMessage(e));
    }
  };

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <div
            className="card relative aspect-square cursor-zoom-in overflow-hidden sm:aspect-[4/3.9]"
            onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 }); }}
            onMouseLeave={() => setZoom(null)}
          >
            <AnimatePresence mode="popLayout">
              <m.div key={active} className="absolute inset-0" initial={{ opacity: 0, scale: 1.04 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.5 }}>
                <Image src={gallery[active]} alt={product.name} fill priority sizes="(max-width: 1024px) 100vw, 55vw" className="object-cover transition-transform duration-300" style={zoom ? { transform: "scale(1.8)", transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined} />
              </m.div>
            </AnimatePresence>
          </div>
          <div className="no-scrollbar mt-4 flex gap-3 overflow-x-auto">
            {gallery.map((src, i) => (
              <button key={src + i} onClick={() => setActive(i)} className={cn("relative aspect-square w-24 shrink-0 overflow-hidden rounded-xl bg-white ring-2 transition-all duration-300 sm:w-28", active === i ? "ring-brand-500" : "ring-transparent opacity-70 hover:opacity-100")}>
                <Image src={src} alt="" fill sizes="112px" className="object-cover" />
              </button>
            ))}
          </div>
        </div>

        <m.div initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }} className="card h-fit p-6 sm:p-8 lg:sticky lg:top-36">
          <div className="flex items-center gap-3 text-xs text-muted">
            <Stars value={product.rating} size={16} /> {product.rating}/5 Star Ratings · {product.reviewCount} reviews
          </div>
          <h1 className="mt-4 text-3xl leading-tight font-medium tracking-tight sm:text-[34px]">{product.name}</h1>
          <p className="mt-3 text-[15px] leading-relaxed text-muted">{product.description}</p>
          <div className="mt-5 space-y-0.5 text-lg">
            <p><m.span key={rr} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-brand-500">{money(rr)}</m.span> RR Price</p>
            <p><m.span key={unit} initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="inline-block text-brand-500">{money(unit)}</m.span> Wholesale Price</p>
          </div>
          <div className="mt-5">
            <p className="text-lg">Stock:</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-ink/80 marker:text-muted">
              {warehouses.map((w) => <li key={w.name}>{w.name}: <span className={w.qty > 0 ? "text-success" : "text-danger"}>{w.qty}</span></li>)}
            </ul>
          </div>
          {product.colors.length > 0 && (
            <div className="mt-5">
              <p className="text-lg">Color: <span className="text-sm text-muted">{color}</span></p>
              <div className="mt-2 flex flex-wrap gap-2.5">
                {product.colors.map((c) => (
                  <button key={c.name} onClick={() => setColor(c.name)} title={c.name} aria-label={c.name} aria-pressed={color === c.name} className={cn("relative grid size-14 place-items-center rounded-xl border bg-white transition-all duration-300", color === c.name ? "border-brand-500 shadow-[0_0_0_3px] shadow-brand-100" : "border-line hover:border-brand-300")}>
                    <span className="size-8 rounded-lg ring-1 ring-black/10" style={{ background: c.hex }} />
                    {color === c.name && <m.span layoutId="color-check" className="absolute -top-1.5 -right-1.5 grid size-5 place-items-center rounded-full bg-brand-500 text-white"><Check size={11} strokeWidth={3} /></m.span>}
                  </button>
                ))}
              </div>
            </div>
          )}
          <div className="mt-5">
            <p className="text-lg">Options:</p>
            <div className="mt-2 grid grid-cols-2 gap-3">
              <Select label={product.category === "Watch" ? "Size" : "Storage"} value={storage} options={product.storages} onChange={setStorage} />
              <Select label={product.extraLabel} value={extra} options={product.extras} onChange={setExtra} />
            </div>
          </div>
          <div className="mt-6 flex gap-3">
            <div className="flex h-12 items-center rounded-lg border border-line">
              <button onClick={() => setQty((q) => Math.max(1, q - 1))} className="grid h-full w-11 place-items-center text-muted hover:text-brand-500" aria-label="Decrease quantity"><Minus size={16} /></button>
              <span className="w-8 text-center tabular-nums">{qty}</span>
              <button onClick={() => setQty((q) => Math.min(10, q + 1))} className="grid h-full w-11 place-items-center text-muted hover:text-brand-500" aria-label="Increase quantity"><Plus size={16} /></button>
            </div>
            <button onClick={addToCart} disabled={busy || available <= 0} className="btn btn-primary h-12 flex-1 text-base">
              <AnimatePresence mode="wait" initial={false}>
                <m.span key={added ? "ok" : available <= 0 ? "out" : "add"} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }} className="flex items-center gap-2">
                  {added ? <><Check size={18} /> Added</> : available <= 0 ? "Out of stock" : <><ShoppingBag size={18} /> Add To Cart</>}
                </m.span>
              </AnimatePresence>
            </button>
          </div>
          <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-muted">
            <span className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2.5"><Truck size={15} className="text-brand-500" /> Free shipping over $50</span>
            <span className="flex items-center gap-2 rounded-lg bg-canvas px-3 py-2.5"><ShieldCheck size={15} className="text-brand-500" /> {product.category === "AirPods" ? "1-year" : "1-year limited"} warranty</span>
          </div>
        </m.div>
      </div>

      <section className="card mt-6 p-6 sm:p-8">
        <div className="flex gap-8 border-b border-line">
          {([["description", "Description"], ["info", "Additional Information"], ["reviews", `Reviews (${product.reviewCount})`]] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)} className={cn("relative pb-3 text-[17px] transition-colors", tab === key ? "text-brand-500" : "text-muted hover:text-ink")}>
              {label}
              {tab === key && <m.span layoutId="pd-tab" className="absolute inset-x-0 -bottom-px h-0.5 bg-brand-500" />}
            </button>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <m.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="pt-6">
            {tab === "description" && (
              <div className="grid gap-8 md:grid-cols-2">
                <p className="leading-relaxed text-ink/80">{product.description}</p>
                <ul className="space-y-3">
                  {product.highlights.map((h) => <li key={h} className="flex items-start gap-3 text-sm"><span className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full bg-brand-50 text-brand-500"><Check size={12} strokeWidth={3} /></span>{h}</li>)}
                </ul>
              </div>
            )}
            {tab === "info" && (
              <dl className="grid gap-x-10 sm:grid-cols-2">
                {[{ label: "SKU", value: variant?.sku ?? product.sku }, { label: "Brand", value: product.brand }, { label: "Category", value: product.category }, ...product.specs].map((s) => (
                  <div key={s.label} className="flex justify-between gap-4 border-b border-line py-3 text-sm"><dt className="text-muted">{s.label}</dt><dd className="text-right font-medium">{s.value}</dd></div>
                ))}
              </dl>
            )}
            {tab === "reviews" && (
              product.reviews.length === 0 ? <p className="text-muted">No reviews yet. Be the first to review this product after your purchase.</p> : (
                <ul className="grid gap-4 md:grid-cols-2">
                  {product.reviews.map((r) => (
                    <li key={r.id} className="rounded-xl bg-canvas p-5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet text-sm font-semibold text-white">{r.name[0]}</span>
                          <div><p className="text-sm font-medium">{r.name}</p><p className="text-xs text-muted">{r.date}</p></div>
                        </div>
                        <Stars value={r.rating} />
                      </div>
                      <p className="mt-3 text-sm text-ink/80">{r.text}</p>
                    </li>
                  ))}
                </ul>
              )
            )}
          </m.div>
        </AnimatePresence>
      </section>
    </>
  );
}
