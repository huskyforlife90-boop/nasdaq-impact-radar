/**
 * STOCKMKTNEWZ — breaking-news connector (X / Twitter account @StockMKTNewz).
 *
 * Honesty notes — READ BEFORE WIRING THIS UP:
 * - There is NO free public API for reading X timelines, and scraping X
 *   violates their Terms of Service. This adapter does NOT fake access.
 * - If you have PAID X API v2 access, set X_BEARER_TOKEN and
 *   STOCKMKTNEWZ_USER_ID on the relay; server/index.js then uses the
 *   documented GET /2/users/:id/tweets endpoint.
 * - Until then this is a clean connector interface + clearly-labeled demo
 *   headlines. Alternative legitimate wiring: some news APIs syndicate
 *   similar breaking-headline coverage — see the newsWire adapter.
 */
import { APP } from "../lib/config";
import type { CatalystEvent, Category } from "../lib/types";
import { mockEvents } from "./mockData";
import type { AdapterResult, SourceAdapter } from "./types";
import { relayGet } from "./types";

function categorize(text: string): Category {
  const t = text.toLowerCase();
  if (/(fed|fomc|powell)/.test(t)) return "Fed";
  if (/(cpi|pce|ppi|payroll|jobs|gdp|ism)/.test(t)) return "Macro";
  if (/(yield|treasury|auction|bond)/.test(t)) return "Rates";
  if (/(earnings|guidance|revenue|eps)/.test(t)) return "Earnings";
  if (/(missile|strike|war|sanction|conflict)/.test(t)) return "Geopolitics";
  return "Breaking News";
}

export const stockMktNewz: SourceAdapter = {
  id: "stockMktNewz",
  name: "StockMKTNewz",
  note: "X connector scaffold — requires paid X API v2 credentials on the relay. No scraping.",
  async fetch(): Promise<AdapterResult> {
    const demo = () => ({
      events: mockEvents("stockMktNewz", "StockMKTNewz", (t) => t.category === "Breaking News" || t.category === "Geopolitics"),
      status: { id: this.id, name: this.name, live: false, configured: false, note: "No X API credentials — demo headlines." }
    });
    if (APP.demoMode) return demo();
    try {
      const res = await relayGet<{ configured: boolean; tweets: { id: string; text: string; created_at: string }[] }>(
        "/stockmktnewz"
      );
      if (!res.configured) return demo();
      const events: CatalystEvent[] = res.tweets.map((t) => ({
        id: `smn-${t.id}`,
        ts: new Date(t.created_at).getTime(),
        source: "StockMKTNewz",
        sourceId: this.id,
        live: true,
        headline: t.text.split("\n")[0].slice(0, 180),
        category: categorize(t.text),
        markets: ["QQQ", "NQ"],
        scheduled: false
      }));
      return { events, status: { id: this.id, name: this.name, live: true, configured: true, note: this.note } };
    } catch (err) {
      return {
        ...demo(),
        status: { id: this.id, name: this.name, live: false, configured: true, lastError: String(err), note: "Relay/X API error — demo headlines shown." }
      };
    }
  }
};
