"use client";

import { AnimatePresence, m } from "framer-motion";
import { Pencil, Plus, Trash2, X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, SearchInput, Table } from "@/components/admin/ui";
import { PasswordField } from "@/components/auth/auth-card";
import { StatusPill } from "@/components/ui/misc";
import { ROLES, STAFF } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Role, StaffUser } from "@/lib/types";

type Data = { users: StaffUser[]; roles: Role[] };
const blank: StaffUser = { id: "", firstName: "", lastName: "", email: "", roleId: ROLES[2].id, creditLimit: 0, status: "Active", password: "", address: "" };

export default function UsersPage() {
  const { data, setData, live, reload } = useAdminData<Data>("/admin/staff", (r) => r as Data, { users: STAFF, roles: ROLES });
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<StaffUser | null>(null);
  const [busy, setBusy] = useState(false);
  const roleName = (id: string) => data.roles.find((r) => r.id === id)?.name ?? "—";
  const users = data.users.filter((u) => `${u.firstName} ${u.lastName} ${u.email}`.toLowerCase().includes(q.toLowerCase()));

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    try {
      if (live) {
        await api("/admin/staff", { method: "POST", json: { ...edit, id: edit.id || undefined, creditLimit: Number(edit.creditLimit), password: edit.password || undefined } });
        await reload();
      } else {
        const next = edit.id ? data.users.map((u) => (u.id === edit.id ? edit : u)) : [...data.users, { ...edit, id: `staff-${Date.now()}` }];
        setData({ ...data, users: next });
      }
      toast.success(edit.id ? "User updated" : "User added");
      setEdit(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (u: StaffUser) => {
    if (!confirm(`Remove ${u.firstName} ${u.lastName}?`)) return;
    try {
      if (live) await api(`/admin/staff/${u.id}`, { method: "DELETE" });
      setData({ ...data, users: data.users.filter((x) => x.id !== u.id) });
      toast.success("User removed");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const set = <K extends keyof StaffUser>(k: K, v: StaffUser[K]) => setEdit((e) => (e ? { ...e, [k]: v } : e));

  return (
    <>
      <PageHeader title="Users" subtitle="People who can sign in and order for your company." actions={<><SearchInput value={q} onChange={setQ} placeholder="Search users" /><button onClick={() => setEdit(blank)} className="btn btn-primary h-10"><Plus size={16} /> Add New</button></>} />
      <DemoBanner live={live} />
      <Table head={["Name", "Email", "Role", "Credit Limit", "Status", ""]} empty={!users.length}>
        {users.map((u, i) => (
          <Row key={u.id} i={i}>
            <td><div className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-full bg-brand-50 text-xs font-semibold text-brand-500">{u.firstName[0]}{u.lastName[0]}</span><span className="font-medium">{u.firstName} {u.lastName}</span></div></td>
            <td className="text-muted">{u.email}</td>
            <td>{roleName(u.roleId)}</td>
            <td>{money(u.creditLimit)}</td>
            <td><StatusPill status={u.status} /></td>
            <td><div className="flex justify-end gap-1"><button onClick={() => setEdit(u)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-500" aria-label="Edit"><Pencil size={15} /></button><button onClick={() => remove(u)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" aria-label="Delete"><Trash2 size={15} /></button></div></td>
          </Row>
        ))}
      </Table>

      <AnimatePresence>
        {edit && (
          <>
            <m.div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEdit(null)} />
            <m.form data-lenis-prevent onSubmit={save} className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-lg flex-col overflow-y-auto bg-white shadow-2xl" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
              <div className="flex items-center justify-between border-b border-line px-6 py-5"><h2 className="text-xl font-semibold">{edit.id ? "Edit User" : "Add User"}</h2><button type="button" onClick={() => setEdit(null)} className="grid size-9 place-items-center rounded-full hover:bg-canvas" aria-label="Close"><X size={18} /></button></div>
              <div className="grid flex-1 content-start gap-4 p-6 sm:grid-cols-2">
                <label><span className="label">First Name</span><input className="input" required value={edit.firstName} onChange={(e) => set("firstName", e.target.value)} /></label>
                <label><span className="label">Last Name</span><input className="input" required value={edit.lastName} onChange={(e) => set("lastName", e.target.value)} /></label>
                <label className="sm:col-span-2"><span className="label">Email</span><input className="input" type="email" required value={edit.email} onChange={(e) => set("email", e.target.value)} /></label>
                <label><span className="label">Role</span><select className="input" value={edit.roleId} onChange={(e) => set("roleId", e.target.value)}>{data.roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}</select></label>
                <label><span className="label">Credit Limit</span><input className="input" type="number" min={0} value={edit.creditLimit} onChange={(e) => set("creditLimit", Number(e.target.value))} /></label>
                <label><span className="label">Status</span><select className="input" value={edit.status} onChange={(e) => set("status", e.target.value)}><option>Active</option><option>Disabled</option></select></label>
                <PasswordField label={edit.id ? "New Password" : "Password"} autoComplete="new-password" placeholder={edit.id ? "Leave blank to keep" : ""} value={edit.password} onChange={(e) => set("password", e.target.value)} />
                <label className="sm:col-span-2"><span className="label">Address</span><textarea className="input min-h-20 py-3" value={edit.address} onChange={(e) => set("address", e.target.value)} /></label>
              </div>
              <div className="flex gap-3 border-t border-line p-6"><button type="button" onClick={() => setEdit(null)} className="btn btn-outline flex-1">Cancel</button><button disabled={busy} className="btn btn-primary flex-1">{busy ? "Saving…" : "Save"}</button></div>
            </m.form>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
