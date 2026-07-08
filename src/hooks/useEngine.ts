import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ADAPTERS } from "../adapters";
import { fetchMarketContext } from "../adapters/marketContext";
import { announcer } from "../lib/announcementEngine";
import { biasFor } from "../lib/biasEngine";
import { APP, NASDAQ_SYMBOLS } from "../lib/config";
import { dedupe } from "../lib/deduplication";
import { buildSummary, regimeFor, sentimentMeter, type Regime } from "../lib/rollingSummary";
import { isNasdaqRelevant, scoreEvent, sessionFor } from "../lib/scoringEngine";
import type { AdapterStatus, FeedFilters, MarketContext, RollingSummary, ScoredEvent, VoiceSettings } from "../lib/types";

export interface EngineState {
  events: ScoredEvent[]; // all scored, deduped, newest first
  statuses: AdapterStatus[];
  context: MarketContext | null;
  contextNote: string;
  summary: RollingSummary | null;
  meter: number; // -100..100
  regime: Regime;
  lastRefresh: number | null;
  loading: boolean;
  refresh: () => void;
}

export const EMPTY_FILTERS: FeedFilters = {
  sources: [],
  categories: [],
  severities: [],
  directions: [],
  qqqNqOnly: false,
  currentSessionOnly: false
};

export function applyFilters(events: ScoredEvent[], f: FeedFilters): ScoredEvent[] {
  const nowSession = sessionFor(Date.now());
  return events.filter((e) => {
    if (f.sources.length && !f.sources.includes(e.sourceId)) return false;
    if (f.categories.length && !f.categories.includes(e.category)) return false;
    if (f.severities.length && !f.severities.includes(e.severity)) return false;
    if (f.directions.length && !f.directions.includes(e.direction)) return false;
    if (f.qqqNqOnly && !(isNasdaqRelevant(e) || e.markets.some((m) => NASDAQ_SYMBOLS.includes(m.toUpperCase())))) return false;
    if (f.currentSessionOnly && e.session !== nowSession) return false;
    return true;
  });
}

export function useEngine(voice: VoiceSettings, pollSeconds: number): EngineState {
  const [events, setEvents] = useState<ScoredEvent[]>([]);
  const [statuses, setStatuses] = useState<AdapterStatus[]>([]);
  const [context, setContext] = useState<MarketContext | null>(null);
  const [contextNote, setContextNote] = useState("");
  const [summary, setSummary] = useState<RollingSummary | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);

  const voiceRef = useRef(voice);
  voiceRef.current = voice;
  const lastSummaryTs = useRef(0);
  const inFlight = useRef(false); // guards against overlapping polls if one runs long (e.g. cold-starting relay)

  const refresh = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const [results, ctxRes] = await Promise.all([
        Promise.all(ADAPTERS.map((a) => a.fetch().catch((err) => ({
          events: [],
          status: { id: a.id, name: a.name, live: false, configured: false, lastError: String(err), note: "Adapter crashed." }
        })))),
        fetchMarketContext()
      ]);

      setStatuses(results.map((r) => r.status));
      setContext(ctxRes.ctx);
      setContextNote(ctxRes.note);

      // Pipeline: merge near-duplicates across sources, then score + bias.
      const raw = results.flatMap((r) => r.events);
      const cutoff = Date.now() - APP.historyWindowMin * 60_000 * 4; // keep 4h in memory
      const groups = dedupe(raw.filter((e) => e.ts >= cutoff && e.ts <= Date.now() + 12 * 3600_000));

      const scored: ScoredEvent[] = groups.map((g) => {
        const e = g.primary;
        const s = scoreEvent(e, g.confirmations);
        const b = biasFor(e);
        return {
          ...e,
          ...s,
          ...b,
          confirmations: g.confirmations,
          mergedHeadlines: g.confirmations > 1 ? g.headlines : undefined,
          source: g.sources.length > 1 ? `${e.source} +${g.sources.length - 1}` : e.source
        };
      }).sort((a, b) => b.ts - a.ts);

      setEvents(scored);
      setLastRefresh(Date.now());

      // Voice: announce fresh past events that clear the user's thresholds.
      const now = Date.now();
      for (const e of scored) {
        if (e.ts <= now && now - e.ts < Math.max(pollSeconds * 2, 120) * 1000) {
          announcer.announce(e, voiceRef.current);
        }
      }

      // Rolling summary on its own cadence.
      const past = scored.filter((e) => e.ts <= now && now - e.ts <= APP.historyWindowMin * 60_000);
      if (now - lastSummaryTs.current >= APP.summaryEveryMin * 60_000 || lastSummaryTs.current === 0) {
        setSummary(buildSummary(past, ctxRes.ctx));
        lastSummaryTs.current = now;
      }
    } finally {
      setLoading(false);
      inFlight.current = false;
    }
  }, [pollSeconds]);

  useEffect(() => {
    refresh();
    const iv = setInterval(refresh, Math.max(10, pollSeconds) * 1000);
    return () => clearInterval(iv);
  }, [refresh, pollSeconds]);

  const pastEvents = useMemo(
    () => events.filter((e) => e.ts <= Date.now() && Date.now() - e.ts <= APP.historyWindowMin * 60_000),
    [events, lastRefresh]
  );
  const rawMeter = useMemo(() => sentimentMeter(pastEvents, context), [pastEvents, context]);
  // Smooth the meter so the gauge glides between polls instead of snapping —
  // raw recalculation each cycle made the needle visibly twitch on every
  // small quote/context change even when nothing meaningful happened.
  const smoothedMeter = useRef<number | null>(null);
  const meter = useMemo(() => {
    if (smoothedMeter.current === null) smoothedMeter.current = rawMeter;
    else smoothedMeter.current = smoothedMeter.current * 0.7 + rawMeter * 0.3;
    return Math.round(smoothedMeter.current);
  }, [rawMeter]);
  const regime = useMemo(() => regimeFor(meter, context), [meter, context]);

  return { events, statuses, context, contextNote, summary, meter, regime, lastRefresh, loading, refresh };
}
