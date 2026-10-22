"use client";

import { AnimatePresence, m, useMotionValueEvent, useScroll } from "framer-motion";
import { ChevronDown, CircleDollarSign, FileText, Headset, LogOut, Menu, Search, ShoppingBag, User, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Logo } from "./logo";
import { useCart, cartCount } from "@/lib/cart-store";
import { useSession } from "@/lib/session-store";
import { PRODUCTS, CATEGORIES } from "@/lib/catalog";
import { cn } from "@/lib/format";

const NAV = [
  { href: "/promotions", label: "Promotions" },
  { href: "/services", label: "Services" },
  { href: "/about", label: "About Us" },
];

const CATEGORY_IMAGE: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c, PRODUCTS.find((p) => p.category === c)?.image ?? ""]));

function IconButton({ label, onClick, href, children, badge }: { label: string; onClick?: () => void; href?: string; children: React.ReactNode; badge?: number }) {
  const cls = "relative grid size-11 place-items-center rounded-full bg-canvas text-ink transition-all duration-300 hover:bg-brand-50 hover:text-brand-500 active:scale-90";
  const inner = (
    <>
      {children}
      <AnimatePresence>
        {!!badge && (
          <m.span key={badge} initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="absolute -top-0.5 -right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-brand-500 px-1 text-[10px] font-bold text-white ring-2 ring-white">
            {badge}
          </m.span>
        )}
      </AnimatePresence>
    </>
  );
  return href ? (
    <Link href={href} className={cls} aria-label={label} title={label}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls} aria-label={label} title={label}>
      {inner}
    </button>
  );
}

export function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const { scrollY } = useScroll();
  const [scrolled, setScrolled] = useState(false);
  const [mega, setMega] = useState(false);
  const [mobile, setMobile] = useState(false);
  const [menu, setMenu] = useState(false);
  const [q, setQ] = useState("");
  const count = useCart((s) => cartCount(s.cart));
  const openCart = useCart((s) => s.setOpen);
  const { user, logout } = useSession();

  useMotionValueEvent(scrollY, "change", (y) => setScrolled(y > 8));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    router.push(q.trim() ? `/shop?q=${encodeURIComponent(q.trim())}` : "/shop");
    setMobile(false);
  };

  return (
    <header className={cn("sticky top-0 z-50 bg-white/85 backdrop-blur-xl transition-shadow duration-500", scrolled && "shadow-[0_8px_30px_-12px_rgba(16,24,40,0.15)]")}>
      <div className="container-x flex h-[76px] items-center gap-4 lg:gap-8">
        <button className="grid size-10 place-items-center rounded-full hover:bg-canvas lg:hidden" onClick={() => setMobile(true)} aria-label="Open menu">
          <Menu size={20} />
        </button>
        <Logo />
        <form onSubmit={submit} className="relative hidden max-w-xl flex-1 md:block">
          <Search size={18} className="pointer-events-none absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search here" aria-label="Search products" className="h-11 w-full rounded-xl bg-canvas pr-4 pl-11 text-sm outline-none transition-all duration-300 placeholder:text-muted focus:bg-white focus:ring-4 focus:ring-brand-100" />
        </form>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <span className="hidden sm:contents">
            <IconButton label="Request a quote" href="/cart#quote">
              <FileText size={18} />
            </IconButton>
            <IconButton label="Support" href="/services">
              <Headset size={18} />
            </IconButton>
            <IconButton label="Prices in USD" href="/promotions">
              <CircleDollarSign size={18} />
            </IconButton>
          </span>
          <IconButton label="Cart" onClick={() => openCart(true)} badge={count}>
            <ShoppingBag size={18} />
          </IconButton>
          <div className="relative">
            <button onClick={() => (user ? setMenu((v) => !v) : router.push("/account/login"))} className="relative size-11 overflow-hidden rounded-full bg-gradient-to-br from-brand-400 to-violet ring-2 ring-white transition-transform hover:scale-105" aria-label="Account">
              {user ? <span className="grid size-full place-items-center text-sm font-semibold text-white">{user.firstName[0]}{user.lastName[0]}</span> : <User size={18} className="m-auto text-white" />}
            </button>
            <AnimatePresence>
              {menu && user && (
                <m.div initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 8, scale: 0.96 }} className="absolute right-0 mt-3 w-56 origin-top-right rounded-2xl border border-line bg-white p-2 shadow-xl" onMouseLeave={() => setMenu(false)}>
                  <p className="px-3 py-2 text-xs text-muted">Signed in as<br /><span className="font-medium text-ink">{user.email}</span></p>
                  <Link onClick={() => setMenu(false)} href="/account" className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-canvas"><User size={16} /> My account</Link>
                  <button onClick={() => { setMenu(false); void logout(); }} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-danger hover:bg-danger/5"><LogOut size={16} /> Sign out</button>
                </m.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <nav className="hidden border-t border-line/70 lg:block" onMouseLeave={() => setMega(false)}>
        <div className="container-x flex h-12 items-center gap-10 text-[15px] text-muted">
          <button onMouseEnter={() => setMega(true)} onClick={() => setMega((v) => !v)} className={cn("flex items-center gap-2 transition-colors hover:text-ink", (mega || pathname.startsWith("/shop")) && "text-ink")}>
            <svg viewBox="0 0 20 20" className="size-4" fill="currentColor"><rect x="2" y="2" width="7" height="7" rx="2" /><rect x="11" y="2" width="7" height="7" rx="2" opacity=".5" /><rect x="2" y="11" width="7" height="7" rx="2" opacity=".5" /><rect x="11" y="11" width="7" height="7" rx="2" /></svg>
            Products <ChevronDown size={15} className={cn("transition-transform duration-300", mega && "rotate-180")} />
          </button>
          {NAV.map((item) => (
            <Link key={item.href} href={item.href} className={cn("relative py-3 transition-colors hover:text-ink", pathname === item.href && "text-ink")}>
              {item.label}
              {pathname === item.href && <m.span layoutId="nav-underline" className="absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-brand-500" />}
            </Link>
          ))}
        </div>
        <AnimatePresence>
          {mega && (
            <m.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="absolute inset-x-0 top-full border-t border-line bg-white shadow-[0_30px_60px_-30px_rgba(16,24,40,0.25)]">
              <div className="container-x grid grid-cols-6 gap-4 py-6">
                {CATEGORIES.map((c, i) => (
                  <m.div key={c} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                    <Link href={`/shop?category=${c}`} onClick={() => setMega(false)} className="group block rounded-2xl p-3 transition-colors hover:bg-canvas">
                      <div className="relative mb-3 aspect-[4/3] overflow-hidden rounded-xl bg-canvas">
                        <Image src={CATEGORY_IMAGE[c]} alt={c} fill sizes="200px" className="object-cover transition-transform duration-700 group-hover:scale-110" />
                      </div>
                      <p className="font-medium text-ink">{c}</p>
                      <p className="text-xs text-muted">{PRODUCTS.filter((p) => p.category === c).length} products</p>
                    </Link>
                  </m.div>
                ))}
                <Link href="/shop" onClick={() => setMega(false)} className="flex flex-col justify-end rounded-2xl bg-gradient-to-br from-brand-500 to-brand-800 p-5 text-white">
                  <p className="text-xs text-white/70">Everything</p>
                  <p className="text-lg font-semibold">Shop all →</p>
                </Link>
              </div>
            </m.div>
          )}
        </AnimatePresence>
      </nav>

      <AnimatePresence>
        {mobile && (
          <>
            <m.div className="fixed inset-0 z-[60] h-dvh bg-ink/30" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobile(false)} />
            <m.div data-lenis-prevent className="fixed top-0 left-0 z-[61] flex h-dvh w-[86%] max-w-sm flex-col overflow-y-auto bg-white p-5" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}>
              <div className="mb-6 flex items-center justify-between">
                <Logo />
                <button onClick={() => setMobile(false)} className="grid size-10 place-items-center rounded-full bg-canvas" aria-label="Close menu"><X size={18} /></button>
              </div>
              <form onSubmit={submit} className="relative mb-6">
                <Search size={18} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search here" className="h-11 w-full rounded-xl bg-canvas pl-11 text-sm outline-none" />
              </form>
              <p className="mb-2 text-xs font-semibold tracking-wider text-muted uppercase">Products</p>
              {CATEGORIES.map((c) => (
                <Link key={c} href={`/shop?category=${c}`} onClick={() => setMobile(false)} className="rounded-lg px-3 py-2.5 hover:bg-canvas">{c}</Link>
              ))}
              <div className="my-4 h-px bg-line" />
              {[{ href: "/shop", label: "Shop all" }, ...NAV, { href: "/cart", label: "Cart & quote" }, { href: user ? "/account" : "/account/login", label: user ? "My account" : "Sign in" }].map((item) => (
                <Link key={item.href} href={item.href} onClick={() => setMobile(false)} className="rounded-lg px-3 py-2.5 hover:bg-canvas">{item.label}</Link>
              ))}
            </m.div>
          </>
        )}
      </AnimatePresence>
    </header>
  );
}
