import { PRODUCTS } from "./catalog";
import type { Product } from "./types";

/** Server-side API access with an offline fallback to the demo catalog. */

const API_URL = process.env.API_URL || "http://127.0.0.1:4000";

async function serverGet<T>(path: string, revalidate = 30): Promise<T | null> {
  try {
    const res = await fetch(`${API_URL}${path}`, { next: { revalidate }, signal: AbortSignal.timeout(2500) });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

export async function getProducts(): Promise<Product[]> {
  const data = await serverGet<{ products: Product[] }>("/products?pageSize=60");
  return data?.products?.length ? data.products : PRODUCTS;
}

export async function getProduct(slug: string): Promise<Product | null> {
  const data = await serverGet<Product>(`/products/${encodeURIComponent(slug)}`);
  return data ?? PRODUCTS.find((product) => product.slug === slug) ?? null;
}
