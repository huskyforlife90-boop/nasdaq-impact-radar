/**
 * UNUSUAL WHALES — options flow.
 *
 * Honesty notes:
 * - Unusual Whales has an OFFICIAL, PAID API (https://unusualwhales.com/api).
 *   This adapter only ever talks to it through the backend relay so the API
 *   key never ships to the browser (server/index.js → /api/unusualwhales/*,
 *   which calls their documented /api/option-trades/flow-alerts endpoint).
 * - Without UW_API_KEY on the relay, this source is mocked and labeled demo.
 * - No scraping, no unofficial endpoints.
 */
import { APP, NASDAQ_SYMBOLS } from "../lib/config";
import type { CatalystEvent } from "../lib/types";
import { mockEvents } from "./mockData";
import type { AdapterResult, SourceAdapter } from "./types";
import { relayGet } from "./types";

interface UWAlert {
  id: string;
  created_at: string;
  ticker: string;
  type: string; // "call" | "put"
  premium: number;
  side?: string; // "ask" | "bid"
  rule_name?: string;
}

export const unusualWhales: SourceAdapter = {
  id: "unusualWhales",
  name: "Unusual Whales",
  note: "Official paid API via relay (UW_API_KEY). Mocked until a key is configured.",
  async fetch(): Promise<AdapterResult> {
    const demo = () => ({
      events: mockEvents("unusualWhales", "Unusual Whales", (t) => t.category === "Options Flow"),
      status: { id: this.id, name: this.name, live: false, configured: false, note: "No UW_API_KEY on relay — demo flow." }
    });
    if (APP.demoMode) return demo();
    try {
      const res = await relayGet<{ configured: boolean; alerts: UWAlert[] }>("/unusualwhales/flow-alerts");
      if (!res.configured) return demo();
      const events: CatalystEvent[] = res.alerts
        .filter((a) => NASDAQ_SYMBOLS.includes(a.ticker?.toUpperCase()))
        .map((a) => {
          const bullish = a.type === "call" && a.side !== "bid";
          const kind = a.type === "call" ? (bullish ? "call sweep — bullish flow" : "call selling") : "put sweep — bearish flow";
          return {
            id: `uw-${a.id}`,
            ts: new Date(a.created_at).getTime(),
            source: "Unusual Whales",
            sourceId: this.id,
            live: true,
            headline: `${a.ticker}: ${kind}, $${Math.round(a.premium / 1000)}K premium${a.rule_name ? ` (${a.rule_name})` : ""}`,
            category: "Options Flow",
            markets: [a.ticker.toUpperCase(), "QQQ"],
            scheduled: false
          };
        });
      return { events, status: { id: this.id, name: this.name, live: true, configured: true, note: this.note } };
    } catch (err) {
      return {
        ...demo(),
        status: { id: this.id, name: this.name, live: false, configured: true, lastError: String(err), note: "Relay/API error — demo flow shown." }
      };
    }
  }
};
