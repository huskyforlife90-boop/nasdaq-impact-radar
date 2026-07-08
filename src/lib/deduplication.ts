import { APP } from "./config";
import type { CatalystEvent } from "./types";

const STOP = new Set(["the", "a", "an", "of", "to", "in", "on", "for", "and", "vs", "at", "by", "is", "are", "as", "with"]);

export function tokens(s: string): Set<string> {
  return new Set(
    s.toLowerCase().replace(/[^a-z0-9%.\s-]/g, " ").split(/\s+/).filter((t) => t.length > 1 && !STOP.has(t))
  );
}

export function similarity(a: string, b: string): number {
  const ta = tokens(a), tb = tokens(b);
  if (ta.size === 0 || tb.size === 0) return 0;
  let inter = 0;
  for (const t of ta) if (tb.has(t)) inter++;
  return inter / (ta.size + tb.size - inter); // Jaccard
}

export interface MergedGroup {
  primary: CatalystEvent; // most credible / earliest event carries the group
  confirmations: number; // total events in group
  headlines: string[]; // all merged headlines
  sources: string[];
}

/**
 * Groups near-duplicate events within a rolling window. Multiple sources
 * reporting the same catalyst are merged into one group; the group size
 * feeds the confirmation bonus in the scoring engine.
 */
export function dedupe(events: CatalystEvent[]): MergedGroup[] {
  const sorted = events.slice().sort((a, b) => a.ts - b.ts);
  const groups: MergedGroup[] = [];
  const windowMs = APP.dedupWindowMin * 60_000;

  for (const e of sorted) {
    const g = groups.find(
      (gr) =>
        Math.abs(gr.primary.ts - e.ts) <= windowMs &&
        similarity(gr.primary.headline, e.headline) >= APP.dedupSimilarity
    );
    if (g) {
      g.confirmations += 1;
      g.headlines.push(e.headline);
      if (!g.sources.includes(e.source)) g.sources.push(e.source);
      // Prefer a scheduled/official event with actual data as group primary.
      if ((e.actual != null && g.primary.actual == null) || (e.scheduled && !g.primary.scheduled)) {
        g.primary = e;
      }
    } else {
      groups.push({ primary: e, confirmations: 1, headlines: [e.headline], sources: [e.source] });
    }
  }
  return groups;
}
