"use client";

import { Check, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, Table, Tabs } from "@/components/admin/ui";
import { StatusPill } from "@/components/ui/misc";
import { QUOTES } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { fmtDate, money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Quote } from "@/lib/types";

type Tab = "ALL" | "PENDING" | "ACCEPTED" | "DECLINED";

export default function QuotesPage() {
  const { data, setData, live, reload } = useAdminData<Quote[]>("/admin/quotes", (r) => (r as { quotes: Quote[] }).quotes, QUOTES);
  const [tab, setTab] = useState<Tab>("ALL");
  const list = data.filter((x) => tab === "ALL" || x.status === tab);
  const decide = async (quote: Quote, status: "ACCEPTED" | "DECLINED") => {
    try {
      if (live) {
        await api(`/admin/quotes/${quote.id}`, { method: "PATCH", json: { status } });
        await reload();
      } else setData(data.map((x) => (x.id === quote.id ? { ...x, status } : x)));
      toast.success(`Quote ${status.toLowerCase()}`);
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  return (
    <>
      <PageHeader title="Quotes" subtitle="Volume price requests from customers." />
      <DemoBanner live={live} />
      <Tabs id="quotes" value={tab} onChange={setTab} items={(["ALL", "PENDING", "ACCEPTED", "DECLINED"] as Tab[]).map((k) => ({ key: k, label: k === "ALL" ? "All" : k[0] + k.slice(1).toLowerCase(), count: k === "ALL" ? data.length : data.filter((x) => x.status === k).length }))} />
      <Table head={["Customer", "Request", "Target", "Date", "Status", ""]} empty={!list.length}>
        {list.map((x, i) => (
          <Row key={x.id} i={i}>
            <td><p className="font-medium">{x.name}</p><p className="text-xs text-muted">{x.email}</p></td>
            <td className="max-w-xs text-muted">{x.note || "—"}</td>
            <td className="font-semibold">{money(x.amount)}</td>
            <td className="text-muted">{fmtDate(x.date)}</td>
            <td><StatusPill status={x.status} /></td>
            <td>
              {x.status === "PENDING" && (
                <div className="flex justify-end gap-2">
                  <button onClick={() => decide(x, "ACCEPTED")} className="btn h-8 bg-success/10 px-3 text-success hover:bg-success hover:text-white"><Check size={14} /> Accept</button>
                  <button onClick={() => decide(x, "DECLINED")} className="btn h-8 bg-danger/10 px-3 text-danger hover:bg-danger hover:text-white"><X size={14} /> Decline</button>
                </div>
              )}
            </td>
          </Row>
        ))}
      </Table>
    </>
  );
}
