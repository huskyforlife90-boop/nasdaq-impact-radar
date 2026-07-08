import { CATEGORY_BASE, NASDAQ_SYMBOLS, SCORING, SOURCE_CREDIBILITY, TIER1_RELEASES } from "./config";
import type { CatalystEvent, Session, Severity } from "./types";

/** US-equity session from an event timestamp (approximated in ET). */
export function sessionFor(ts: number): Session {
  // Convert to America/New_York wall-clock.
  const et = new Date(new Date(ts).toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  const mins = et.getHours() * 60 + et.getMinutes();
  if (day === 0 || day === 6) return "overnight";
  if (mins >= 570 && mins < 960) return "regular"; // 9:30–16:00
  if (mins >= 240 && mins < 570) return "premarket"; // 4:00–9:30
  if (mins >= 960 && mins < 1200) return "postmarket"; // 16:00–20:00
  return "overnight";
}

export function surprisePct(e: CatalystEvent): number | undefined {
  if (e.actual == null || e.forecast == null) return undefined;
  const denom = Math.abs(e.forecast) || Math.abs(e.previous ?? 0) || 1;
  return Math.abs(e.actual - e.forecast) / denom;
}

export function isNasdaqRelevant(e: CatalystEvent): boolean {
  const tagged = e.markets.some((m) => NASDAQ_SYMBOLS.includes(m.toUpperCase()));
  // Macro/Fed/Rates always matter for NQ even without explicit tags.
  return tagged || ["Macro", "Fed", "Rates", "Risk Sentiment"].includes(e.category);
}

export interface ScoreResult {
  impactScore: number;
  severity: Severity;
  session: Session;
  surprisePct?: number;
}

/**
 * Impact score 0–100. Inputs (all tunable in config.ts):
 * credibility × category base, tier-1 release bonus, scheduled vs unscheduled,
 * surprise size vs forecast, Nasdaq relevance, session multiplier,
 * multi-source confirmations, and recency decay.
 */
export function scoreEvent(e: CatalystEvent, confirmations: number, now = Date.now()): ScoreResult {
  const cred = SOURCE_CREDIBILITY[e.sourceId] ?? 0.6;
  let score = CATEGORY_BASE[e.category] * (0.6 + 0.4 * cred);

  const h = e.headline.toLowerCase();
  if (TIER1_RELEASES.some((k) => h.includes(k))) score += SCORING.tier1Bonus;
  if (!e.scheduled) score += SCORING.unscheduledBonus;

  const sp = surprisePct(e);
  if (sp != null) score += SCORING.surpriseWeight * Math.min(sp / 0.25, 1); // 25%+ surprise = full weight

  if (isNasdaqRelevant(e) && e.markets.length > 0) score += SCORING.nasdaqRelevanceBonus;

  const session = sessionFor(e.ts);
  score *= SCORING.sessionMultiplier[session];

  score += SCORING.confirmationBonus * Math.min(confirmations - 1, SCORING.confirmationCap);

  // Recency decay: half-life on the portion of score above 20.
  const ageMin = Math.max(0, (now - e.ts) / 60000);
  const decay = Math.pow(0.5, ageMin / SCORING.recencyHalfLifeMin);
  score = 20 + (score - 20) * decay;

  const impactScore = Math.round(Math.max(0, Math.min(100, score)));
  const severity: Severity =
    impactScore >= SCORING.severityThresholds.red ? "red"
    : impactScore >= SCORING.severityThresholds.orange ? "orange"
    : "yellow";

  return { impactScore, severity, session, surprisePct: sp };
}
