"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { AuthCard } from "@/components/auth/auth-card";
import { api, errorMessage } from "@/lib/client";

function Verify() {
  const token = useSearchParams().get("token") || "";
  const [state, setState] = useState<{ ok: boolean; message: string } | null>(null);
  useEffect(() => {
    if (!token) return setState({ ok: false, message: "This verification link is missing its token." });
    api("/auth/verify", { method: "POST", json: { token } })
      .then(() => setState({ ok: true, message: "Your email is verified. Thanks!" }))
      .catch((e) => setState({ ok: false, message: errorMessage(e) }));
  }, [token]);
  return (
    <AuthCard title="Email verification" footer={<Link href="/account" className="text-brand-500 hover:underline">Go to my account</Link>}>
      {!state ? <div className="skeleton h-14" /> : <p className={`rounded-xl p-4 text-sm ${state.ok ? "bg-success/10 text-success" : "bg-danger/10 text-danger"}`}>{state.message}</p>}
    </AuthCard>
  );
}

export default function VerifyPage() {
  return <Suspense><Verify /></Suspense>;
}
