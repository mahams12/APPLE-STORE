import type { Metadata } from "next";
import { Tag } from "lucide-react";
import { ProductCard } from "@/components/product/product-card";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { getProducts } from "@/lib/api";
import { discountPct } from "@/lib/format";

export const metadata: Metadata = { title: "Promotions" };
export const revalidate = 60;

const CODES = [
  { code: "APPLE10", body: "10% off your whole order" },
  { code: "STUDENT15", body: "15% off for students" },
  { code: "FREESHIP", body: "Free shipping on any order" },
];

export default async function PromotionsPage() {
  const products = (await getProducts()).filter((p) => discountPct(p.price, p.salePrice) > 0).sort((a, b) => discountPct(b.price, b.salePrice) - discountPct(a.price, a.salePrice));
  return (
    <div className="container-x space-y-10 py-10">
      <Reveal className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-brand-500 via-brand-600 to-violet p-10 text-white sm:p-14">
        <div className="absolute -right-20 -bottom-20 size-80 rounded-full bg-white/10 blur-2xl" />
        <p className="text-xs font-semibold tracking-[0.2em] text-white/70 uppercase">This month</p>
        <h1 className="mt-3 max-w-xl text-4xl font-semibold tracking-tight sm:text-5xl">Save up to {Math.max(0, ...products.map((p) => discountPct(p.price, p.salePrice)))}% on Apple favourites.</h1>
        <div className="mt-8 grid gap-3 sm:grid-cols-3">
          {CODES.map((c) => (
            <div key={c.code} className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
              <p className="flex items-center gap-2 font-mono text-lg font-semibold"><Tag size={16} /> {c.code}</p>
              <p className="text-sm text-white/75">{c.body}</p>
            </div>
          ))}
        </div>
      </Reveal>
      <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </Stagger>
    </div>
  );
}
