"use client";

import { create } from "zustand";
import { api, ApiError } from "./client";
import type { Cart, CartItem, Order, Product } from "./types";

const LOCAL_KEY = "istore.cart.v1";
const LOCAL_ORDERS = "istore.orders.v1";
const RULES = { freeOver: 50, shippingFee: 12, taxRate: 0.08 };
const COUPONS: Record<string, { type: "PERCENT" | "SHIPPING"; amount: number }> = {
  APPLE10: { type: "PERCENT", amount: 10 },
  STUDENT15: { type: "PERCENT", amount: 15 },
  FREESHIP: { type: "SHIPPING", amount: 0 },
};

const r2 = (n: number) => Math.round(n * 100) / 100;

export function priceCart(items: CartItem[], coupon: string): Cart {
  const subtotal = r2(items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0));
  const rule = COUPONS[coupon];
  const discount = rule?.type === "PERCENT" ? r2(subtotal * (rule.amount / 100)) : 0;
  const discounted = Math.max(0, r2(subtotal - discount));
  const shipping = subtotal === 0 || rule?.type === "SHIPPING" || discounted >= RULES.freeOver ? 0 : RULES.shippingFee;
  const tax = r2(discounted * RULES.taxRate);
  return { items, coupon, totals: { subtotal, discount, discounted, shipping, tax, total: r2(discounted + shipping + tax), valid: true } };
}

const EMPTY = priceCart([], "");

type Selection = { color: string; storage: string; extra: string; qty: number };

type CartState = {
  cart: Cart;
  mode: "api" | "local";
  ready: boolean;
  open: boolean;
  busy: boolean;
  setOpen: (open: boolean) => void;
  hydrate: () => Promise<void>;
  add: (product: Product, selection: Selection) => Promise<void>;
  setQty: (id: string, qty: number) => Promise<void>;
  remove: (id: string) => Promise<void>;
  coupon: (code: string) => Promise<void>;
  clear: () => Promise<void>;
  /** Replace the cart after a successful local checkout. */
  reset: () => void;
};

const saveLocal = (cart: Cart) => {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify({ items: cart.items, coupon: cart.coupon }));
  } catch {
    /* storage unavailable */
  }
};

const loadLocal = (): Cart => {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null") as { items: CartItem[]; coupon: string } | null;
    return raw ? priceCart(raw.items, raw.coupon) : EMPTY;
  } catch {
    return EMPTY;
  }
};

export const useCart = create<CartState>((set, get) => {
  const local = (next: Cart) => {
    saveLocal(next);
    set({ cart: next });
  };
  const run = async (remote: () => Promise<Cart>, offline: () => Cart) => {
    set({ busy: true });
    try {
      if (get().mode === "api") {
        try {
          set({ cart: await remote() });
          return;
        } catch (error) {
          if (!(error instanceof ApiError && error.offline)) throw error;
          set({ mode: "local", cart: loadLocal() });
        }
      }
      local(offline());
    } finally {
      set({ busy: false });
    }
  };

  return {
    cart: EMPTY,
    mode: "api",
    ready: false,
    open: false,
    busy: false,
    setOpen: (open) => set({ open }),
    hydrate: async () => {
      try {
        set({ cart: await api<Cart>("/cart"), mode: "api", ready: true });
      } catch {
        set({ cart: loadLocal(), mode: "local", ready: true });
      }
    },
    add: (product, sel) =>
      run(
        () => api<Cart>("/cart/items", { method: "POST", json: { productId: product.id, color: sel.color, storage: sel.storage, extra: sel.extra, qty: sel.qty } }),
        () => {
          const { cart } = get();
          const storageIndex = Math.max(0, product.storages.indexOf(sel.storage));
          const step = ["iPhone", "iPad", "Mac"].includes(product.category) ? 100 : product.category === "Watch" ? 50 : 0;
          const unitPrice = product.variants?.find((v) => v.color === sel.color && v.storage === sel.storage && v.extra === sel.extra)?.price ?? product.salePrice + storageIndex * step;
          const id = `${product.id}|${sel.color}|${sel.storage}|${sel.extra}`;
          const exists = cart.items.find((item) => item.id === id);
          const items = exists
            ? cart.items.map((item) => (item.id === id ? { ...item, qty: Math.min(10, item.qty + sel.qty) } : item))
            : [...cart.items, { id, productId: product.id, name: product.name, image: product.image, color: sel.color, storage: sel.storage, extra: sel.extra, unitPrice, qty: sel.qty }];
          return priceCart(items, cart.coupon);
        },
      ),
    setQty: (id, qty) =>
      run(
        () => api<Cart>(`/cart/items/${id}`, { method: "PATCH", json: { qty } }),
        () => {
          const { cart } = get();
          const items = qty <= 0 ? cart.items.filter((item) => item.id !== id) : cart.items.map((item) => (item.id === id ? { ...item, qty: Math.min(10, qty) } : item));
          return priceCart(items, cart.coupon);
        },
      ),
    remove: (id) =>
      run(
        () => api<Cart>(`/cart/items/${id}`, { method: "DELETE" }),
        () => priceCart(get().cart.items.filter((item) => item.id !== id), get().cart.coupon),
      ),
    coupon: (code) =>
      run(
        () => api<Cart>("/cart/coupon", { method: "POST", json: { code } }),
        () => {
          const normalized = code.trim().toUpperCase();
          if (normalized && !COUPONS[normalized]) throw new Error("That coupon is not valid.");
          return priceCart(get().cart.items, normalized);
        },
      ),
    clear: () =>
      run(
        () => api<Cart>("/cart", { method: "DELETE" }),
        () => EMPTY,
      ),
    reset: () => {
      if (get().mode === "local") saveLocal(EMPTY);
      set({ cart: EMPTY });
    },
  };
});

export function saveLocalOrder(order: Order) {
  try {
    const list = JSON.parse(localStorage.getItem(LOCAL_ORDERS) || "[]") as Order[];
    localStorage.setItem(LOCAL_ORDERS, JSON.stringify([order, ...list].slice(0, 20)));
  } catch {
    /* ignore */
  }
}

export function loadLocalOrders(): Order[] {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_ORDERS) || "[]") as Order[];
  } catch {
    return [];
  }
}

export const cartCount = (cart: Cart) => cart.items.reduce((sum, item) => sum + item.qty, 0);
