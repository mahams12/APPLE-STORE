"use client";

import { m } from "framer-motion";
import { Building2, MapPin, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Toggle } from "@/components/admin/ui";
import { COMPANY } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Company } from "@/lib/types";

export default function CompanyPage() {
  const { data, live, setData } = useAdminData<Company>("/settings", (r) => ({ ...COMPANY, ...(r as Company), addresses: (r as Company).addresses?.length ? (r as Company).addresses : COMPANY.addresses }), COMPANY);
  const [f, setF] = useState(data);
  const [busy, setBusy] = useState(false);
  useEffect(() => setF(data), [data]);
  const used = Math.min(100, (f.creditUsed / Math.max(1, f.creditLimit)) * 100);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (live) await api("/admin/settings", { method: "PUT", json: { name: f.name, email: f.email, phone: f.phone, regNo: f.regNo, taxId: f.taxId, creditLimit: Number(f.creditLimit) } });
      setData(f);
      toast.success("Company information saved");
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const input = (k: keyof Company, label: string, type = "text") => (
    <label className="block"><span className="label">{label}</span><input className="input" type={type} value={String(f[k] ?? "")} onChange={(e) => setF({ ...f, [k]: type === "number" ? Number(e.target.value) : e.target.value })} /></label>
  );

  return (
    <form onSubmit={save}>
      <PageHeader title="Company Information" subtitle="Details shown on invoices and quotes." actions={<button disabled={busy} className="btn btn-primary"><Save size={16} /> {busy ? "Saving…" : "Save changes"}</button>} />
      <DemoBanner live={live} />
      <div className="grid items-start gap-6 xl:grid-cols-[1.5fr_1fr]">
        <section className="card p-6">
          <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold"><Building2 size={18} className="text-brand-500" /> Details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {input("name", "Company name")}{input("email", "Email", "email")}{input("phone", "Phone")}{input("regNo", "Registration number")}{input("taxId", "Tax ID")}
            <label className="block"><span className="label">Tax rate</span><input className="input" value={`${(f.taxRate * 100).toFixed(1)}%`} readOnly /></label>
          </div>
          <div className="mt-5 flex items-center justify-between rounded-xl bg-canvas p-4"><div><p className="font-medium">Online orders only</p><p className="text-xs text-muted">Disable phone and in-person orders.</p></div><Toggle checked={f.onlineOnly} onChange={(v) => setF({ ...f, onlineOnly: v })} label="Online orders only" /></div>
        </section>
        <div className="space-y-6">
          <section id="credit" className="card scroll-mt-24 p-6">
            <h2 className="text-lg font-semibold">Credit</h2>
            <p className="mt-4 text-3xl font-semibold">{money(f.creditLimit - f.creditUsed)}<span className="ml-2 text-sm font-normal text-muted">available</span></p>
            <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-canvas"><m.div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-violet" initial={{ width: 0 }} animate={{ width: `${used}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} /></div>
            <div className="mt-2 flex justify-between text-xs text-muted"><span>Used {money(f.creditUsed)}</span><span>Limit {money(f.creditLimit)}</span></div>
            <div className="mt-5">{input("creditLimit", "Credit limit (USD)", "number")}</div>
          </section>
          <section id="addresses" className="card scroll-mt-24 p-6">
            <h2 className="mb-4 text-lg font-semibold">Addresses</h2>
            <ul className="space-y-3">
              {f.addresses.map((a) => (
                <li key={a.label} className="flex gap-3 rounded-xl border border-line p-4"><MapPin size={18} className="mt-0.5 text-brand-500" /><div><p className="font-medium">{a.label}</p><p className="text-sm text-muted">{a.line}, {a.city} {a.postal}</p></div></li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </form>
  );
}
