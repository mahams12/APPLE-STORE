import type { Metadata } from "next";
import { Headset, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Reveal } from "@/components/ui/reveal";

export const metadata: Metadata = { title: "Services & support" };

const SERVICES = [
  { id: "shipping", icon: Truck, title: "Shipping & handling", body: "Orders placed before 2pm ship the same day. Free tracked shipping over $50; flat $12 otherwise." },
  { id: "returns", icon: RotateCcw, title: "Returns policy", body: "Return any unopened product within 14 days for a full refund. Opened items can be exchanged." },
  { id: "warranty", icon: ShieldCheck, title: "Warranty", body: "Every product includes the 1-year Apple limited warranty. AppleCare+ can be added at checkout." },
  { id: "contact", icon: Headset, title: "Contact us", body: "hello@istore.example · +1 (415) 555-0190 · Mon–Fri, 9am–6pm PT." },
];

const FAQ = [
  ["Do you offer wholesale pricing?", "Yes. Every product shows its wholesale price — the more you buy, the better the unit price."],
  ["How do I pay?", "By card at checkout, or choose bank transfer / cash on delivery. Card payments are handled on our secure hosted page."],
  ["Are products genuine?", "All products are brand new, sealed and sourced from authorised distributors."],
  ["How do I track my order?", "Open your account, choose the order and you'll see live status and the tracking number."],
];

export default function ServicesPage() {
  return (
    <div className="container-x space-y-12 py-10">
      <Reveal><h1 className="text-4xl font-semibold tracking-tight">How can we help?</h1><p className="mt-2 text-muted">Shipping, returns, warranty and business support.</p></Reveal>
      <div className="grid gap-5 sm:grid-cols-2">
        {SERVICES.map(({ id, icon: Icon, title, body }, i) => (
          <Reveal key={id} delay={i * 0.06} id={id} className="card scroll-mt-40 p-6">
            <span className="grid size-11 place-items-center rounded-xl bg-brand-50 text-brand-500"><Icon size={20} /></span>
            <h2 className="mt-4 text-lg font-semibold">{title}</h2>
            <p className="mt-1 text-sm text-muted">{body}</p>
          </Reveal>
        ))}
      </div>
      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Reveal id="faq" className="card scroll-mt-40 p-6">
          <h2 className="mb-2 text-xl font-semibold">FAQ&apos;s</h2>
          {FAQ.map(([q, a]) => (
            <details key={q} className="group border-b border-line py-4 last:border-0">
              <summary className="flex cursor-pointer list-none items-center justify-between font-medium">{q}<span className="text-brand-500 transition-transform duration-300 group-open:rotate-45">+</span></summary>
              <p className="mt-2 text-sm text-muted">{a}</p>
            </details>
          ))}
        </Reveal>
        <Reveal className="card p-6">
          <h2 className="text-xl font-semibold">Still need help?</h2>
          <p className="mt-2 text-sm text-muted">Our team replies within one business day.</p>
          <div className="mt-5 space-y-3 text-sm">
            <p className="flex items-center justify-between rounded-xl bg-canvas px-4 py-3"><span className="text-muted">Email</span><span className="font-medium">hello@istore.example</span></p>
            <p className="flex items-center justify-between rounded-xl bg-canvas px-4 py-3"><span className="text-muted">Phone</span><span className="font-medium">+1 (415) 555-0190</span></p>
            <p className="flex items-center justify-between rounded-xl bg-canvas px-4 py-3"><span className="text-muted">Hours</span><span className="font-medium">Mon–Fri, 9am–6pm PT</span></p>
          </div>
        </Reveal>
      </div>
    </div>
  );
}
