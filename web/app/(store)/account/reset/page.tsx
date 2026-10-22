"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { toast } from "sonner";
import { AuthCard, Field } from "@/components/auth/auth-card";
import { api, errorMessage } from "@/lib/client";

function Reset() {
  const token = useSearchParams().get("token") || "";
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/reset", { method: "POST", json: { token, password } });
      toast.success("Password updated. Please sign in.");
      router.push("/account/login");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  return (
    <AuthCard title="Choose a new password" footer={<Link href="/account/login" className="text-brand-500 hover:underline">Back to sign in</Link>}>
      {!token ? <p className="text-sm text-danger">This reset link is missing its token. Request a new one.</p> : (
        <form onSubmit={submit} className="space-y-4">
          <Field label="New password" type="password" minLength={8} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          <button disabled={busy} className="btn btn-primary h-12 w-full">{busy ? "Saving…" : "Update password"}</button>
        </form>
      )}
    </AuthCard>
  );
}

export default function ResetPage() {
  return <Suspense><Reset /></Suspense>;
}
