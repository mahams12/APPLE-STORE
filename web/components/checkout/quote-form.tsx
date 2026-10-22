"use client";

import { m } from "framer-motion";
import { Check, FileText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { api, ApiError, errorMessage } from "@/lib/client";
import { useSession } from "@/lib/session-store";

export function QuoteForm({ suggested = 0, compact = false }: { suggested?: number; compact?: boolean }) {
  const user = useSession((s) => s.user);
  const [form, setForm] = useState({ name: "", email: "", amount: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const name = form.name || (user ? `${user.firstName} ${user.lastName}` : "");
  const email = form.email || user?.email || "";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount || suggested);
    if (!name || !email.includes("@") || !(amount > 0)) return toast.error("Add your name, email and a target amount.");
    setBusy(true);
    try {
      await api("/quotes", { method: "POST", json: { name, email, amount, note: form.note } });
      setSent(true);
    } catch (error) {
      if (error instanceof ApiError && error.offline) setSent(true);
      else toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  if (sent)
    return (
      <m.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center py-8 text-center">
        <span className="grid size-14 place-items-center rounded-full bg-success/10 text-success"><Check /></span>
        <p className="mt-4 font-semibold">Quote submitted</p>
        <p className="mt-1 text-sm text-muted">Our sales team will reply to {email} within one business day.</p>
        <button onClick={() => { setSent(false); setForm({ name: "", email: "", amount: "", note: "" }); }} className="btn btn-ghost mt-4">Send another</button>
      </m.div>
    );

  return (
    <form onSubmit={submit} className="space-y-3">
      {!compact && (
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-brand-50 text-brand-500"><FileText size={18} /></span>
          <div><h3 className="font-semibold">Request a quote</h3><p className="text-xs text-muted">Buying in volume? Tell us your target price.</p></div>
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <input className="input" placeholder="Full name" value={name} onChange={(e) => setForm({ ...form, name: e.target.value })} aria-label="Full name" />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setForm({ ...form, email: e.target.value })} aria-label="Email" />
      </div>
      <input className="input" inputMode="decimal" placeholder={suggested ? `Target amount (cart is $${suggested.toFixed(2)})` : "Target amount (USD)"} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/[^\d.]/g, "") })} aria-label="Target amount" />
      <textarea className="input min-h-24 py-3" placeholder="Products, quantities, delivery timeline…" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} aria-label="Notes" />
      <button disabled={busy} className="btn btn-primary w-full">{busy ? "Submitting…" : "Submit Quote"}</button>
    </form>
  );
}
