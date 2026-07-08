import { BIAS_RULES, type BiasRule } from "./config";
import type { CatalystEvent, Direction } from "./types";

export interface BiasResult {
  direction: Direction;
  confidence: number;
  rationale: string;
  nasdaqNote: string;
}

function ruleMatches(rule: BiasRule, e: CatalystEvent): boolean {
  const m = rule.match;
  if (m.categories && !m.categories.includes(e.category)) return false;
  if (m.keywordsAny) {
    const h = (e.headline + " " + (e.detail ?? "")).toLowerCase();
    if (!m.keywordsAny.some((k) => h.includes(k))) return false;
  }
  if (m.surprise) {
    if (e.actual == null || e.forecast == null) return false;
    if (m.surprise === "hot" && !(e.actual > e.forecast)) return false;
    if (m.surprise === "cool" && !(e.actual < e.forecast)) return false;
  }
  return true;
}

/**
 * All matching rules vote. Weighted votes are netted: strong one-sided votes
 * → bullish/bearish; strong but conflicting votes → mixed; weak/no votes →
 * neutral. Confidence blends rule confidence with vote agreement.
 */
export function biasFor(e: CatalystEvent): BiasResult {
  const hits = BIAS_RULES.filter((r) => ruleMatches(r, e));

  if (hits.length === 0) {
    return {
      direction: "neutral",
      confidence: 30,
      rationale: "No directional rule matched this event.",
      nasdaqNote: "Treated as informational for QQQ/NQ until follow-up headlines or data give it direction."
    };
  }

  let bull = 0, bear = 0;
  for (const r of hits) {
    if (r.direction === "bullish") bull += r.weight;
    else if (r.direction === "bearish") bear += r.weight;
    else if (r.direction === "mixed") { bull += r.weight / 2; bear += r.weight / 2; }
  }
  const total = bull + bear;
  const net = total === 0 ? 0 : (bull - bear) / total; // -1..1
  const top = hits.slice().sort((a, b) => b.weight - a.weight)[0];

  let direction: Direction;
  if (total < 2) direction = "neutral";
  else if (net > 0.25) direction = "bullish";
  else if (net < -0.25) direction = "bearish";
  else direction = "mixed";

  const agreement = Math.abs(net); // 0 = split, 1 = unanimous
  const avgConf = hits.reduce((s, r) => s + r.confidence * r.weight, 0) / Math.max(total, 1);
  const confidence = Math.round(Math.min(95, avgConf * (0.6 + 0.4 * agreement)));

  const rationale =
    direction === "mixed"
      ? `Conflicting signals: ${hits.map((h) => h.rationale.replace(/\.$/, "").toLowerCase()).join("; ")}.`
      : top.rationale;

  return { direction, confidence, rationale, nasdaqNote: top.nasdaqNote };
}
