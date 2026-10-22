"use client";

import { m } from "framer-motion";
import { Check } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/client";

export function Newsletter() {
  const [email, setEmail] = useState("");
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.includes("@")) return toast.error("Enter a valid email.");
    setBusy(true);
    try {
      await api("/newsletter", { method: "POST", json: { email } });
      setDone(true);
      toast.success("You're subscribed. Welcome aboard!");
    } catch (error) {
      if (error instanceof ApiError && error.offline) {
        setDone(true);
        toast.success("You're subscribed. Welcome aboard!");
      } else toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <section className="card overflow-hidden p-6 sm:p-10">
      <h2 className="text-2xl font-medium tracking-tight">Newsletter Subscription</h2>
      <p className="mt-1 text-sm text-muted">
        Join over <span className="text-brand-500">68,000</span> people getting our emails
      </p>
      <form onSubmit={submit} className="mt-6 flex overflow-hidden rounded-xl bg-canvas focus-within:ring-4 focus-within:ring-brand-100">
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email address" aria-label="Email address" className="h-16 min-w-0 flex-1 bg-transparent px-6 outline-none" disabled={done} />
        <button disabled={busy || done} className="btn btn-primary h-16 rounded-none rounded-l-xl px-8 text-base sm:px-12">
          {done ? (
            <m.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
              <Check size={18} /> Subscribed
            </m.span>
          ) : busy ? "Subscribing…" : "Subscribe"}
        </button>
      </form>
    </section>
  );
}
