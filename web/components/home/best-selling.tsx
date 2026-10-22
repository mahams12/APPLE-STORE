"use client";

import { AnimatePresence, m } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { ProductCard } from "@/components/product/product-card";
import type { Product } from "@/lib/types";
import { cn } from "@/lib/format";

export function BestSelling({ products, title = "Best Selling Products" }: { products: Product[]; title?: string }) {
  const categories = Array.from(new Set(products.map((p) => p.category)));
  const [tab, setTab] = useState(categories[0]);
  const list = products.filter((p) => p.category === tab).slice(0, 8);
  return (
    <section className="card p-5 sm:p-8">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-medium tracking-tight">{title}</h2>
        <Link href={`/shop?category=${tab}`} className="text-sm text-brand-500 hover:underline">See All</Link>
      </div>
      <div className="no-scrollbar mt-5 flex gap-8 overflow-x-auto border-b border-line">
        {categories.map((c) => (
          <button key={c} onClick={() => setTab(c)} className={cn("relative shrink-0 pb-3 text-[17px] transition-colors", tab === c ? "text-brand-500" : "text-muted hover:text-ink")}>
            {c}
            {tab === c && <m.span layoutId="best-tab" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />}
          </button>
        ))}
      </div>
      <AnimatePresence mode="wait">
        <m.div key={tab} initial="hidden" animate="show" exit={{ opacity: 0, y: -10, transition: { duration: 0.15 } }} variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }} className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {list.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </m.div>
      </AnimatePresence>
    </section>
  );
}
