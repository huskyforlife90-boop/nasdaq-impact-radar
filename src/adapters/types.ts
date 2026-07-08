import type { AdapterStatus, CatalystEvent } from "../lib/types";

export interface AdapterResult {
  events: CatalystEvent[];
  status: AdapterStatus;
}

export interface SourceAdapter {
  id: string;
  name: string;
  note: string; // one-line honesty note surfaced in the UI + README
  fetch(): Promise<AdapterResult>;
}

/** Relay base URL. Empty string = same-origin `/api` (Vite dev proxy). */
export function relayBase(): string {
  const base = (import.meta.env.VITE_RELAY_URL || "").replace(/\/$/, "");
  return `${base}/api`;
}

export async function relayGet<T>(path: string): Promise<T> {
  const res = await fetch(`${relayBase()}${path}`, { headers: { Accept: "application/json" } });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`relay ${path} → ${res.status} ${body.slice(0, 140)}`);
  }
  return res.json() as Promise<T>;
}
