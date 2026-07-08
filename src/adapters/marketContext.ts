/**
 * MARKET CONTEXT — VIX, DXY, US10Y, ES/NQ trend, watchlist quotes.
 *
 * Live path: relay → Finnhub quotes (watchlist) + FRED series (DGS10 for the
 * 10Y, DTWEXBGS for broad dollar). VIX/ES/NQ generally need a market-data
 * subscription (futures data is licensed) — the relay returns whatever is
 * configured and flags the rest, and this adapter merges in labeled mock
 * values for anything missing so the dashboard stays usable.
 */
import { APP } from "../lib/config";
import type { MarketContext } from "../lib/types";
import { mockContext } from "./mockData";
import { relayGet } from "./types";

export interface ContextResult {
  ctx: MarketContext;
  note: string;
}

export async function fetchMarketContext(): Promise<ContextResult> {
  if (APP.demoMode) return { ctx: mockContext(), note: "Demo mode — simulated context." };
  try {
    const live = await relayGet<Partial<MarketContext> & { configured: boolean }>("/context");
    const mock = mockContext();
    if (!live.configured) return { ctx: mock, note: "No market-data keys on relay — simulated context." };
    return {
      ctx: {
        live: true,
        vix: live.vix ?? mock.vix,
        vixChg: live.vixChg ?? mock.vixChg,
        dxy: live.dxy ?? mock.dxy,
        dxyChg: live.dxyChg ?? mock.dxyChg,
        us10y: live.us10y ?? mock.us10y,
        us10yChgBps: live.us10yChgBps ?? mock.us10yChgBps,
        esChgPct: live.esChgPct ?? mock.esChgPct,
        nqChgPct: live.nqChgPct ?? mock.nqChgPct,
        quotes: live.quotes && live.quotes.length ? live.quotes : mock.quotes
      },
      note: "Live context via relay (missing series backfilled with demo values, labeled per quote)."
    };
  } catch {
    return { ctx: mockContext(), note: "Relay unreachable — simulated context." };
  }
}
