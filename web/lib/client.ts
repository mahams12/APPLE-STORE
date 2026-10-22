"use client";

/** Browser-side API client. All requests go through the Next.js /backend proxy. */

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
  /** True when the API could not be reached at all (offline / not running). */
  get offline() {
    return this.status === 0 || this.status === 502 || this.status === 503 || this.status === 504;
  }
}

export async function api<T>(path: string, init: RequestInit & { json?: unknown } = {}): Promise<T> {
  const { json, headers, ...rest } = init;
  let res: Response;
  try {
    res = await fetch(`/backend${path}`, {
      credentials: "include",
      ...rest,
      headers: { ...(json !== undefined ? { "Content-Type": "application/json" } : {}), ...headers },
      body: json !== undefined ? JSON.stringify(json) : rest.body,
    });
  } catch {
    throw new ApiError(0, "Can't reach the store server right now.");
  }
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    // Next's proxy returns a 500 HTML page when the upstream API is down.
    const message = data && typeof data === "object" && "message" in data ? String((data as { message: unknown }).message) : "";
    throw new ApiError(message ? res.status : res.status >= 500 ? 503 : res.status, message || "Can't reach the store server right now.");
  }
  return data as T;
}

export const errorMessage = (error: unknown) => (error instanceof Error ? error.message : "Something went wrong.");
