import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ProductDetail } from "@/components/product/product-detail";
import { ProductCard } from "@/components/product/product-card";
import { Stagger } from "@/components/ui/reveal";
import { getProduct, getProducts } from "@/lib/api";
import { PRODUCTS } from "@/lib/catalog";

export const revalidate = 60;

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const product = await getProduct((await params).slug);
  if (!product) return { title: "Product not found" };
  return { title: product.name, description: product.description.slice(0, 155), openGraph: { images: [product.image] } };
}

export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [product, all] = await Promise.all([getProduct(slug), getProducts()]);
  if (!product) notFound();
  const related = all.filter((p) => p.slug !== product.slug && p.category === product.category).concat(all.filter((p) => p.category !== product.category && p.popular)).slice(0, 4);
  return (
    <div className="container-x py-8">
      <nav className="mb-6 text-sm text-muted">
        <Link href="/" className="hover:text-ink">Home</Link>/<Link href="/shop" className="hover:text-ink">New</Link>/<Link href={`/shop?category=${product.category}`} className="hover:text-ink">{product.category}</Link>
      </nav>
      <ProductDetail product={product} />
      {related.length > 0 && (
        <section className="mt-14">
          <h2 className="mb-6 text-2xl font-medium">Related Products</h2>
          <Stagger className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {related.map((p) => <ProductCard key={p.id} product={p} />)}
          </Stagger>
        </section>
      )}
    </div>
  );
}
