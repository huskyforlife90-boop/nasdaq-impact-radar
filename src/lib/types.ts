export type Category =
  | "Macro"
  | "Fed"
  | "Rates"
  | "Earnings"
  | "Options Flow"
  | "Geopolitics"
  | "Breaking News"
  | "Risk Sentiment";

export type Direction = "bullish" | "bearish" | "mixed" | "neutral";
export type Severity = "yellow" | "orange" | "red";
export type Session = "premarket" | "regular" | "postmarket" | "overnight";

/** Raw event as produced by a source adapter, before scoring. */
export interface CatalystEvent {
  id: string;
  ts: number; // epoch ms
  source: string; // adapter display name, e.g. "Forex Factory"
  sourceId: string; // adapter id, e.g. "forexFactory"
  live: boolean; // true = came from a real connected feed, false = mock/demo
  headline: string;
  detail?: string;
  category: Category;
  markets: string[]; // e.g. ["QQQ","NQ","Nasdaq","NVDA"]
  scheduled: boolean; // scheduled release vs unscheduled headline
  actual?: number;
  forecast?: number;
  previous?: number;
  unit?: string; // "%", "K", "bps"…
  url?: string;
}

/** Event after passing through dedup, scoring and bias engines. */
export interface ScoredEvent extends CatalystEvent {
  impactScore: number; // 0–100
  severity: Severity;
  direction: Direction;
  confidence: number; // 0–100
  rationale: string; // plain-English "why"
  nasdaqNote: string; // why it matters for QQQ/NQ specifically
  surprisePct?: number; // |actual-forecast| / |forecast|
  session: Session;
  confirmations: number; // merged near-duplicate count
  mergedHeadlines?: string[];
}

export interface MarketContext {
  live: boolean;
  vix?: number;
  vixChg?: number;
  dxy?: number;
  dxyChg?: number;
  us10y?: number; // %
  us10yChgBps?: number;
  esChgPct?: number;
  nqChgPct?: number;
  quotes: Quote[];
}

export interface Quote {
  symbol: string;
  last: number;
  chgPct: number;
  live: boolean;
}

export interface RollingSummary {
  ts: number;
  tone: Direction;
  riskScore: number; // 0–100, higher = more risk-off / dangerous tape
  headlineSummary: string;
  topBullish: ScoredEvent[];
  topBearish: ScoredEvent[];
}

export interface VoiceSettings {
  enabled: boolean;
  muted: boolean;
  minSeverity: Severity; // announce this severity and above (default "orange")
  macroRedOnly: boolean; // only announce Macro/Fed/Rates red events
  chime: boolean;
  voiceURI: string | null;
  rate: number; // 0.5–2
  volume: number; // 0–1
  quietHoursEnabled: boolean;
  quietStart: string; // "22:00"
  quietEnd: string; // "07:00"
}

export interface FeedFilters {
  sources: string[]; // empty = all
  categories: Category[]; // empty = all
  severities: Severity[]; // empty = all
  directions: Direction[]; // empty = all
  qqqNqOnly: boolean;
  currentSessionOnly: boolean;
}

export interface AdapterStatus {
  id: string;
  name: string;
  live: boolean; // currently returning live data
  configured: boolean; // credentials/relay present
  lastError?: string;
  note: string;
}
