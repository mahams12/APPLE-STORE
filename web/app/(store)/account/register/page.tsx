"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { useCart } from "@/lib/cart-store";
import { api, errorMessage } from "@/lib/client";
import { useSession } from "@/lib/session-store";

export default function RegisterPage() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [f, setF] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const strength = [/.{8,}/, /[A-Z]/, /\d/, /[^A-Za-z0-9]/].filter((r) => r.test(f.password)).length;
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/register", { method: "POST", json: f });
      await Promise.all([useSession.getState().load(), useCart.getState().hydrate()]);
      toast.success("Account created. Check your email to verify it.");
      router.push("/account");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthCard title="Create account" subtitle="Get wholesale pricing, quotes and order tracking." footer={<>Already have an account? <Link href="/account/login" className="text-brand-500 hover:underline">Sign in</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Field label="First name" required autoComplete="given-name" value={f.firstName} onChange={(e) => setF({ ...f, firstName: e.target.value })} />
          <Field label="Last name" required autoComplete="family-name" value={f.lastName} onChange={(e) => setF({ ...f, lastName: e.target.value })} />
        </div>
        <Field label="Email" type="email" required autoComplete="email" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
        <div>
          <Field label="Password" type="password" required minLength={8} autoComplete="new-password" value={f.password} onChange={(e) => setF({ ...f, password: e.target.value })} />
          <div className="mt-2 grid grid-cols-4 gap-1.5">
            {[0, 1, 2, 3].map((i) => <span key={i} className={`h-1 rounded-full transition-colors duration-300 ${i < strength ? (strength < 3 ? "bg-star" : "bg-success") : "bg-line"}`} />)}
          </div>
          <p className="mt-1 text-xs text-muted">At least 8 characters with a number and an uppercase letter.</p>
        </div>
        <button disabled={busy} className="btn btn-primary h-12 w-full text-base">{busy ? "Creating…" : "Create account"}</button>
      </form>
    </AuthCard>
  );
}
