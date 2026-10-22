"use client";

import { Minus, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, SearchInput, Table } from "@/components/admin/ui";
import { PRODUCTS } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { cn } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { InventoryRow } from "@/lib/types";

const DEMO: InventoryRow[] = PRODUCTS.flatMap((p) => p.colors.slice(0, 2).map((c, i) => {
  const stock = Math.max(0, Math.round(p.stock / 2) - i * 3);
  return { id: `${p.id}-${c.name}`, sku: `${p.sku}-${c.name.slice(0, 3).toUpperCase()}`, name: p.name, color: c.name, storage: p.storages[0], stock, reserved: i, available: Math.max(0, stock - i) };
}));

export default function InventoryPage() {
  const { data, setData, live, reload } = useAdminData<InventoryRow[]>("/admin/inventory", (r) => (r as { items: InventoryRow[] }).items, DEMO);
  const [q, setQ] = useState("");
  const [low, setLow] = useState(false);
  const list = useMemo(() => data.filter((r) => `${r.name} ${r.sku} ${r.color}`.toLowerCase().includes(q.toLowerCase()) && (!low || r.available <= 5)), [data, q, low]);

  const adjust = async (row: InventoryRow, delta: number) => {
    try {
      if (live) {
        await api(`/admin/inventory/${row.id}`, { method: "POST", json: { delta, reason: "ADJUST" } });
        await reload();
      } else setData(data.map((r) => (r.id === row.id ? { ...r, stock: Math.max(0, r.stock + delta), available: Math.max(0, r.available + delta) } : r)));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };

  return (
    <>
      <PageHeader title="Inventory" subtitle="Stock per variant across warehouses." actions={<><button onClick={() => setLow((v) => !v)} className={cn("btn h-10", low ? "btn-primary" : "btn-outline")}>Low stock</button><SearchInput value={q} onChange={setQ} placeholder="Search SKU or product" /></>} />
      <DemoBanner live={live} />
      <Table head={["SKU", "Product", "Variant", "On hand", "Reserved", "Available", "Adjust"]} empty={!list.length}>
        {list.map((r, i) => (
          <Row key={r.id} i={i}>
            <td className="font-mono text-xs">{r.sku}</td>
            <td className="font-medium">{r.name}</td>
            <td className="text-muted">{[r.color, r.storage].filter(Boolean).join(" · ")}</td>
            <td>{r.stock}</td>
            <td className="text-muted">{r.reserved}</td>
            <td><span className={cn("chip", r.available <= 0 ? "bg-danger/10 text-danger" : r.available <= 5 ? "bg-star/10 text-star" : "bg-success/10 text-success")}>{r.available}</span></td>
            <td><div className="flex items-center gap-1"><button onClick={() => adjust(r, -1)} className="grid size-8 place-items-center rounded-lg border border-line hover:border-danger hover:text-danger" aria-label="Decrease stock"><Minus size={14} /></button><button onClick={() => adjust(r, 1)} className="grid size-8 place-items-center rounded-lg border border-line hover:border-success hover:text-success" aria-label="Increase stock"><Plus size={14} /></button><button onClick={() => adjust(r, 10)} className="h-8 rounded-lg border border-line px-2 text-xs hover:border-brand-500 hover:text-brand-500">+10</button></div></td>
          </Row>
        ))}
      </Table>
    </>
  );
}
