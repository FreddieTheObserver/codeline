"use client";

import useSWR, { type SWRConfiguration } from "swr";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = null;
  }
  if (!res.ok) {
    const message = (data as { error?: string } | null)?.error ?? `Request failed (${res.status}).`;
    if (res.status === 401 && typeof window !== "undefined" && !path.startsWith("/api/auth")) {
      // A full reload on an expired sign-in also clears any stale client state.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = `/signin?next=${encodeURIComponent(window.location.pathname)}`;
    }
    throw new ApiError(res.status, message);
  }
  return data as T;
}

export function post<T = { ok: true }>(path: string, body?: unknown): Promise<T> {
  return api<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) });
}

export function put<T = { ok: true }>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: "PUT", body: JSON.stringify(body) });
}

export function patch<T = { ok: true }>(path: string, body: unknown): Promise<T> {
  return api<T>(path, { method: "PATCH", body: JSON.stringify(body) });
}

export function del<T = { ok: true }>(path: string): Promise<T> {
  return api<T>(path, { method: "DELETE" });
}

export function useApi<T>(path: string | null, config?: SWRConfiguration<T, ApiError>) {
  return useSWR<T, ApiError>(path, (p: string) => api<T>(p), { revalidateOnFocus: true, ...config });
}

export function errorText(err: unknown): string {
  if (err instanceof ApiError) return err.message;
  if (err instanceof Error) return err.message;
  return "Something went wrong.";
}
