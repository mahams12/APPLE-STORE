"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "./client";
import type { Quote } from "./types";

/**
 * Loads an admin resource from the API. When the API is offline or the visitor is
 * not signed in as an admin, it falls back to demo data so the portal stays usable.
 */
export function useAdminData<T>(path: string, pick: (raw: unknown) => T, fallback: T) {
  const [data, setData] = useState<T>(fallback);
  const [live, setLive] = useState(false);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const raw = await api<unknown>(path);
      setData(pick(raw));
      setLive(true);
    } catch {
      setLive(false);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data, setData, live, loading, reload };
}

const QUOTE_STATUS: Record<string, Quote["status"]> = { OPEN: "PENDING", PENDING: "PENDING", ACCEPTED: "ACCEPTED", DECLINED: "DECLINED" };

export const pickQuotes = (raw: unknown): Quote[] =>
  (raw as { quotes: Quote[] }).quotes.map((q) => ({ ...q, status: QUOTE_STATUS[String(q.status).toUpperCase()] ?? "PENDING" }));
