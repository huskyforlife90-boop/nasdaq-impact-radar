import type { Direction, MarketContext, RollingSummary, ScoredEvent } from "./types";

/**
 * Weighted rolling Nasdaq sentiment from recent scored events plus market
 * context (yields / VIX / DXY). Returns -100..+100 (bearish..bullish).
 */
export function sentimentMeter(events: ScoredEvent[], ctx: MarketContext | null): number {
  let num = 0, den = 0;
  for (const e of events) {
    const w = (e.impactScore / 100) * (e.confidence / 100);
    const sign = e.direction === "bullish" ? 1 : e.direction === "bearish" ? -1 : 0;
    num += sign * w;
    den += w;
  }
  let meter = den > 0 ? (num / den) * 100 : 0;

  // Context tilt: rising yields / VIX / DXY drag the meter down, and vice versa.
  if (ctx) {
    let tilt = 0;
    if (ctx.us10yChgBps != null) tilt -= Math.max(-15, Math.min(15, ctx.us10yChgBps * 1.5));
    if (ctx.vixChg != null) tilt -= Math.max(-12, Math.min(12, ctx.vixChg * 4));
    if (ctx.dxyChg != null) tilt -= Math.max(-8, Math.min(8, ctx.dxyChg * 10));
    meter = meter * 0.8 + tilt;
  }
  return Math.round(Math.max(-100, Math.min(100, meter)));
}

export function toneFromMeter(meter: number): Direction {
  if (meter >= 15) return "bullish";
  if (meter <= -15) return "bearish";
  if (Math.abs(meter) > 5) return "mixed";
  return "neutral";
}

export interface Regime {
  bias: Direction;
  risk: "risk-on" | "risk-off" | "balanced";
  label: string;
}

export function regimeFor(meter: number, ctx: MarketContext | null): Regime {
  const bias = toneFromMeter(meter);
  let riskScore = 0;
  if (ctx) {
    if ((ctx.vix ?? 0) > 20) riskScore += 1;
    if ((ctx.vixChg ?? 0) > 0.5) riskScore += 1;
    if ((ctx.us10yChgBps ?? 0) > 3) riskScore += 1;
    if ((ctx.dxyChg ?? 0) > 0.2) riskScore += 1;
    if ((ctx.vixChg ?? 0) < -0.5) riskScore -= 1;
    if ((ctx.us10yChgBps ?? 0) < -3) riskScore -= 1;
  }
  const risk = riskScore >= 2 ? "risk-off" : riskScore <= -1 ? "risk-on" : "balanced";
  return { bias, risk, label: `${bias} · ${risk}` };
}

export function buildSummary(events: ScoredEvent[], ctx: MarketContext | null): RollingSummary {
  const recent = events.slice().sort((a, b) => b.impactScore - a.impactScore);
  const meter = sentimentMeter(events, ctx);
  const tone = toneFromMeter(meter);

  const topBullish = recent.filter((e) => e.direction === "bullish").slice(0, 3);
  const topBearish = recent.filter((e) => e.direction === "bearish").slice(0, 3);

  const drivers: string[] = [];
  if (ctx?.us10yChgBps != null && Math.abs(ctx.us10yChgBps) >= 2)
    drivers.push(ctx.us10yChgBps > 0 ? "yields are rising" : "yields are falling");
  if (ctx?.vixChg != null && Math.abs(ctx.vixChg) >= 0.4)
    drivers.push(ctx.vixChg > 0 ? "volatility is bid" : "volatility is bleeding off");
  const lead = recent.find((e) => e.severity !== "yellow");
  if (lead) drivers.push(`the lead catalyst is ${lead.direction}: "${lead.headline}"`);
  if (drivers.length === 0) drivers.push("no dominant catalyst on the tape right now");

  const headlineSummary = `Current Nasdaq tone is ${tone} because ${drivers.join(", ")}.`;

  // Risk score 0–100: severity-weighted bearish pressure + context stress.
  let risk = 50 - meter / 2.5;
  const redCount = events.filter((e) => e.severity === "red").length;
  risk += Math.min(20, redCount * 7);
  const riskScore = Math.round(Math.max(0, Math.min(100, risk)));

  return { ts: Date.now(), tone, riskScore, headlineSummary, topBullish, topBearish };
}
