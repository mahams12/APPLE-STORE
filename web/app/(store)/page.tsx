import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight, BadgePercent, Building2, FileText, Truck } from "lucide-react";
import { Hero } from "@/components/home/hero";
import { BestSelling } from "@/components/home/best-selling";
import { Newsletter } from "@/components/site/newsletter";
import { Reveal, Stagger } from "@/components/ui/reveal";
import { SectionTitle } from "@/components/ui/misc";
import { getProducts } from "@/lib/api";
import { CATEGORIES } from "@/lib/catalog";

export const revalidate = 60;

const PERKS = [
  { icon: Truck, title: "Fast, free delivery", body: "Free shipping on orders over $50, tracked to your door." },
  { icon: BadgePercent, title: "Wholesale pricing", body: "Every product shows retail and wholesale price side-by-side." },
  { icon: FileText, title: "Order tracking", body: "Follow every order from checkout to your door, live." },
  { icon: Building2, title: "Secure checkout", body: "Card, bank transfer or cash on delivery — your payment stays protected." },
];

export default async function HomePage() {
  const products = await getProducts();
  const categoryCards = CATEGORIES.map((c) => ({ name: c, product: products.find((p) => p.category === c) })).filter((c) => c.product);
  return (
    <>
      <Hero />
      <div className="container-x space-y-16 pb-8">
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {PERKS.map(({ icon: Icon, title, body }) => (
            <Reveal key={title} className="card group p-5 transition-shadow duration-500 hover:shadow-lg">
              <div className="mb-4 grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-500 transition-transform duration-500 group-hover:scale-110 group-hover:rotate-6">
                <Icon size={20} />
              </div>
              <p className="font-semibold">{title}</p>
              <p className="mt-1 text-sm text-muted">{body}</p>
            </Reveal>
          ))}
        </Stagger>

        <section>
          <SectionTitle eyebrow="Browse" title="Shop by category" action={<Link href="/shop" className="text-sm text-brand-500 hover:underline">View all</Link>} />
          <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
            {categoryCards.map(({ name, product }, i) => (
              <Reveal key={name} delay={i * 0.06} className={i === 0 ? "col-span-2 row-span-2 md:col-span-2" : ""}>
                <Link href={`/shop?category=${name}`} className="group relative block h-full min-h-44 overflow-hidden rounded-2xl bg-white">
                  <Image src={product!.image} alt={name} fill sizes="(max-width: 768px) 50vw, 25vw" className="object-cover transition-transform duration-[1200ms] ease-out-expo group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent" />
                  <div className="absolute inset-x-4 bottom-4 flex items-end justify-between text-white">
                    <div>
                      <p className={i === 0 ? "text-3xl font-semibold" : "text-lg font-semibold"}>{name}</p>
                      <p className="text-xs text-white/75">{products.filter((p) => p.category === name).length} products</p>
                    </div>
                    <span className="grid size-9 place-items-center rounded-full bg-white/20 backdrop-blur transition-all duration-500 group-hover:rotate-45 group-hover:bg-white group-hover:text-ink">
                      <ArrowUpRight size={16} />
                    </span>
                  </div>
                </Link>
              </Reveal>
            ))}
          </div>
        </section>

        <Reveal>
          <BestSelling products={products} />
        </Reveal>

        <Reveal>
          <section className="relative overflow-hidden rounded-3xl bg-navy px-6 py-12 text-white sm:px-12">
            <div className="absolute -top-24 -right-24 size-96 rounded-full bg-brand-500/40 blur-3xl" />
            <div className="relative grid items-center gap-8 md:grid-cols-2">
              <div>
                <p className="text-xs font-semibold tracking-[0.2em] text-brand-300 uppercase">Members get more</p>
                <h2 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Unlock member pricing and faster checkout.</h2>
                <p className="mt-4 text-white/70">Create an account to check out faster, save your addresses and track every order in one place.</p>
                <div className="mt-7 flex flex-wrap gap-3">
                  <Link href="/account" className="btn h-12 bg-white px-6 text-navy hover:bg-brand-50">My account</Link>
                  <Link href="/shop" className="btn h-12 border border-white/25 px-6 text-white hover:bg-white/10">Start shopping</Link>
                </div>
              </div>
              <div className="relative hidden aspect-[4/3] overflow-hidden rounded-2xl md:block">
                <Image src="/products/macbook.jpg" alt="MacBook Pro" fill sizes="50vw" className="object-cover" />
              </div>
            </div>
          </section>
        </Reveal>

        <Reveal>
          <Newsletter />
        </Reveal>
      </div>
    </>
  );
}
