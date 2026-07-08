import type { Category, Direction, FeedFilters, Severity } from "../../lib/types";
import { ADAPTERS } from "../../adapters";

const CATEGORIES: Category[] = ["Macro", "Fed", "Rates", "Earnings", "Options Flow", "Geopolitics", "Breaking News", "Risk Sentiment"];
const SEVERITIES: Severity[] = ["red", "orange", "yellow"];
const DIRECTIONS: Direction[] = ["bullish", "bearish", "mixed", "neutral"];

function toggle<T>(list: T[], v: T): T[] {
  return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
}

export default function FilterBar({
  filters, setFilters, pollSeconds, setPollSeconds, onRefresh, loading
}: {
  filters: FeedFilters;
  setFilters: (f: FeedFilters) => void;
  pollSeconds: number;
  setPollSeconds: (n: number) => void;
  onRefresh: () => void;
  loading: boolean;
}) {
  return (
    <div className="panel px-3.5 py-3 space-y-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-txt-low">Category</span>
        {CATEGORIES.map((c) => (
          <button key={c} className={`chip ${filters.categories.includes(c) ? "chip-on" : ""}`}
            onClick={() => setFilters({ ...filters, categories: toggle(filters.categories, c) })}>{c}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-txt-low">Severity</span>
        {SEVERITIES.map((s) => (
          <button key={s} className={`chip ${filters.severities.includes(s) ? "chip-on" : ""}`}
            onClick={() => setFilters({ ...filters, severities: toggle(filters.severities, s) })}>
            <span className={`h-1.5 w-1.5 rounded-full bg-sev-${s}`} />{s}
          </button>
        ))}
        <span className="ml-2 mr-1 text-[10px] uppercase tracking-[0.14em] text-txt-low">Bias</span>
        {DIRECTIONS.map((d) => (
          <button key={d} className={`chip ${filters.directions.includes(d) ? "chip-on" : ""}`}
            onClick={() => setFilters({ ...filters, directions: toggle(filters.directions, d) })}>{d}</button>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[10px] uppercase tracking-[0.14em] text-txt-low">Source</span>
        {ADAPTERS.map((a) => (
          <button key={a.id} className={`chip ${filters.sources.includes(a.id) ? "chip-on" : ""}`}
            onClick={() => setFilters({ ...filters, sources: toggle(filters.sources, a.id) })}>{a.name}</button>
        ))}
        <button className={`chip ${filters.qqqNqOnly ? "chip-on" : ""}`}
          onClick={() => setFilters({ ...filters, qqqNqOnly: !filters.qqqNqOnly })}>QQQ/NQ only</button>
        <button className={`chip ${filters.currentSessionOnly ? "chip-on" : ""}`}
          onClick={() => setFilters({ ...filters, currentSessionOnly: !filters.currentSessionOnly })}>current session</button>
        <span className="ml-auto flex items-center gap-1.5">
          <label className="text-[10px] uppercase tracking-[0.14em] text-txt-low" htmlFor="poll">Auto-refresh</label>
          <select id="poll" value={pollSeconds} onChange={(e) => setPollSeconds(Number(e.target.value))}
            className="rounded border border-ink-line bg-ink-800 px-1.5 py-0.5 text-[11px] text-txt-hi">
            {[30, 60, 120, 300].map((s) => <option key={s} value={s}>{s}s</option>)}
          </select>
          <button onClick={onRefresh} disabled={loading}
            className="chip chip-on disabled:opacity-50">{loading ? "Refreshing…" : "Refresh now"}</button>
        </span>
      </div>
    </div>
  );
}
