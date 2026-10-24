"use client";

import { m } from "framer-motion";
import { KeyRound, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Field, PasswordField } from "@/components/auth/auth-card";
import { Logo } from "@/components/site/logo";
import { api, errorMessage } from "@/lib/client";
import { useSession } from "@/lib/session-store";

export default function AdminLogin() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<"password" | "code">("password");
  const [devCode, setDevCode] = useState<string | null>(null);

  const submitPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api<{ requiresVerification?: boolean; devCode?: string }>("/auth/admin/login", { method: "POST", json: { email, password } });
      if (res.requiresVerification) {
        setStep("code");
        setDevCode(res.devCode ?? null);
        toast.success(`Code sent to ${email}`);
      }
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api("/auth/admin/login/verify", { method: "POST", json: { email, code } });
      await useSession.getState().load();
      toast.success("Signed in");
      router.push("/admin");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative grid min-h-dvh place-items-center overflow-hidden bg-navy px-4">
      <div className="absolute -top-40 -left-40 size-[520px] rounded-full bg-brand-500/40 blur-3xl" />
      <div className="absolute -right-40 -bottom-40 size-[520px] rounded-full bg-violet/30 blur-3xl" />
      {step === "password" ? (
        <m.form key="pw" onSubmit={submitPassword} initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
          <Logo href="/" />
          <h1 className="mt-8 flex items-center gap-2 text-2xl font-semibold"><ShieldCheck className="text-brand-500" /> Admin portal</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your staff account. A security code will be emailed to you.</p>
          <div className="mt-6 space-y-4">
            <Field label="Email" type="email" required autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} />
            <PasswordField label="Password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            <button disabled={busy} className="btn btn-primary h-12 w-full text-base">{busy ? "Checking…" : "Continue"}</button>
          </div>
        </m.form>
      ) : (
        <m.form key="code" onSubmit={submitCode} initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} className="relative w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl sm:p-10">
          <Logo href="/" />
          <h1 className="mt-8 flex items-center gap-2 text-2xl font-semibold"><KeyRound className="text-brand-500" /> Check your email</h1>
          <p className="mt-1 text-sm text-muted">We sent a 6-digit sign-in code to <span className="font-medium text-ink">{email}</span>. It expires in 5 minutes.</p>
          <div className="mt-6 space-y-4">
            <Field label="Sign-in code" inputMode="numeric" required autoComplete="one-time-code" placeholder="6-digit code" value={code} onChange={(e) => setCode(e.target.value)} />
            {devCode && <p className="rounded-xl bg-brand-50 px-4 py-3 text-center font-mono text-lg tracking-[0.3em] text-brand-600">{devCode}</p>}
            <button disabled={busy} className="btn btn-primary h-12 w-full text-base">{busy ? "Verifying…" : "Sign in"}</button>
            <button type="button" onClick={() => { setStep("password"); setCode(""); }} className="btn btn-ghost w-full">Back</button>
          </div>
        </m.form>
      )}
    </div>
  );
}
