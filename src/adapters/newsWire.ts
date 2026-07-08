/**
 * NEWS WIRE — general market news.
 *
 * Live path: backend relay → Finnhub /news?category=general (free-tier key,
 * https://finnhub.io). Swap in Marketaux/Polygon/Benzinga by editing
 * server/index.js — the frontend contract stays the same.
 */
import { APP } from "../lib/config";
import type { CatalystEvent, Category } from "../lib/types";
import { mockEvents } from "./mockData";
import type { AdapterResult, SourceAdapter } from "./types";
import { relayGet } from "./types";

function categorize(text: string): Category {
  const t = text.toLowerCase();
  if (/(fed|fomc|powell|fed's)/.test(t)) return "Fed";
  if (/(cpi|pce|inflation|payroll|gdp|ism|retail sales|jobless)/.test(t)) return "Macro";
  if (/(yield|treasury|auction|bonds)/.test(t)) return "Rates";
  if (/(earnings|guidance|revenue|eps|quarter)/.test(t)) return "Earnings";
  if (/(missile|strike|war|sanction|geopolit)/.test(t)) return "Geopolitics";
  if (/(vix|risk-off|risk-on|selloff|rally)/.test(t)) return "Risk Sentiment";
  return "Breaking News";
}

function marketsFor(text: string): string[] {
  const found = ["AAPL", "MSFT", "NVDA", "AMD", "META", "AMZN", "TSLA", "GOOGL", "QQQ"].filter((s) =>
    new RegExp(`\\b${s}\\b`, "i").test(text)
  );
  return found.length ? [...found, "QQQ"] : ["Nasdaq"];
}

export const newsWire: SourceAdapter = {
  id: "newsWire",
  name: "News Wire",
  note: "Finnhub general-news via relay (FINNHUB_API_KEY, free tier). Mocked until configured.",
  async fetch(): Promise<AdapterResult> {
    const demo = () => ({
      events: mockEvents("newsWire", "News Wire", (t) =>
        ["Fed", "Rates", "Earnings", "Risk Sentiment"].includes(t.category)
      ),
      status: { id: this.id, name: this.name, live: false, configured: false, note: "No FINNHUB_API_KEY — demo headlines." }
    });
    if (APP.demoMode) return demo();
    try {
      const res = await relayGet<{ configured: boolean; items: { id: number; headline: string; datetime: number; source: string; url: string; summary: string }[] }>("/news");
      if (!res.configured) return demo();
      const events: CatalystEvent[] = res.items.map((n) => ({
        id: `nw-${n.id}`,
        ts: n.datetime * 1000,
        source: `News Wire (${n.source})`,
        sourceId: this.id,
        live: true,
        headline: n.headline,
        detail: n.summary?.slice(0, 240),
        url: n.url,
        category: categorize(n.headline + " " + (n.summary ?? "")),
        markets: marketsFor(n.headline),
        scheduled: false
      }));
      return { events, status: { id: this.id, name: this.name, live: true, configured: true, note: this.note } };
    } catch (err) {
      return {
        ...demo(),
        status: { id: this.id, name: this.name, live: false, configured: true, lastError: String(err), note: "Relay/news API error — demo headlines shown." }
      };
    }
  }
};
