"use client";

import { m } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { Stars } from "@/components/ui/stars";
import { StockBadge } from "@/components/ui/misc";
import { staggerItem } from "@/components/ui/reveal";
import { discountPct, money } from "@/lib/format";
import type { Product } from "@/lib/types";

export function ProductCard({ product, layout = "grid", priority = false }: { product: Product; layout?: "grid" | "list"; priority?: boolean }) {
  const off = discountPct(product.price, product.salePrice);
  const list = layout === "list";
  return (
    <m.article
      variants={staggerItem}
      layout
      whileHover={{ y: -6 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
      className={`group card relative flex overflow-hidden p-3 transition-shadow duration-500 hover:shadow-[0_24px_50px_-24px_rgba(23,21,18,0.25)] ${list ? "flex-row gap-5" : "flex-col"}`}
    >
      <Link href={`/product/${product.slug}`} className={`relative block shrink-0 overflow-hidden rounded-xl bg-canvas ${list ? "aspect-square w-40 sm:w-56" : "aspect-[4/3] w-full"}`}>
        <Image
          src={product.image}
          alt={product.name}
          fill
          priority={priority}
          sizes={list ? "224px" : "(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"}
          className="object-cover transition-transform duration-[900ms] ease-out-expo group-hover:scale-[1.07]"
        />
        {off > 0 && <span className="absolute top-2.5 left-2.5 rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-brand-600 backdrop-blur">-{off}%</span>}
      </Link>
      <div className={`flex flex-1 flex-col ${list ? "py-1" : "px-1 pt-4"}`}>
        <div className="flex items-start justify-between gap-2">
          <Link href={`/product/${product.slug}`} className="line-clamp-1 text-[17px] font-medium transition-colors hover:text-brand-500">
            {product.name}
          </Link>
          <StockBadge stock={product.stock} />
        </div>
        <Stars value={product.rating} className="mt-1.5" />
        <p className="mt-2.5 text-[15px] text-brand-500">RR Price {money(product.price)}</p>
        <p className="text-[15px]">Whole Sale Price {money(product.salePrice)}</p>
        {list && <p className="mt-2 line-clamp-2 text-sm text-muted">{product.description}</p>}
        <div className="mt-3 flex h-4 items-center gap-1.5">
          {product.colors.slice(0, 5).map((color) => (
            <span key={color.name} title={color.name} className="size-3.5 rounded-full ring-1 ring-black/10" style={{ background: color.hex }} />
          ))}
        </div>
        <Link href={`/product/${product.slug}`} className={`btn btn-primary mt-4 h-10 ${list ? "self-start px-8" : "w-full"}`}>
          View &amp; Order
        </Link>
      </div>
    </m.article>
  );
}
