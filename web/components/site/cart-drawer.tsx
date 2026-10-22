"use client";

import { AnimatePresence, m } from "framer-motion";
import { Minus, Plus, ShoppingBag, Trash2, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect } from "react";
import { toast } from "sonner";
import { useCart, cartCount } from "@/lib/cart-store";
import { money } from "@/lib/format";
import { errorMessage } from "@/lib/client";

export function CartDrawer() {
  const { cart, open, setOpen, setQty, remove, busy } = useCart();
  const count = cartCount(cart);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [setOpen]);

  const act = (fn: () => Promise<void>) => fn().catch((e) => toast.error(errorMessage(e)));

  return (
    <AnimatePresence>
      {open && (
        <>
          <m.div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)} />
          <m.aside
            data-lenis-prevent
            role="dialog"
            aria-label="Shopping cart"
            className="fixed top-0 right-0 z-[61] flex h-dvh w-full max-w-md flex-col bg-white shadow-2xl"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", stiffness: 320, damping: 34 }}
          >
            <header className="flex items-center justify-between border-b border-line px-6 py-5">
              <h2 className="text-lg font-semibold">
                Your cart <span className="ml-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs text-brand-500">{count} items</span>
              </h2>
              <button onClick={() => setOpen(false)} className="grid size-9 place-items-center rounded-full hover:bg-canvas" aria-label="Close cart">
                <X size={18} />
              </button>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {cart.items.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center text-center">
                  <m.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="mb-4 grid size-16 place-items-center rounded-2xl bg-brand-50 text-brand-500">
                    <ShoppingBag />
                  </m.div>
                  <p className="font-medium">Your cart is empty</p>
                  <p className="mt-1 text-sm text-muted">Find something you love in the shop.</p>
                  <Link href="/shop" onClick={() => setOpen(false)} className="btn btn-primary mt-5">
                    Browse products
                  </Link>
                </div>
              ) : (
                <ul className="divide-y divide-line">
                  <AnimatePresence initial={false}>
                    {cart.items.map((item) => (
                      <m.li key={item.id} layout initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30, height: 0 }} className="flex gap-4 py-4">
                        <div className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-canvas">
                          {item.image && <Image src={item.image} alt={item.name} fill sizes="80px" className="object-cover" />}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-medium">{item.name}</p>
                          <p className="mt-0.5 text-xs text-muted">{[item.color, item.storage, item.extra].filter(Boolean).join(" · ")}</p>
                          <div className="mt-2 flex items-center justify-between">
                            <div className="flex items-center rounded-lg border border-line">
                              <button disabled={busy} onClick={() => act(() => setQty(item.id, item.qty - 1))} className="grid size-8 place-items-center hover:text-brand-500" aria-label="Decrease">
                                <Minus size={14} />
                              </button>
                              <span className="w-6 text-center text-sm tabular-nums">{item.qty}</span>
                              <button disabled={busy} onClick={() => act(() => setQty(item.id, item.qty + 1))} className="grid size-8 place-items-center hover:text-brand-500" aria-label="Increase">
                                <Plus size={14} />
                              </button>
                            </div>
                            <span className="font-semibold text-brand-500">{money(item.unitPrice * item.qty)}</span>
                          </div>
                        </div>
                        <button disabled={busy} onClick={() => act(() => remove(item.id))} className="self-start p-1 text-muted hover:text-danger" aria-label="Remove">
                          <Trash2 size={16} />
                        </button>
                      </m.li>
                    ))}
                  </AnimatePresence>
                </ul>
              )}
            </div>
            {cart.items.length > 0 && (
              <footer className="space-y-3 border-t border-line px-6 py-5">
                <div className="flex justify-between text-sm text-muted">
                  <span>Subtotal</span>
                  <span>{money(cart.totals.subtotal)}</span>
                </div>
                <div className="flex justify-between text-sm text-muted">
                  <span>Shipping</span>
                  <span>{cart.totals.shipping ? money(cart.totals.shipping) : "Free"}</span>
                </div>
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total</span>
                  <span>{money(cart.totals.total)}</span>
                </div>
                <div className="grid grid-cols-2 gap-3 pt-1">
                  <Link href="/cart" onClick={() => setOpen(false)} className="btn btn-outline">
                    View cart
                  </Link>
                  <Link href="/checkout" onClick={() => setOpen(false)} className="btn btn-primary">
                    Checkout
                  </Link>
                </div>
              </footer>
            )}
          </m.aside>
        </>
      )}
    </AnimatePresence>
  );
}
