/**
 * FOREX FACTORY — scheduled macro / economic calendar.
 *
 * Honesty notes:
 * - Forex Factory has no official public REST API. It does publish a weekly
 *   calendar feed (ff_calendar_thisweek.json on faireconomy.media) intended
 *   for calendar apps. The site cannot be fetched from the browser (CORS),
 *   so this adapter always goes through the backend relay
 *   (server/index.js → GET /api/forexfactory), which fetches + caches it.
 * - If the relay is down or demo mode is on, we fall back to clearly-labeled
 *   mock calendar rows.
 */
import { APP } from "../lib/config";
import type { CatalystEvent, Category } from "../lib/types";
import { mockCalendar } from "./mockData";
import type { AdapterResult, SourceAdapter } from "./types";
import { relayGet } from "./types";

interface FFRow {
  title: string;
  country: string;
  date: string; // ISO
  impact: string; // "High" | "Medium" | "Low"
  forecast: string;
  previous: string;
  actual?: string;
}

function categoryFor(title: string): Category {
  const t = title.toLowerCase();
  if (t.includes("fomc") || t.includes("fed") || t.includes("powell")) return "Fed";
  if (t.includes("auction") || t.includes("bond") || t.includes("yield")) return "Rates";
  return "Macro";
}

function num(s?: string): number | undefined {
  if (!s) return undefined;
  const n = parseFloat(s.replace(/[%,KMB]/gi, ""));
  return Number.isFinite(n) ? n : undefined;
}

export const forexFactory: SourceAdapter = {
  id: "forexFactory",
  name: "Forex Factory",
  note: "Weekly calendar feed via backend relay (no official API; browser-direct blocked by CORS).",
  async fetch(): Promise<AdapterResult> {
    if (APP.demoMode) {
      return {
        events: mockCalendar(),
        status: { id: this.id, name: this.name, live: false, configured: false, note: "Demo mode — mock calendar." }
      };
    }
    try {
      const rows = await relayGet<FFRow[]>("/forexfactory");
      const events: CatalystEvent[] = rows
        .filter((r) => r.country === "USD")
        .map((r, i) => ({
          id: `ff-${r.date}-${r.title}-${i}`,
          ts: new Date(r.date).getTime(),
          source: "Forex Factory",
          sourceId: this.id,
          live: true,
          headline:
            r.actual != null && r.actual !== ""
              ? `${r.title}: ${r.actual} vs ${r.forecast || "n/a"} forecast (prev ${r.previous || "n/a"})`
              : `${r.title} (scheduled${r.forecast ? `, forecast ${r.forecast}` : ""})`,
          category: categoryFor(r.title),
          markets: ["QQQ", "NQ"],
          scheduled: true,
          actual: num(r.actual),
          forecast: num(r.forecast),
          previous: num(r.previous),
          detail: `FF impact: ${r.impact}`
        }));
      return {
        events,
        status: { id: this.id, name: this.name, live: true, configured: true, note: this.note }
      };
    } catch (err) {
      return {
        events: mockCalendar(),
        status: {
          id: this.id, name: this.name, live: false, configured: true,
          lastError: String(err), note: "Relay unreachable — showing mock calendar."
        }
      };
    }
  }
};
