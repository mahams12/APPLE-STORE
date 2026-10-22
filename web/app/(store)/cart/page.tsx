"use client";

import { AnimatePresence, m } from "framer-motion";
import { ArrowRight, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { QuoteForm } from "@/components/checkout/quote-form";
import { Summary } from "@/components/checkout/summary";
import { EmptyState, Skeleton } from "@/components/ui/misc";
import { useCart } from "@/lib/cart-store";
import { errorMessage } from "@/lib/client";
import { money } from "@/lib/format";

export default function CartPage() {
  const { cart, ready, setQty, remove, busy } = useCart();
  const act = (fn: () => Promise<void>) => fn().catch((e) => toast.error(errorMessage(e)));
  return (
    <div className="container-x py-8">
      <h1 className="mb-6 text-3xl font-semibold tracking-tight">Shopping cart</h1>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_380px]">
        <div className="space-y-6">
          <div className="card p-2 sm:p-4">
            {!ready ? (
              <div className="space-y-4 p-4">{[0, 1].map((i) => <Skeleton key={i} className="h-24" />)}</div>
            ) : cart.items.length === 0 ? (
              <EmptyState icon={<ShoppingBag />} title="Your cart is empty" body="Add a few products and they'll show up here." action={<Link href="/shop" className="btn btn-primary">Continue shopping</Link>} />
            ) : (
              <ul className="divide-y divide-line">
                <AnimatePresence initial={false}>
                  {cart.items.map((item) => (
                    <m.li key={item.id} layout exit={{ opacity: 0, x: -40 }} className="flex items-center gap-4 p-3 sm:gap-6">
                      <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-canvas sm:size-24">{item.image && <Image src={item.image} alt={item.name} fill sizes="96px" className="object-cover" />}</div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted">{[item.color, item.storage, item.extra].filter(Boolean).join(" · ")}</p>
                        <p className="mt-1 text-sm text-brand-500">{money(item.unitPrice)} each</p>
                      </div>
                      <div className="flex items-center rounded-lg border border-line">
                        <button disabled={busy} onClick={() => act(() => setQty(item.id, item.qty - 1))} className="grid size-9 place-items-center hover:text-brand-500" aria-label="Decrease"><Minus size={14} /></button>
                        <span className="w-7 text-center tabular-nums">{item.qty}</span>
                        <button disabled={busy} onClick={() => act(() => setQty(item.id, item.qty + 1))} className="grid size-9 place-items-center hover:text-brand-500" aria-label="Increase"><Plus size={14} /></button>
                      </div>
                      <p className="hidden w-24 text-right font-semibold sm:block">{money(item.unitPrice * item.qty)}</p>
                      <button disabled={busy} onClick={() => act(() => remove(item.id))} className="p-2 text-muted hover:text-danger" aria-label={`Remove ${item.name}`}><Trash2 size={17} /></button>
                    </m.li>
                  ))}
                </AnimatePresence>
              </ul>
            )}
          </div>
          <div id="quote" className="card scroll-mt-40 p-6"><QuoteForm suggested={cart.totals.total} /></div>
        </div>
        <div className="lg:sticky lg:top-36">
          <Summary cta={cart.items.length > 0 && <Link href="/checkout" className="btn btn-primary mt-6 h-12 w-full text-base">Buy Now <ArrowRight size={18} /></Link>} />
        </div>
      </div>
    </div>
  );
}
