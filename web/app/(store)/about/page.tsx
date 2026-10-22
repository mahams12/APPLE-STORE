import type { Metadata } from "next";
import Image from "next/image";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = { title: "About us" };

const STATS = [["68k+", "Newsletter readers"], ["12k", "Orders shipped"], ["1.4k", "Business accounts"], ["4.8★", "Average rating"]];

export default function AboutPage() {
  return (
    <div className="container-x space-y-14 py-10">
      <div className="grid items-center gap-10 lg:grid-cols-2">
        <Reveal>
          <p className="text-xs font-semibold tracking-[0.2em] text-brand-500 uppercase">About I.STORE</p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">Apple products for people and for businesses.</h1>
          <p className="mt-5 text-lg text-muted">We started I.STORE to make buying Apple gear simple for everyone, from one AirPods case to a hundred MacBooks for a new office. Retail and wholesale prices sit side by side, and every company account comes with users, roles, credit and quotes.</p>
        </Reveal>
        <Reveal delay={0.1} className="relative aspect-[4/3] overflow-hidden rounded-3xl"><Image src="/products/imac.jpg" alt="iMac on a desk" fill sizes="(max-width: 1024px) 100vw, 50vw" className="object-cover" /></Reveal>
      </div>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {STATS.map(([v, l], i) => (
          <Reveal key={l} delay={i * 0.06} className="card p-6 text-center"><p className="text-gradient text-4xl font-semibold">{v}</p><p className="mt-1 text-sm text-muted">{l}</p></Reveal>
        ))}
      </div>
      <Reveal id="team" className="card scroll-mt-40 p-8">
        <h2 className="text-2xl font-semibold">Our team</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          {[["Kibriya Zameer", "Founder & CEO"], ["Zuraid Zameer", "Operations"], ["Ava Cole", "Business sales"]].map(([n, r]) => (
            <div key={n} className="flex items-center gap-3 rounded-xl bg-canvas p-4"><span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet font-semibold text-white">{n[0]}</span><div><p className="font-medium">{n}</p><p className="text-xs text-muted">{r}</p></div></div>
          ))}
        </div>
      </Reveal>
      <Reveal id="partners" className="scroll-mt-40 text-center text-sm text-muted">Authorised partners: Apple · Ingram Micro · TD Synnex · DHL · FedEx</Reveal>
    </div>
  );
}
