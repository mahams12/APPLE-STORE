import type { Metadata } from "next";
import { Suspense } from "react";
import { ShopView } from "@/components/shop/shop-view";
import { getProducts } from "@/lib/api";

export const metadata: Metadata = { title: "Shop", description: "Browse iPhone, iPad, Mac, Watch and AirPods with retail and wholesale prices." };
export const revalidate = 60;

export default async function ShopPage() {
  const products = await getProducts();
  return (
    <Suspense>
      <ShopView products={products} />
    </Suspense>
  );
}
