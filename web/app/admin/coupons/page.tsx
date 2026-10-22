"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, Table, Toggle } from "@/components/admin/ui";
import { api, errorMessage } from "@/lib/client";
import { useAdminData } from "@/lib/use-admin";
import type { Coupon } from "@/lib/types";

const DEMO: Coupon[] = [
  { id: "c1", code: "APPLE10", type: "PERCENT", amount: 10, active: true },
  { id: "c2", code: "STUDENT15", type: "PERCENT", amount: 15, active: true },
  { id: "c3", code: "FREESHIP", type: "SHIPPING", amount: 0, active: true },
];

export default function CouponsPage() {
  const { data, setData, live, reload } = useAdminData<Coupon[]>("/admin/coupons", (r) => (r as { coupons: Coupon[] }).coupons, DEMO);
  const [f, setF] = useState({ code: "", type: "PERCENT", amount: 10 });
  const save = async (c: Omit<Coupon, "id"> & { id?: string }) => {
    try {
      if (live) {
        await api("/admin/coupons", { method: "POST", json: { code: c.code, type: c.type, amount: Number(c.amount), active: c.active } });
        await reload();
      } else {
        const exists = data.find((x) => x.code === c.code);
        setData(exists ? data.map((x) => (x.code === c.code ? { ...x, ...c } : x)) : [{ ...c, id: `c${Date.now()}` }, ...data]);
      }
      return true;
    } catch (error) {
      toast.error(errorMessage(error));
      return false;
    }
  };
  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!f.code) return;
    if (await save({ ...f, code: f.code.toUpperCase(), active: true })) {
      toast.success("Coupon created");
      setF({ code: "", type: "PERCENT", amount: 10 });
    }
  };
  return (
    <>
      <PageHeader title="Coupons" subtitle="Discount codes customers can use at checkout." />
      <DemoBanner live={live} />
      <form onSubmit={create} className="card mb-5 grid gap-3 p-5 sm:grid-cols-[1fr_180px_140px_auto]">
        <input className="input uppercase placeholder:normal-case" placeholder="Code e.g. SPRING20" value={f.code} onChange={(e) => setF({ ...f, code: e.target.value })} aria-label="Code" />
        <select className="input" value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} aria-label="Type"><option value="PERCENT">Percent off</option><option value="FIXED">Fixed amount</option><option value="SHIPPING">Free shipping</option></select>
        <input className="input" type="number" min={0} value={f.amount} onChange={(e) => setF({ ...f, amount: Number(e.target.value) })} aria-label="Amount" disabled={f.type === "SHIPPING"} />
        <button className="btn btn-primary"><Plus size={16} /> Create</button>
      </form>
      <Table head={["Code", "Type", "Value", "Active"]} empty={!data.length}>
        {data.map((c, i) => (
          <Row key={c.id} i={i}>
            <td className="font-mono font-semibold">{c.code}</td>
            <td className="text-muted">{c.type}</td>
            <td>{c.type === "PERCENT" ? `${c.amount}%` : c.type === "SHIPPING" ? "Free shipping" : `$${c.amount}`}</td>
            <td><Toggle checked={c.active} onChange={(v) => save({ ...c, active: v })} label={`Toggle ${c.code}`} /></td>
          </Row>
        ))}
      </Table>
    </>
  );
}
