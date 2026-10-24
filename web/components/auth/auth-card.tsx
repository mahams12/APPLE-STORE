"use client";

import { AnimatePresence, m } from "framer-motion";
import { Eye, EyeOff } from "lucide-react";
import Image from "next/image";
import { useState } from "react";

export function AuthCard({ title, subtitle, children, footer }: { title: string; subtitle?: string; children: React.ReactNode; footer?: React.ReactNode }) {
  return (
    <div className="container-x py-10">
      <div className="card mx-auto grid max-w-5xl overflow-hidden lg:grid-cols-2">
        <div className="relative hidden min-h-[560px] lg:block">
          <Image src="/products/phone-hand.jpg" alt="" fill sizes="50vw" className="object-cover" priority />
          <div className="absolute inset-0 bg-gradient-to-t from-navy/90 via-navy/30 to-transparent" />
          <div className="absolute inset-x-10 bottom-10 text-white">
            <p className="text-3xl font-semibold tracking-tight">Everything Apple, in one place.</p>
            <p className="mt-2 text-white/70">Track orders, save your addresses and check out faster.</p>
          </div>
        </div>
        <m.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="flex flex-col justify-center p-8 sm:p-12">
          <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-muted">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-6 text-sm text-muted">{footer}</div>}
        </m.div>
      </div>
    </div>
  );
}

export function Field({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block">
      <span className="label">{label}</span>
      <input className="input" {...props} />
    </label>
  );
}

export function PasswordField({ label, ...props }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "type"> & { label: string }) {
  const [show, setShow] = useState(false);
  return (
    <label className="block">
      <span className="label">{label}</span>
      <div className="relative">
        <input className="input pr-12" type={show ? "text" : "password"} {...props} />
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute right-2 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-ink"
        >
          <AnimatePresence mode="wait" initial={false}>
            <m.span
              key={show ? "hide" : "show"}
              initial={{ opacity: 0, scale: 0.4, rotate: -120 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: 0.4, rotate: 120 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="grid place-items-center"
            >
              {show ? <EyeOff size={18} /> : <Eye size={18} />}
            </m.span>
          </AnimatePresence>
        </button>
      </div>
    </label>
  );
}
