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

/** Requests can otherwise hang forever against a cold-starting/slow relay,
 * which stacks up overlapping polls and can freeze the tab. 20s covers a
 * Render free-tier cold start; anything slower is treated as a failure so
 * the UI falls back to demo data instead of hanging. */
const RELAY_TIMEOUT_MS = 20_000;

export async function relayGet<T>(path: string): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RELAY_TIMEOUT_MS);
  try {
    const res = await fetch(`${relayBase()}${path}`, {
      headers: { Accept: "application/json" },
      signal: controller.signal
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`relay ${path} → ${res.status} ${body.slice(0, 140)}`);
    }
    return (await res.json()) as T;
  } catch (err) {
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new Error(`relay ${path} → timed out after ${RELAY_TIMEOUT_MS / 1000}s (cold start or network issue)`);
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}
