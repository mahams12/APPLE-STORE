"use client";

import { AnimatePresence, m } from "framer-motion";
import { Check, Pencil, Plus, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, Table, Toggle } from "@/components/admin/ui";
import { StatusPill } from "@/components/ui/misc";
import { PERMISSION_GROUPS, ROLES, STAFF } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { cn } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Role, StaffUser } from "@/lib/types";

type Data = { users: StaffUser[]; roles: Role[] };

export default function RolesPage() {
  const { data, setData, live, reload } = useAdminData<Data>("/admin/staff", (r) => r as Data, { users: STAFF, roles: ROLES });
  const [edit, setEdit] = useState<Role | null>(null);
  const [busy, setBusy] = useState(false);

  const togglePerm = (key: string) => setEdit((r) => (r ? { ...r, permissions: r.permissions.includes(key) ? r.permissions.filter((p) => p !== key) : [...r.permissions, key] } : r));
  const toggleGroup = (keys: string[], on: boolean) => setEdit((r) => (r ? { ...r, permissions: on ? Array.from(new Set([...r.permissions, ...keys])) : r.permissions.filter((p) => !keys.includes(p)) } : r));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    try {
      if (live) {
        await api("/admin/roles", { method: "POST", json: { ...edit, id: edit.id || undefined } });
        await reload();
      } else {
        const roles = edit.id ? data.roles.map((r) => (r.id === edit.id ? edit : r)) : [...data.roles, { ...edit, id: `role-${Date.now()}` }];
        setData({ ...data, roles });
      }
      toast.success("Role saved");
      setEdit(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <PageHeader title="Roles" subtitle="Control what each user can see and do." actions={<button onClick={() => setEdit({ id: "", name: "", description: "", permissions: [], disabled: false })} className="btn btn-primary h-10"><Plus size={16} /> Add New</button>} />
      <DemoBanner live={live} />
      <Table head={["Role", "Description", "Users", "Permissions", "Status", ""]}>
        {data.roles.map((r, i) => (
          <Row key={r.id} i={i}>
            <td className="font-medium">{r.name}</td>
            <td className="max-w-xs truncate text-muted">{r.description}</td>
            <td>{data.users.filter((u) => u.roleId === r.id).length}</td>
            <td><span className="chip bg-brand-50 text-brand-500">{r.permissions.length} permissions</span></td>
            <td><StatusPill status={r.disabled ? "Disabled" : "Active"} /></td>
            <td className="text-right"><button onClick={() => setEdit(r)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-500" aria-label="Edit role"><Pencil size={15} /></button></td>
          </Row>
        ))}
      </Table>

      <AnimatePresence>
        {edit && (
          <>
            <m.div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEdit(null)} />
            <m.form data-lenis-prevent onSubmit={save} className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
              <div className="flex items-center justify-between border-b border-line px-6 py-5"><h2 className="text-xl font-semibold">{edit.id ? "Edit Role" : "Add Role"}</h2><button type="button" onClick={() => setEdit(null)} className="grid size-9 place-items-center rounded-full hover:bg-canvas" aria-label="Close"><X size={18} /></button></div>
              <div className="flex-1 space-y-5 p-6">
                <label className="block"><span className="label">Role Name</span><input className="input" required value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} /></label>
                <label className="block"><span className="label">Description</span><textarea className="input min-h-20 py-3" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
                <div className="flex items-center justify-between rounded-xl bg-canvas p-4"><span className="text-sm font-medium">Disabled</span><Toggle checked={!!edit.disabled} onChange={(v) => setEdit({ ...edit, disabled: v })} label="Disabled" /></div>
                <div>
                  <p className="mb-3 font-medium">Permissions</p>
                  <div className="space-y-3">
                    {PERMISSION_GROUPS.map((g) => {
                      const keys = g.actions.map((a) => a.key);
                      const all = keys.every((k) => edit.permissions.includes(k));
                      return (
                        <div key={g.key} className="rounded-xl border border-line p-4">
                          <label className="flex cursor-pointer items-center justify-between">
                            <span className="font-medium">{g.label}</span>
                            <span className="flex items-center gap-2 text-xs text-muted">All <input type="checkbox" className="size-4 accent-brand-500" checked={all} onChange={(e) => toggleGroup(keys, e.target.checked)} /></span>
                          </label>
                          <div className="mt-3 flex flex-wrap gap-2">
                            {g.actions.map((a) => {
                              const on = edit.permissions.includes(a.key);
                              return (
                                <button type="button" key={a.key} onClick={() => togglePerm(a.key)} aria-pressed={on} className={cn("flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-all duration-200", on ? "border-brand-500 bg-brand-50 text-brand-600" : "border-line text-muted hover:border-brand-300")}>
                                  <span className={cn("grid size-4 place-items-center rounded border", on ? "border-brand-500 bg-brand-500 text-white" : "border-muted/40")}>{on && <Check size={10} strokeWidth={3} />}</span>{a.label}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
              <div className="flex gap-3 border-t border-line p-6"><button type="button" onClick={() => setEdit(null)} className="btn btn-outline flex-1">Cancel</button><button disabled={busy} className="btn btn-primary flex-1">{busy ? "Saving…" : "Save Role"}</button></div>
            </m.form>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
