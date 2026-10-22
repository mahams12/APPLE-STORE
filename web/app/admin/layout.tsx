"use client";

import { Bell, Menu, Search } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { AdminSidebar } from "@/components/admin/sidebar";
import { useSession } from "@/lib/session-store";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const admin = useSession((s) => s.admin);
  if (pathname === "/admin/login") return <>{children}</>;
  return (
    <div className="flex min-h-dvh bg-canvas">
      <AdminSidebar mobileOpen={open} onClose={() => setOpen(false)} />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-40 flex h-[72px] items-center gap-3 border-b border-line bg-white/85 px-4 backdrop-blur-xl sm:px-8">
          <button onClick={() => setOpen(true)} className="grid size-10 place-items-center rounded-full hover:bg-canvas lg:hidden" aria-label="Open menu"><Menu size={20} /></button>
          <div className="relative hidden max-w-md flex-1 sm:block">
            <Search size={17} className="absolute top-1/2 left-4 -translate-y-1/2 text-muted" />
            <input placeholder="Search here" aria-label="Search admin" className="h-11 w-full rounded-xl bg-canvas pr-4 pl-11 text-sm outline-none focus:ring-4 focus:ring-brand-100" />
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button className="relative grid size-11 place-items-center rounded-full bg-canvas hover:bg-brand-50 hover:text-brand-500" aria-label="Notifications"><Bell size={18} /><span className="absolute top-2.5 right-3 size-2 rounded-full bg-danger ring-2 ring-white" /></button>
            {admin ? (
              <span className="grid size-11 place-items-center rounded-full bg-gradient-to-br from-brand-400 to-violet text-sm font-semibold text-white">{admin.firstName[0]}{admin.lastName[0]}</span>
            ) : (
              <Link href="/admin/login" className="btn btn-primary h-10">Sign in</Link>
            )}
          </div>
        </header>
        <main className="px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
