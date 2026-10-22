"use client";

import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { api, errorMessage } from "@/lib/client";

export default function ForgotPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/forgot", { method: "POST", json: { email } });
      setSent(true);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthCard title="Reset password" subtitle="We'll email you a secure reset link." footer={<Link href="/account/login" className="text-brand-500 hover:underline">Back to sign in</Link>}>
      {sent ? (
        <p className="rounded-xl bg-success/10 p-4 text-sm text-success">If an account exists for {email}, a reset link is on its way.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <button disabled={busy} className="btn btn-primary h-12 w-full">{busy ? "Sending…" : "Send reset link"}</button>
        </form>
      )}
    </AuthCard>
  );
}
