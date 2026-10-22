"use client";

import { DemoBanner, PageHeader, Row, Table } from "@/components/admin/ui";
import { fmtDate } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { AuditRow } from "@/lib/types";

const DEMO: AuditRow[] = [
  { id: "a1", action: "order.update", entity: "Order", entityId: "IST-3423", before: "Processing", after: "Confirmed", admin: "admin@istore.example", date: "2026-10-20T10:12:00Z" },
  { id: "a2", action: "inventory.adjust", entity: "ProductVariant", entityId: "AP-16PM-BLK", before: "", after: "+10", admin: "admin@istore.example", date: "2026-10-19T15:40:00Z" },
  { id: "a3", action: "role.save", entity: "Role", entityId: "Buyer", before: "", after: "3 permissions", admin: "admin@istore.example", date: "2026-10-18T09:05:00Z" },
];

export default function AuditPage() {
  const { data, live } = useAdminData<AuditRow[]>("/admin/audits", (r) => (r as { audits: AuditRow[] }).audits, DEMO);
  return (
    <>
      <PageHeader title="Audit Log" subtitle="Every change made by staff." />
      <DemoBanner live={live} />
      <Table head={["When", "Who", "Action", "Entity", "Change"]} empty={!data.length}>
        {data.map((a, i) => (
          <Row key={a.id} i={i}>
            <td className="text-muted">{fmtDate(a.date)}</td>
            <td>{a.admin}</td>
            <td><span className="chip bg-brand-50 font-mono text-brand-500">{a.action}</span></td>
            <td className="text-muted">{a.entity} · {a.entityId}</td>
            <td className="text-xs">{a.before && <span className="text-danger line-through">{a.before}</span>} {a.after && <span className="text-success">{a.after}</span>}</td>
          </Row>
        ))}
      </Table>
    </>
  );
}
