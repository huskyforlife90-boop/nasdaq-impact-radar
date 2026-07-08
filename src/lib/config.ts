/**
 * ─────────────────────────────────────────────────────────────────────────────
 * NASDAQ IMPACT RADAR — RULES & TUNING CONFIG
 *
 * This is the ONE file to edit when you want to change how events are scored,
 * how bullish/bearish bias is decided, and where the yellow/orange/red
 * thresholds sit. Everything here is plain data — no code changes needed.
 * ─────────────────────────────────────────────────────────────────────────────
 */
import type { Category, Direction } from "./types";

export const APP = {
  pollSecondsDefault: Number(import.meta.env.VITE_POLL_SECONDS || 30),
  demoMode: String(import.meta.env.VITE_DEMO_MODE ?? "true") !== "false",
  relayUrl: (import.meta.env.VITE_RELAY_URL || "").replace(/\/$/, ""),
  historyWindowMin: 60, // replay/history panel lookback
  summaryEveryMin: 3, // rolling summary cadence
  dedupWindowMin: 30,
  dedupSimilarity: 0.55 // Jaccard threshold on headline tokens
};

/** Source credibility 0–1. Feeds every impact score. */
export const SOURCE_CREDIBILITY: Record<string, number> = {
  forexFactory: 0.92, // scheduled official macro data
  unusualWhales: 0.78,
  stockMktNewz: 0.7, // fast, but single-account breaking news
  newsWire: 0.85,
  marketContext: 0.9,
  mock: 0.6
};

/** Base impact weight per category (0–100 before modifiers). */
export const CATEGORY_BASE: Record<Category, number> = {
  Macro: 62,
  Fed: 68,
  Rates: 58,
  Earnings: 52,
  "Options Flow": 34,
  Geopolitics: 55,
  "Breaking News": 48,
  "Risk Sentiment": 44
};

/** High-impact scheduled releases get an extra bump when matched by keyword. */
export const TIER1_RELEASES = [
  "cpi", "core cpi", "pce", "core pce", "nonfarm", "nfp", "payrolls", "fomc",
  "rate decision", "powell", "unemployment rate", "ppi", "gdp", "ism", "jolts",
  "retail sales", "michigan", "jobless claims"
];

export const SCORING = {
  tier1Bonus: 18,
  unscheduledBonus: 8, // surprise headlines move markets more
  surpriseWeight: 30, // scaled by |actual-forecast|/|forecast| capped at 1
  confirmationBonus: 6, // per extra confirming source (capped)
  confirmationCap: 3,
  recencyHalfLifeMin: 45, // score decays with age
  nasdaqRelevanceBonus: 10, // event explicitly tags QQQ/NQ/mega-cap tech
  sessionMultiplier: {
    regular: 1.0,
    premarket: 0.92,
    postmarket: 0.85,
    overnight: 0.7
  },
  severityThresholds: { red: 72, orange: 50 } // below orange = yellow
};

/**
 * BIAS RULES — evaluated top-to-bottom; all matching rules vote, votes are
 * weighted and combined. Keep rationales in plain English: they surface
 * directly in the UI and in voice announcements.
 *
 * match fields:
 *  - categories: event category must be one of these
 *  - keywordsAny: headline must contain at least one (case-insensitive)
 *  - surprise: "hot" (actual > forecast) | "cool" (actual < forecast)
 */
export interface BiasRule {
  id: string;
  match: {
    categories?: Category[];
    keywordsAny?: string[];
    surprise?: "hot" | "cool";
  };
  direction: Direction;
  weight: number; // vote strength 1–10
  confidence: number; // base confidence 0–100
  rationale: string;
  nasdaqNote: string;
}

export const BIAS_RULES: BiasRule[] = [
  {
    id: "hot-inflation",
    match: { categories: ["Macro"], keywordsAny: ["cpi", "pce", "ppi", "inflation"], surprise: "hot" },
    direction: "bearish", weight: 9, confidence: 78,
    rationale: "Hotter-than-expected inflation print.",
    nasdaqNote: "Hot inflation pressures yields higher and trims rate-cut odds — a valuation headwind for long-duration QQQ/NQ growth names."
  },
  {
    id: "cool-inflation",
    match: { categories: ["Macro"], keywordsAny: ["cpi", "pce", "ppi", "inflation"], surprise: "cool" },
    direction: "bullish", weight: 9, confidence: 78,
    rationale: "Softer-than-expected inflation print.",
    nasdaqNote: "Cooler inflation supports lower yields and easier Fed expectations — typically bullish for growth-heavy QQQ/NQ."
  },
  {
    id: "hot-jobs",
    match: { categories: ["Macro"], keywordsAny: ["payroll", "nonfarm", "nfp", "jobs", "jolts"], surprise: "hot" },
    direction: "mixed", weight: 5, confidence: 55,
    rationale: "Stronger-than-expected labor data.",
    nasdaqNote: "Strong jobs cut recession risk but push yields up and delay cuts — historically mixed for NQ, often bearish on the initial spike."
  },
  {
    id: "hawkish-fed",
    match: { categories: ["Fed"], keywordsAny: ["hawkish", "higher for longer", "no cuts", "raise", "hike", "restrictive"] },
    direction: "bearish", weight: 8, confidence: 72,
    rationale: "Hawkish Fed communication.",
    nasdaqNote: "Hawkish Fed tone lifts the discount rate on future tech earnings — a direct drag on Nasdaq multiples."
  },
  {
    id: "dovish-fed",
    match: { categories: ["Fed"], keywordsAny: ["dovish", "cut", "cuts", "easing", "pause", "pivot"] },
    direction: "bullish", weight: 8, confidence: 72,
    rationale: "Dovish Fed communication.",
    nasdaqNote: "Dovish signals lower the rate path — supportive for growth-stock valuations and NQ."
  },
  {
    id: "yields-up",
    match: { categories: ["Rates"], keywordsAny: ["yields rise", "yield spike", "10-year up", "10y up", "sell-off in bonds", "yields jump", "auction tails"] },
    direction: "bearish", weight: 7, confidence: 68,
    rationale: "Rising Treasury yields.",
    nasdaqNote: "Rising 10Y yields compress tech multiples; NQ is the most rate-sensitive index future."
  },
  {
    id: "yields-down",
    match: { categories: ["Rates"], keywordsAny: ["yields fall", "yields drop", "10-year down", "10y down", "bond rally", "yields ease"] },
    direction: "bullish", weight: 7, confidence: 68,
    rationale: "Falling Treasury yields.",
    nasdaqNote: "Falling yields relieve valuation pressure on mega-cap tech — supportive for QQQ/NQ."
  },
  {
    id: "strong-tech-earnings",
    match: { categories: ["Earnings"], keywordsAny: ["beats", "beat", "raises guidance", "strong guidance", "above estimates", "record revenue"] },
    direction: "bullish", weight: 7, confidence: 70,
    rationale: "Strong mega-cap tech results or guidance.",
    nasdaqNote: "Mega-cap beats lift index-level earnings expectations; the top 10 names dominate QQQ weightings."
  },
  {
    id: "weak-tech-earnings",
    match: { categories: ["Earnings"], keywordsAny: ["misses", "miss", "cuts guidance", "weak guidance", "below estimates", "warns"] },
    direction: "bearish", weight: 7, confidence: 70,
    rationale: "Weak mega-cap tech results or guidance.",
    nasdaqNote: "Guidance cuts in index heavyweights hit QQQ/NQ directly through their large weights."
  },
  {
    id: "geopolitical-shock",
    match: { categories: ["Geopolitics"], keywordsAny: ["strike", "attack", "escalation", "missile", "sanctions", "conflict", "invasion", "tensions"] },
    direction: "bearish", weight: 6, confidence: 60,
    rationale: "Geopolitical risk-off shock.",
    nasdaqNote: "Risk-off flows favor bonds/USD over high-beta tech; NQ usually underperforms on geopolitical shocks."
  },
  {
    id: "bullish-flow",
    match: { categories: ["Options Flow"], keywordsAny: ["call sweep", "call buying", "bullish flow", "calls bought", "upside bets"] },
    direction: "bullish", weight: 4, confidence: 45,
    rationale: "Bullish unusual options flow in key Nasdaq names.",
    nasdaqNote: "Aggressive call flow in index heavyweights can support short-term upside — lower confidence unless macro context confirms."
  },
  {
    id: "bearish-flow",
    match: { categories: ["Options Flow"], keywordsAny: ["put sweep", "put buying", "bearish flow", "puts bought", "downside bets", "hedging"] },
    direction: "bearish", weight: 4, confidence: 45,
    rationale: "Bearish unusual options flow in key Nasdaq names.",
    nasdaqNote: "Heavy put flow signals hedging/downside positioning in Nasdaq leaders — a caution flag, not a standalone signal."
  },
  {
    id: "risk-off-tape",
    match: { categories: ["Risk Sentiment"], keywordsAny: ["vix spikes", "vix jumps", "risk-off", "breadth weak", "dxy rises", "flight to safety"] },
    direction: "bearish", weight: 5, confidence: 58,
    rationale: "Risk-off tape: volatility and dollar bid.",
    nasdaqNote: "Rising VIX + rising DXY + rising yields is the classic bearish context for NQ."
  },
  {
    id: "risk-on-tape",
    match: { categories: ["Risk Sentiment"], keywordsAny: ["vix falls", "risk-on", "breadth improves", "dxy falls", "risk appetite"] },
    direction: "bullish", weight: 5, confidence: 58,
    rationale: "Risk-on tape: volatility bleeding off.",
    nasdaqNote: "Falling yields and improving risk appetite are the classic bullish context for QQQ/NQ."
  }
];

/** Symbols treated as "Nasdaq-relevant" for relevance boosts and QQQ/NQ filter. */
export const NASDAQ_SYMBOLS = [
  "QQQ", "NQ", "NASDAQ", "NDX", "AAPL", "MSFT", "NVDA", "AMD", "META", "AMZN",
  "TSLA", "GOOGL", "GOOG", "AVGO", "SEMIS", "SMH"
];

export const WATCHLIST = ["QQQ", "NQ", "AAPL", "MSFT", "NVDA", "AMD", "META", "AMZN", "TSLA"];
