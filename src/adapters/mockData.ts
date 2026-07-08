/**
 * DEMO DATA ONLY. Every event produced here is flagged `live: false` and the
 * UI renders a "DEMO" badge on it. This file exists so the dashboard is fully
 * exercisable before any API keys are configured. Nothing here should ever be
 * mistaken for a real feed — sources are suffixed "(demo)".
 */
import type { CatalystEvent, MarketContext, Quote } from "../lib/types";
import { WATCHLIST } from "../lib/config";

let seed = 42;
function rnd() {
  seed = (seed * 1103515245 + 12345) % 2 ** 31;
  return seed / 2 ** 31;
}

const min = 60_000;

interface Template {
  headline: string;
  category: CatalystEvent["category"];
  markets: string[];
  scheduled: boolean;
  actual?: number;
  forecast?: number;
  previous?: number;
  unit?: string;
  detail?: string;
}

const TEMPLATES: Template[] = [
  { headline: "US CPI YoY comes in at 3.4% vs 3.1% forecast — hotter than expected", category: "Macro", markets: ["QQQ", "NQ"], scheduled: true, actual: 3.4, forecast: 3.1, previous: 3.2, unit: "%" },
  { headline: "Core PCE MoM prints 0.2% vs 0.3% forecast — softer inflation", category: "Macro", markets: ["QQQ", "NQ"], scheduled: true, actual: 0.2, forecast: 0.3, previous: 0.3, unit: "%" },
  { headline: "Initial jobless claims 232K vs 220K forecast", category: "Macro", markets: ["NQ"], scheduled: true, actual: 232, forecast: 220, previous: 218, unit: "K" },
  { headline: "Fed's Waller: higher for longer remains appropriate, no cuts near term", category: "Fed", markets: ["QQQ", "NQ"], scheduled: false },
  { headline: "Powell hints at possible easing path if inflation cools — dovish tilt", category: "Fed", markets: ["QQQ", "NQ"], scheduled: false },
  { headline: "10-year Treasury yields jump 8bps after weak auction tails", category: "Rates", markets: ["NQ", "QQQ"], scheduled: false },
  { headline: "Yields ease as bond rally extends; 10Y down 6bps on the session", category: "Rates", markets: ["NQ", "QQQ"], scheduled: false },
  { headline: "NVDA beats on revenue and raises guidance; data-center demand strong", category: "Earnings", markets: ["NVDA", "QQQ", "SEMIS"], scheduled: true },
  { headline: "TSLA misses on margins, cuts guidance for deliveries", category: "Earnings", markets: ["TSLA", "QQQ"], scheduled: true },
  { headline: "Large call sweep detected in MSFT — bullish flow, $12M premium", category: "Options Flow", markets: ["MSFT", "QQQ"], scheduled: false },
  { headline: "Aggressive put buying in QQQ front-week expiries — hedging flow", category: "Options Flow", markets: ["QQQ", "NQ"], scheduled: false },
  { headline: "Reports of escalation in Middle East; crude spikes, futures slip", category: "Geopolitics", markets: ["NQ", "ES"], scheduled: false },
  { headline: "BREAKING: Major cloud outage hits AWS us-east-1, mega-caps wobble", category: "Breaking News", markets: ["AMZN", "QQQ"], scheduled: false },
  { headline: "VIX spikes above 18 as breadth weakens into the afternoon", category: "Risk Sentiment", markets: ["NQ", "QQQ"], scheduled: false },
  { headline: "Risk appetite improves: VIX falls, DXY falls, breadth improves", category: "Risk Sentiment", markets: ["NQ", "QQQ"], scheduled: false },
  { headline: "Semis lead: AMD and NVDA push NDX to session highs", category: "Breaking News", markets: ["AMD", "NVDA", "QQQ"], scheduled: false }
];

/** Rolling demo stream: a stable backlog that ages naturally, not a fresh
 * random shuffle every poll. Assigning each headline's timestamp ONCE (on
 * first request) and reusing it means "17m ago" becomes "18m ago" next
 * poll like a real feed — not jumping to a random new age every ~15s. */
const eventTsCache = new Map<string, number>();

export function mockEvents(sourceId: string, sourceName: string, pick: (t: Template) => boolean): CatalystEvent[] {
  const now = Date.now();
  const chosen = TEMPLATES.filter(pick);
  return chosen.map((t, i) => {
    const key = `${sourceId}-${t.headline}`;
    let ts = eventTsCache.get(key);
    if (ts === undefined) {
      const age = (i * 7 + Math.floor(rnd() * 6)) % 55; // spread across last ~55 min, assigned once
      ts = now - age * min;
      eventTsCache.set(key, ts);
    }
    return {
      id: `${sourceId}-demo-${t.headline.slice(0, 24)}`,
      ts,
      source: `${sourceName} (demo)`,
      sourceId,
      live: false,
      headline: t.headline,
      detail: t.detail,
      category: t.category,
      markets: t.markets,
      scheduled: t.scheduled,
      actual: t.actual,
      forecast: t.forecast,
      previous: t.previous,
      unit: t.unit
    };
  });
}

export function mockCalendar(): CatalystEvent[] {
  const now = new Date();
  const at = (h: number, m: number) => {
    const d = new Date(now);
    d.setHours(h, m, 0, 0);
    return d.getTime();
  };
  const rows = [
    { h: 8, m: 30, headline: "US CPI YoY (Jun)", actual: 3.4, forecast: 3.1, previous: 3.2 },
    { h: 8, m: 30, headline: "US Core CPI MoM (Jun)", actual: 0.3, forecast: 0.2, previous: 0.2 },
    { h: 10, m: 0, headline: "Fed Chair Powell testimony", actual: undefined, forecast: undefined, previous: undefined },
    { h: 13, m: 0, headline: "10-Year Note auction", actual: undefined, forecast: undefined, previous: undefined },
    { h: 14, m: 0, headline: "FOMC meeting minutes", actual: undefined, forecast: undefined, previous: undefined }
  ];
  return rows.map((r, i) => ({
    id: `ff-demo-cal-${i}-${now.toDateString()}`,
    ts: at(r.h, r.m),
    source: "Forex Factory (demo)",
    sourceId: "forexFactory",
    live: false,
    headline: r.headline,
    category: r.headline.toLowerCase().includes("fomc") || r.headline.toLowerCase().includes("powell") ? "Fed" : r.headline.toLowerCase().includes("auction") ? "Rates" : "Macro",
    markets: ["QQQ", "NQ"],
    scheduled: true,
    actual: r.actual,
    forecast: r.forecast,
    previous: r.previous,
    unit: "%"
  }));
}

// Demo context drifts slightly between polls instead of fully re-randomizing —
// full independent randomization every ~15s poll made numbers jump around
// jarringly. A cached baseline nudged by small deltas reads like a real,
// gently-moving quote feed instead.
let cachedCtx: MarketContext | null = null;

function nudge(value: number, magnitude: number, min?: number, max?: number): number {
  let next = value + (rnd() - 0.5) * magnitude;
  if (min !== undefined) next = Math.max(min, next);
  if (max !== undefined) next = Math.min(max, next);
  return next;
}

export function mockContext(): MarketContext {
  if (!cachedCtx) {
    const j = () => (rnd() - 0.5) * 0.4;
    const quotes: Quote[] = WATCHLIST.map((s) => ({
      symbol: s,
      last: s === "NQ" ? 21500 + rnd() * 200 : s === "QQQ" ? 520 + rnd() * 5 : 100 + rnd() * 400,
      chgPct: (rnd() - 0.45) * 2.4,
      live: false
    }));
    cachedCtx = {
      live: false,
      vix: 15.8 + rnd() * 4,
      vixChg: (rnd() - 0.45) * 1.4,
      dxy: 104.2 + j(),
      dxyChg: (rnd() - 0.5) * 0.5,
      us10y: 4.31 + j() / 10,
      us10yChgBps: (rnd() - 0.45) * 8,
      esChgPct: (rnd() - 0.45) * 1.2,
      nqChgPct: (rnd() - 0.45) * 1.8,
      quotes
    };
    return cachedCtx;
  }

  // Small drift on repeat calls, not a fresh independent sample.
  cachedCtx = {
    ...cachedCtx,
    vix: nudge(cachedCtx.vix ?? 18, 0.3, 10, 40),
    vixChg: nudge(cachedCtx.vixChg ?? 0, 0.15, -3, 3),
    dxy: nudge(cachedCtx.dxy ?? 104, 0.06, 95, 115),
    dxyChg: nudge(cachedCtx.dxyChg ?? 0, 0.05, -1.5, 1.5),
    us10y: nudge(cachedCtx.us10y ?? 4.3, 0.01, 3.5, 5.5),
    us10yChgBps: nudge(cachedCtx.us10yChgBps ?? 0, 0.6, -15, 15),
    esChgPct: nudge(cachedCtx.esChgPct ?? 0, 0.08, -3, 3),
    nqChgPct: nudge(cachedCtx.nqChgPct ?? 0, 0.1, -3.5, 3.5),
    quotes: cachedCtx.quotes.map((q) => {
      const last = Math.max(1, nudge(q.last, q.last * 0.003));
      return { ...q, last, chgPct: nudge(q.chgPct, 0.05, -8, 8) };
    })
  };
  return cachedCtx;
}
