import type { Analysis, Filters } from "../types";
const BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");
export const query = (filters: Filters) =>
  new URLSearchParams(
    Object.entries(filters).map(([k, v]) => [k, String(v)]),
  ).toString();
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE}/api${path}`, options);
  if (!response.ok) {
    let message = "The data service is unavailable. Please try again.";
    try {
      const body = await response.json();
      if (typeof body.detail === "string") message = body.detail;
    } catch {
      /* Safe fallback for proxy errors. */
    }
    throw new Error(message);
  }
  return response.json();
}
export const getAnalysis = (filters: Filters, signal: AbortSignal) =>
  request<Analysis>(`/dashboard?${query(filters)}`, { signal });
export const getConfig = () => request<{ default_cutoff: string }>("/config");
export const refreshData = (token: string) =>
  request("/refresh", {
    method: "POST",
    headers: { "X-Refresh-Token": token },
  });
export async function exportData(filters: Filters) {
  const response = await fetch(`${BASE}/api/export?${query(filters)}`);
  if (!response.ok)
    throw new Error("The export could not be downloaded. Please try again.");
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `windward-${filters.basis}-${filters.start}-${filters.end}.csv`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}
