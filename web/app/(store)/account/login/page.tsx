"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { useCart } from "@/lib/cart-store";
import { api, errorMessage } from "@/lib/client";
import { useSession } from "@/lib/session-store";

function Login() {
  const router = useRouter();
  const next = useSearchParams().get("next") || "/account";
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/login", { method: "POST", json: { email, password } });
      await Promise.all([useSession.getState().load(), useCart.getState().hydrate()]);
      toast.success("Welcome back!");
      router.push(next);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthCard title="Sign in" subtitle="Welcome back to I.STORE." footer={<>New here? <Link href="/account/register" className="text-brand-500 hover:underline">Create an account</Link></>}>
      <form onSubmit={submit} className="space-y-4">
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        <Field label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        <div className="flex justify-end"><Link href="/account/forgot" className="text-sm text-brand-500 hover:underline">Forgot password?</Link></div>
        <button disabled={busy} className="btn btn-primary h-12 w-full text-base">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </AuthCard>
  );
}

export default function LoginPage() {
  return <Suspense><Login /></Suspense>;
}
