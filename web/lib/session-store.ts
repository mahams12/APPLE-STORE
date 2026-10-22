"use client";

import { create } from "zustand";
import { api } from "./client";
import type { AdminProfile, Profile } from "./types";

type SessionState = {
  user: Profile | null;
  admin: AdminProfile | null;
  ready: boolean;
  offline: boolean;
  load: () => Promise<void>;
  logout: (kind?: "customer" | "admin") => Promise<void>;
};

export const useSession = create<SessionState>((set, get) => ({
  user: null,
  admin: null,
  ready: false,
  offline: false,
  load: async () => {
    try {
      const me = await api<{ user: Profile | null; admin: AdminProfile | null }>("/me");
      set({ user: me.user, admin: me.admin, ready: true, offline: false });
    } catch {
      set({ ready: true, offline: true });
    }
  },
  logout: async (kind = "customer") => {
    try {
      await api(kind === "admin" ? "/auth/admin/logout" : "/auth/logout", { method: "POST" });
    } catch {
      /* ignore */
    }
    document.cookie = "istore_demo=; Max-Age=0; path=/";
    await get().load();
  },
}));
