import { cn } from "@/lib/format";

export function StockBadge({ stock }: { stock: number }) {
  return stock > 0 ? (
    <span className="chip bg-brand-50 text-brand-500">In-Stock</span>
  ) : (
    <span className="chip bg-danger/10 text-danger">Out Of Stock</span>
  );
}

const STATUS_TONE: Record<string, string> = {
  Processing: "text-brand-500 bg-brand-50",
  Confirmed: "text-success bg-success/10",
  Packed: "text-violet bg-violet/10",
  Shipped: "text-brand-600 bg-brand-100",
  Delivered: "text-success bg-success/10",
  Cancelled: "text-danger bg-danger/10",
  "On Hold": "text-danger bg-danger/10",
  Refunded: "text-muted bg-line",
  Active: "text-success bg-success/10",
  Disabled: "text-muted bg-line",
  PENDING: "text-brand-500 bg-brand-50",
  ACCEPTED: "text-success bg-success/10",
  DECLINED: "text-danger bg-danger/10",
  PAID: "text-success bg-success/10",
};

export function StatusPill({ status, className }: { status: string; className?: string }) {
  return <span className={cn("chip px-2.5 py-1 text-xs", STATUS_TONE[status] ?? "bg-line text-muted", className)}>{status}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} />;
}

export function EmptyState({ icon, title, body, action }: { icon: React.ReactNode; title: string; body?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div className="mb-4 grid size-14 place-items-center rounded-2xl bg-brand-50 text-brand-500">{icon}</div>
      <h3 className="text-lg font-semibold">{title}</h3>
      {body && <p className="mt-1 max-w-sm text-sm text-muted">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: React.ReactNode }) {
  return (
    <div className="mb-6 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <p className="mb-1 text-xs font-semibold tracking-[0.18em] text-brand-500 uppercase">{eyebrow}</p>}
        <h2 className="text-2xl font-semibold tracking-tight sm:text-[28px]">{title}</h2>
      </div>
      {action}
    </div>
  );
}
