"use client";

import { m, useScroll, useTransform } from "framer-motion";
import { ArrowRight, ShieldCheck, Truck, RotateCcw } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

const ease = [0.16, 1, 0.3, 1] as const;

export function Hero() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const rotate = useTransform(scrollYProgress, [0, 1], [0, -8]);

  return (
    <section ref={ref} className="relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -right-40 size-[620px] rounded-full bg-brand-300/30 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -left-40 size-[520px] rounded-full bg-violet/15 blur-3xl" />
      <div className="container-x relative grid items-center gap-10 py-14 lg:grid-cols-2 lg:py-24">
        <div>
          <m.span initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease }} className="inline-flex items-center gap-2 rounded-full border border-brand-100 bg-white px-3 py-1.5 text-xs font-medium text-brand-600 shadow-sm">
            <span className="size-1.5 animate-pulse rounded-full bg-success" /> New: iPhone 16 Pro now in stock
          </m.span>
          <h1 className="mt-6 text-[42px] leading-[1.05] font-semibold tracking-tight sm:text-6xl lg:text-[68px]">
            {["Premium Apple.", "Retail &"].map((line, i) => (
              <m.span key={line} className="block" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.08 + i * 0.1 }}>
                {line}
              </m.span>
            ))}
            <m.span className="text-gradient block animate-[shimmer_6s_linear_infinite]" initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.9, ease, delay: 0.28 }}>
              wholesale prices.
            </m.span>
          </h1>
          <m.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45, duration: 0.8 }} className="mt-6 max-w-lg text-lg text-muted">
            iPhone, iPad, Mac, Watch and AirPods — shipped fast to your door, with business pricing, quotes and team accounts built in.
          </m.p>
          <m.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55, duration: 0.7, ease }} className="mt-8 flex flex-wrap gap-3">
            <Link href="/shop" className="btn btn-primary h-12 px-7 text-base">
              Shop now <ArrowRight size={18} />
            </Link>
            <Link href="/cart#quote" className="btn btn-outline h-12 px-7 text-base">
              Request a quote
            </Link>
          </m.div>
          <m.ul initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.75 }} className="mt-10 flex flex-wrap gap-x-8 gap-y-3 text-sm text-muted">
            <li className="flex items-center gap-2"><Truck size={16} className="text-brand-500" /> Free shipping over $50</li>
            <li className="flex items-center gap-2"><ShieldCheck size={16} className="text-brand-500" /> 1-year warranty</li>
            <li className="flex items-center gap-2"><RotateCcw size={16} className="text-brand-500" /> 14-day returns</li>
          </m.ul>
        </div>
        <m.div style={{ y }} className="relative mx-auto aspect-square w-full max-w-[560px]">
          <m.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1.1, ease }} className="absolute inset-[6%] overflow-hidden rounded-[40px] shadow-[0_50px_100px_-40px_rgba(30,40,120,0.55)]">
            <m.div style={{ rotate }} className="absolute inset-0 scale-110">
              <Image src="/products/iphone-pro.jpg" alt="iPhone 16 Pro" fill priority sizes="(max-width: 1024px) 90vw, 560px" className="object-cover" />
            </m.div>
          </m.div>
          <m.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7, duration: 0.8, ease }} className="absolute bottom-[10%] -left-2 animate-float rounded-2xl bg-white/90 p-4 shadow-xl backdrop-blur sm:left-0">
            <p className="text-xs text-muted">Wholesale from</p>
            <p className="text-2xl font-semibold text-brand-500">$1,149</p>
            <p className="text-xs text-muted line-through">$1,299 RR</p>
          </m.div>
          <m.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.85, duration: 0.8, ease }} className="absolute top-[12%] -right-2 animate-float rounded-2xl bg-white/90 p-3 shadow-xl backdrop-blur [animation-delay:1.5s] sm:right-0">
            <div className="flex items-center gap-3">
              <div className="relative size-12 overflow-hidden rounded-xl"><Image src="/products/airpods.jpg" alt="" fill sizes="48px" className="object-cover" /></div>
              <div>
                <p className="text-sm font-medium">AirPods Pro 2</p>
                <p className="text-xs text-success">● In stock · ships today</p>
              </div>
            </div>
          </m.div>
        </m.div>
      </div>
    </section>
  );
}
