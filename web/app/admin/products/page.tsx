"use client";

import { AnimatePresence, m } from "framer-motion";
import { ImagePlus, Pencil, Plus, Trash2, X } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import { toast } from "sonner";
import { DemoBanner, PageHeader, Row, SearchInput, Table, Toggle } from "@/components/admin/ui";
import { StockBadge } from "@/components/ui/misc";
import { CATEGORIES, PRODUCTS } from "@/lib/catalog";
import { api, errorMessage } from "@/lib/client";
import { money } from "@/lib/format";
import { useAdminData } from "@/lib/use-admin";
import type { Product } from "@/lib/types";

type Form = { id?: string; name: string; category: string; brand: string; sku: string; description: string; price: number; salePrice: number; stock: number; image: string; colors: { name: string; hex: string }[]; storages: string; extras: string; extraLabel: string; popular: boolean };
const toForm = (p?: Product): Form => ({ id: p?.id, name: p?.name ?? "", category: p?.category ?? CATEGORIES[0], brand: p?.brand ?? "Apple", sku: p?.sku ?? "", description: p?.description ?? "", price: p?.price ?? 0, salePrice: p?.salePrice ?? 0, stock: p?.stock ?? 0, image: p?.image ?? "", colors: p?.colors?.length ? p.colors.map((c) => ({ name: c.name, hex: c.hex })) : [{ name: "Black", hex: "#1C1C1E" }], storages: p?.storages.join(", ") ?? "128GB", extras: p?.extras.join(", ") ?? "Standard", extraLabel: p?.extraLabel ?? "Finish", popular: p?.popular ?? false });

export default function ProductsAdmin() {
  const { data, setData, live, reload } = useAdminData<Product[]>("/products?pageSize=100", (r) => (Array.isArray(r) ? r : (r as { items?: Product[]; products?: Product[] }).items ?? (r as { products: Product[] }).products ?? []) as Product[], PRODUCTS);
  const [q, setQ] = useState("");
  const [edit, setEdit] = useState<Form | null>(null);
  const [busy, setBusy] = useState(false);
  const list = data.filter((p) => `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(q.toLowerCase()));
  const split = (s: string) => s.split(",").map((x) => x.trim()).filter(Boolean);

  const upload = async (file: File) => {
    if (!live) return setEdit((e) => (e ? { ...e, image: URL.createObjectURL(file) } : e));
    const body = new FormData();
    body.append("file", file);
    try {
      const res = await api<{ url: string }>("/admin/uploads", { method: "POST", body });
      setEdit((e) => (e ? { ...e, image: res.url } : e));
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    setBusy(true);
    try {
      const payload = { ...edit, price: Number(edit.price), salePrice: Number(edit.salePrice), stock: Number(edit.stock), colors: edit.colors.filter((c) => c.name.trim()).map((c) => ({ name: c.name.trim(), hex: c.hex })), storages: split(edit.storages), extras: split(edit.extras), image: edit.image || undefined, gallery: edit.image ? [edit.image] : undefined };
      if (live) {
        await api("/admin/products", { method: "POST", json: payload });
        await reload();
      } else {
        const base = data.find((p) => p.id === edit.id) ?? PRODUCTS[0];
        const next: Product = { ...base, ...payload, id: edit.id || `p-${Date.now()}`, slug: edit.id ? base.slug : edit.name.toLowerCase().replace(/\W+/g, "-"), image: edit.image || base.image, gallery: edit.image ? [edit.image] : base.gallery, reviews: edit.id ? base.reviews : [], variants: undefined };
        setData(edit.id ? data.map((p) => (p.id === edit.id ? next : p)) : [next, ...data]);
      }
      toast.success("Product saved");
      setEdit(null);
    } catch (error) {
      toast.error(errorMessage(error));
    } finally {
      setBusy(false);
    }
  };
  const remove = async (p: Product) => {
    if (!confirm(`Archive ${p.name}?`)) return;
    try {
      if (live) await api(`/admin/products/${p.id}`, { method: "DELETE" });
      setData(data.filter((x) => x.id !== p.id));
      toast.success("Product archived");
    } catch (error) {
      toast.error(errorMessage(error));
    }
  };
  const field = (k: keyof Form, label: string, type = "text", span = false) => (
    <label className={span ? "sm:col-span-2" : ""}><span className="label">{label}</span><input className="input" type={type} value={String(edit?.[k] ?? "")} onChange={(e) => setEdit((f) => (f ? { ...f, [k]: e.target.value } : f))} required={["name", "salePrice"].includes(k)} /></label>
  );

  return (
    <>
      <PageHeader title="Products" subtitle={`${data.length} products in the catalog.`} actions={<><SearchInput value={q} onChange={setQ} placeholder="Search products" /><button onClick={() => setEdit(toForm())} className="btn btn-primary h-10"><Plus size={16} /> Add product</button></>} />
      <DemoBanner live={live} />
      <Table head={["Product", "Category", "RR Price", "Wholesale", "Stock", ""]} empty={!list.length}>
        {list.map((p, i) => (
          <Row key={p.id} i={i}>
            <td><div className="flex items-center gap-3"><span className="relative size-11 shrink-0 overflow-hidden rounded-xl bg-canvas"><Image src={p.image} alt="" fill sizes="44px" className="object-cover" unoptimized={p.image.startsWith("blob:")} /></span><span><span className="block font-medium">{p.name}</span><span className="text-xs text-muted">{p.sku}</span></span></div></td>
            <td>{p.category}</td>
            <td className="text-muted">{money(p.price)}</td>
            <td className="font-medium text-brand-500">{money(p.salePrice)}</td>
            <td><div className="flex items-center gap-2"><StockBadge stock={p.stock} /><span className="text-xs text-muted">{p.stock}</span></div></td>
            <td><div className="flex justify-end gap-1"><button onClick={() => setEdit(toForm(p))} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-brand-50 hover:text-brand-500" aria-label="Edit"><Pencil size={15} /></button><button onClick={() => remove(p)} className="grid size-8 place-items-center rounded-lg text-muted hover:bg-danger/10 hover:text-danger" aria-label="Archive"><Trash2 size={15} /></button></div></td>
          </Row>
        ))}
      </Table>
      <AnimatePresence>
        {edit && (
          <>
            <m.div className="fixed inset-0 z-[60] bg-ink/30 backdrop-blur-[2px]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setEdit(null)} />
            <m.form data-lenis-prevent onSubmit={save} className="fixed inset-y-0 right-0 z-[61] flex w-full max-w-xl flex-col overflow-y-auto bg-white shadow-2xl" initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }} transition={{ type: "spring", stiffness: 320, damping: 34 }}>
              <div className="flex items-center justify-between border-b border-line px-6 py-5"><h2 className="text-xl font-semibold">{edit.id ? "Edit product" : "New product"}</h2><button type="button" onClick={() => setEdit(null)} className="grid size-9 place-items-center rounded-full hover:bg-canvas" aria-label="Close"><X size={18} /></button></div>
              <div className="grid flex-1 content-start gap-4 p-6 sm:grid-cols-2">
                <label className="group relative grid aspect-[16/9] cursor-pointer place-items-center overflow-hidden rounded-xl border-2 border-dashed border-line bg-canvas sm:col-span-2">
                  {edit.image ? <Image src={edit.image} alt="" fill sizes="560px" className="object-cover" unoptimized={edit.image.startsWith("blob:")} /> : <span className="flex flex-col items-center text-sm text-muted"><ImagePlus /> Upload image</span>}
                  <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
                </label>
                {field("name", "Name", "text", true)}
                <label><span className="label">Category</span><select className="input" value={edit.category} onChange={(e) => setEdit({ ...edit, category: e.target.value })}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select></label>
                {field("brand", "Brand")}{field("sku", "SKU")}{field("stock", "Stock", "number")}{field("price", "RR price", "number")}{field("salePrice", "Wholesale price", "number")}
                {field("storages", "Storage / sizes (comma separated)", "text", true)}{field("extraLabel", "Option label")}{field("extras", "Options (comma separated)")}
                <label className="sm:col-span-2"><span className="label">Description</span><textarea className="input min-h-24 py-3" value={edit.description} onChange={(e) => setEdit({ ...edit, description: e.target.value })} /></label>
                <div className="sm:col-span-2">
                  <span className="label">Colors</span>
                  <div className="space-y-2">
                    {edit.colors.map((c, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <input type="color" value={c.hex} onChange={(e) => setEdit({ ...edit, colors: edit.colors.map((x, j) => (j === i ? { ...x, hex: e.target.value } : x)) })} className="size-10 shrink-0 cursor-pointer rounded-full border border-line bg-transparent p-0.5" aria-label="Color shade" />
                        <input className="input flex-1" placeholder="Color name (e.g. Midnight)" value={c.name} onChange={(e) => setEdit({ ...edit, colors: edit.colors.map((x, j) => (j === i ? { ...x, name: e.target.value } : x)) })} />
                        <button type="button" onClick={() => setEdit({ ...edit, colors: edit.colors.filter((_, j) => j !== i) })} disabled={edit.colors.length <= 1} className="grid size-9 place-items-center rounded-full text-muted transition hover:bg-canvas hover:text-red-500 disabled:opacity-30" aria-label="Remove color"><Trash2 size={16} /></button>
                      </div>
                    ))}
                    <button type="button" onClick={() => setEdit({ ...edit, colors: [...edit.colors, { name: "", hex: "#C9A24B" }] })} className="btn btn-ghost h-9 text-sm"><Plus size={15} /> Add color</button>
                  </div>
                </div>
                <div className="flex items-center justify-between rounded-xl bg-canvas p-4 sm:col-span-2"><span className="text-sm font-medium">Featured / popular</span><Toggle checked={edit.popular} onChange={(v) => setEdit({ ...edit, popular: v })} label="Popular" /></div>
              </div>
              <div className="flex gap-3 border-t border-line p-6"><button type="button" onClick={() => setEdit(null)} className="btn btn-outline flex-1">Cancel</button><button disabled={busy} className="btn btn-primary flex-1">{busy ? "Saving…" : "Save product"}</button></div>
            </m.form>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
