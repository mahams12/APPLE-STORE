"use client";

import { AnimatePresence, m } from "framer-motion";
import { Check, ChevronDown, LayoutGrid, LayoutList, PackageSearch, SlidersHorizontal, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useDeferredValue, useMemo, useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import { Stars } from "@/components/ui/stars";
import { EmptyState } from "@/components/ui/misc";
import { cn, money } from "@/lib/format";
import type { Product } from "@/lib/types";

type Sort = "default" | "price-asc" | "price-desc" | "rating" | "newest";
const SORTS: { value: Sort; label: string }[] = [
  { value: "default", label: "Default" },
  { value: "price-asc", label: "Price: Low to High" },
  { value: "price-desc", label: "Price: High to Low" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];

function Check2({ checked, onChange, label, count }: { checked: boolean; onChange: () => void; label: string; count?: number }) {
  return (
    <label className="group flex cursor-pointer items-center gap-2.5 py-1 text-sm text-ink/80">
      <span className={cn("grid size-4 place-items-center rounded border transition-all duration-200", checked ? "border-brand-500 bg-brand-500 text-white" : "border-muted/40 group-hover:border-brand-400")}>
        {checked && <Check size={11} strokeWidth={3} />}
      </span>
      <input type="checkbox" className="sr-only" checked={checked} onChange={onChange} />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-muted">{count}</span>}
    </label>
  );
}

export function ShopView({ products }: { products: Product[] }) {
  const params = useSearchParams();
  const router = useRouter();
  const q = (params.get("q") ?? "").toLowerCase();
  const initialCategory = params.get("category");
  const maxPrice = Math.ceil(Math.max(...products.map((p) => p.salePrice), 100) / 50) * 50;

  const [cats, setCats] = useState<string[]>(initialCategory ? [initialCategory] : []);
  const [brands, setBrands] = useState<string[]>([]);
  const [sizes, setSizes] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [inStock, setInStock] = useState(false);
  const [range, setRange] = useState<[number, number]>([0, maxPrice]);
  const [sort, setSort] = useState<Sort>("default");
  const [layout, setLayout] = useState<"grid" | "list">("grid");
  const [drawer, setDrawer] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);
  const deferredRange = useDeferredValue(range);

  const facets = useMemo(() => {
    const count = (fn: (p: Product) => string[]) => {
      const map = new Map<string, number>();
      products.forEach((p) => fn(p).forEach((v) => map.set(v, (map.get(v) ?? 0) + 1)));
      return Array.from(map.entries());
    };
    const colorMap = new Map<string, string>();
    products.forEach((p) => p.colors.forEach((c) => colorMap.set(c.name, c.hex)));
    return {
      categories: count((p) => [p.category]),
      brands: count((p) => [p.brand]),
      sizes: count((p) => p.storages).slice(0, 8),
      colors: Array.from(colorMap.entries()),
    };
  }, [products]);

  const toggle = (list: string[], set: (v: string[]) => void, value: string) => set(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

  const filtered = useMemo(() => {
    const out = products.filter(
      (p) =>
        (!q || `${p.name} ${p.category} ${p.sku} ${p.brand}`.toLowerCase().includes(q)) &&
        (!cats.length || cats.includes(p.category)) &&
        (!brands.length || brands.includes(p.brand)) &&
        (!sizes.length || p.storages.some((s) => sizes.includes(s))) &&
        (!colors.length || p.colors.some((c) => colors.includes(c.name))) &&
        (!inStock || p.stock > 0) &&
        p.salePrice >= deferredRange[0] &&
        p.salePrice <= deferredRange[1],
    );
    const sorters: Record<Sort, (a: Product, b: Product) => number> = {
      default: () => 0,
      "price-asc": (a, b) => a.salePrice - b.salePrice,
      "price-desc": (a, b) => b.salePrice - a.salePrice,
      rating: (a, b) => b.rating - a.rating,
      newest: (a, b) => b.createdAt.localeCompare(a.createdAt),
    };
    return [...out].sort(sorters[sort]);
  }, [products, q, cats, brands, sizes, colors, inStock, deferredRange, sort]);

  const popular = products.find((p) => p.popular) ?? products[0];
  const activeCount = cats.length + brands.length + sizes.length + colors.length + (inStock ? 1 : 0) + (range[0] > 0 || range[1] < maxPrice ? 1 : 0);
  const reset = () => {
    setCats([]); setBrands([]); setSizes([]); setColors([]); setInStock(false); setRange([0, maxPrice]);
    if (q || initialCategory) router.replace("/shop");
  };
  const pct = (v: number) => (v / maxPrice) * 100;

  const filters = (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-medium">Filters</h2>
        {activeCount > 0 && <button onClick={reset} className="text-xs text-brand-500 hover:underline">Clear all ({activeCount})</button>}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Categories</h3>
        {facets.categories.map(([c, n]) => <Check2 key={c} label={c} count={n} checked={cats.includes(c)} onChange={() => toggle(cats, setCats, c)} />)}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium">Price</h3>
        <div className="relative h-5">
          <div className="absolute top-1/2 h-1 w-full -translate-y-1/2 rounded-full bg-line" />
          <div className="absolute top-1/2 h-1 -translate-y-1/2 rounded-full bg-brand-500" style={{ left: `${pct(range[0])}%`, right: `${100 - pct(range[1])}%` }} />
          {[0, 1].map((i) => (
            <input key={i} type="range" min={0} max={maxPrice} step={10} value={range[i]} aria-label={i ? "Maximum price" : "Minimum price"}
              onChange={(e) => { const v = Number(e.target.value); setRange((r) => (i ? [r[0], Math.max(v, r[0] + 10)] : [Math.min(v, r[1] - 10), r[1]])); }}
              className="pointer-events-none absolute inset-0 w-full appearance-none bg-transparent [&::-moz-range-thumb]:pointer-events-auto [&::-moz-range-thumb]:size-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:pointer-events-auto [&::-webkit-slider-thumb]:size-4 [&::-webkit-slider-thumb]:cursor-grab [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-brand-500 [&::-webkit-slider-thumb]:shadow-[0_0_0_4px_white,0_2px_8px_rgba(67,97,238,0.5)] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-125" />
          ))}
        </div>
        <div className="mt-2 flex justify-between text-xs text-muted"><span>{money(range[0])}</span><span>{money(range[1])}</span></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <input className="input h-10" inputMode="numeric" placeholder="Min" value={range[0] || ""} onChange={(e) => setRange([Math.min(Number(e.target.value) || 0, range[1]), range[1]])} />
          <input className="input h-10" inputMode="numeric" placeholder="Max" value={range[1] === maxPrice ? "" : range[1]} onChange={(e) => setRange([range[0], Number(e.target.value) || maxPrice])} />
        </div>
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Availability</h3>
        <Check2 label="In Stock" checked={inStock} onChange={() => setInStock((v) => !v)} count={products.filter((p) => p.stock > 0).length} />
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Brand</h3>
        {facets.brands.map(([b, n]) => <Check2 key={b} label={b} count={n} checked={brands.includes(b)} onChange={() => toggle(brands, setBrands, b)} />)}
      </div>
      <div>
        <h3 className="mb-2 text-sm font-medium">Size</h3>
        {facets.sizes.map(([s, n]) => <Check2 key={s} label={s} count={n} checked={sizes.includes(s)} onChange={() => toggle(sizes, setSizes, s)} />)}
      </div>
      <div>
        <h3 className="mb-3 text-sm font-medium">Colors</h3>
        <div className="flex flex-wrap gap-2.5">
          {facets.colors.map(([name, hex]) => (
            <button key={name} title={name} aria-label={name} aria-pressed={colors.includes(name)} onClick={() => toggle(colors, setColors, name)}
              className={cn("grid size-7 place-items-center rounded-full ring-1 ring-black/10 transition-transform duration-200 hover:scale-110", colors.includes(name) && "ring-2 ring-brand-500 ring-offset-2")} style={{ background: hex }}>
              {colors.includes(name) && <Check size={13} strokeWidth={3} className="text-white mix-blend-difference" />}
            </button>
          ))}
        </div>
      </div>
      {popular && (
        <div>
          <h3 className="mb-3 text-sm font-medium">Popular Products</h3>
          <div className="rounded-2xl bg-canvas p-2.5">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl"><Image src={popular.image} alt={popular.name} fill sizes="260px" className="object-cover" /></div>
            <p className="mt-3 font-medium">{popular.name}</p>
            <Stars value={popular.rating} className="mt-1" />
            <p className="mt-1 text-sm"><span className="text-brand-500">Now {money(popular.salePrice)}</span> <span className="text-muted line-through">{money(popular.price)}</span></p>
            <Link href={`/product/${popular.slug}`} className="btn btn-primary mt-3 h-10 w-full">View &amp; Order</Link>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="container-x py-8">
      <nav className="mb-5 text-sm text-muted"><Link href="/" className="hover:text-ink">Home</Link> / <span className="text-ink">Shop</span>{q && <> / Search “{q}”</>}</nav>
      <div className="grid gap-6 lg:grid-cols-[270px_1fr]">
        <aside className="card hidden h-fit p-6 lg:sticky lg:top-36 lg:block">{filters}</aside>
        <div>
          <div className="card mb-5 flex items-center gap-3 px-4 py-3">
            <button onClick={() => setDrawer(true)} className="btn btn-outline h-9 px-3 lg:hidden"><SlidersHorizontal size={15} /> Filters{activeCount ? ` (${activeCount})` : ""}</button>
            <span className="hidden text-sm text-muted sm:inline">Sort By:</span>
            <div className="relative">
              <button onClick={() => setSortOpen((v) => !v)} onBlur={() => setTimeout(() => setSortOpen(false), 150)} className="flex h-9 items-center gap-6 rounded-lg border border-line px-3 text-sm text-muted hover:border-brand-300">
                {SORTS.find((s) => s.value === sort)?.label} <ChevronDown size={14} className={cn("transition-transform", sortOpen && "rotate-180")} />
              </button>
              <AnimatePresence>
                {sortOpen && (
                  <m.ul initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 6 }} className="absolute z-20 mt-2 w-52 rounded-xl border border-line bg-white p-1.5 shadow-xl">
                    {SORTS.map((s) => (
                      <li key={s.value}><button onClick={() => { setSort(s.value); setSortOpen(false); }} className={cn("flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-sm hover:bg-canvas", sort === s.value && "text-brand-500")}>{s.label}{sort === s.value && <Check size={14} />}</button></li>
                    ))}
                  </m.ul>
                )}
              </AnimatePresence>
            </div>
            <span className="ml-auto text-sm text-muted">{filtered.length} results</span>
            <div className="flex overflow-hidden rounded-lg border border-line">
              {(["grid", "list"] as const).map((l) => (
                <button key={l} onClick={() => setLayout(l)} aria-label={`${l} view`} className={cn("grid size-9 place-items-center transition-colors", layout === l ? "bg-brand-50 text-brand-500" : "text-muted hover:text-ink")}>
                  {l === "grid" ? <LayoutGrid size={16} /> : <LayoutList size={16} />}
                </button>
              ))}
            </div>
          </div>
          {filtered.length === 0 ? (
            <div className="card"><EmptyState icon={<PackageSearch />} title="No products match" body="Try removing a filter or searching for something else." action={<button onClick={reset} className="btn btn-primary">Reset filters</button>} /></div>
          ) : (
            <m.div layout className={cn("grid gap-5", layout === "grid" ? "grid-cols-1 sm:grid-cols-2 xl:grid-cols-3" : "grid-cols-1")} initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}>
              <AnimatePresence mode="popLayout">
                {filtered.map((p, i) => <ProductCard key={p.id} product={p} layout={layout} priority={i < 3} />)}
              </AnimatePresence>
            </m.div>
          )}
        </div>
      </div>
      <AnimatePresence>
        {drawer && (
          <>
            <m.div className="fixed inset-0 z-[60] bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setDrawer(false)} />
            <m.div data-lenis-prevent className="fixed inset-y-0 left-0 z-[61] w-[88%] max-w-sm overflow-y-auto bg-white p-6" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}>
              <button onClick={() => setDrawer(false)} className="absolute top-5 right-5 grid size-9 place-items-center rounded-full bg-canvas" aria-label="Close filters"><X size={16} /></button>
              {filters}
              <button onClick={() => setDrawer(false)} className="btn btn-primary mt-6 w-full">Show {filtered.length} results</button>
            </m.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
