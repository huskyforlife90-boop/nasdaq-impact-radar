import { clock } from "../../lib/format";
import type { ScoredEvent } from "../../lib/types";

/** Today's scheduled macro events (Forex Factory feed), past and upcoming. */
export default function EconCalendar({ events }: { events: ScoredEvent[] }) {
  const now = Date.now();
  const startOfDay = new Date(); startOfDay.setHours(0, 0, 0, 0);
  const endOfDay = new Date(); endOfDay.setHours(23, 59, 59, 999);
  const rows = events
    .filter((e) => e.scheduled && e.sourceId === "forexFactory" && e.ts >= startOfDay.getTime() && e.ts <= endOfDay.getTime())
    .sort((a, b) => a.ts - b.ts);
  return (
    <div className="panel">
      <div className="panel-title">Today's economic calendar</div>
      <ul className="px-3.5 pb-3">
        {rows.length === 0 && <li className="py-2 text-[12px] text-txt-low">No scheduled US releases remaining today.</li>}
        {rows.map((e) => {
          const upcoming = e.ts > now;
          return (
            <li key={e.id} className={`flex items-center gap-2.5 border-b border-ink-line/60 py-2 text-[12px] last:border-0 ${upcoming ? "" : "opacity-75"}`}>
              <span className={`font-mono ${upcoming ? "text-accent" : "text-txt-low"}`}>{clock(e.ts)}</span>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full bg-sev-${e.severity}`} />
              <span className="min-w-0 flex-1 truncate text-txt-hi">{e.headline}</span>
              {e.actual != null ? (
                <span className={`font-mono text-[11px] ${e.direction === "bullish" ? "text-bull" : e.direction === "bearish" ? "text-bear" : "text-txt-mid"}`}>
                  {e.actual}{e.unit ?? ""} vs {e.forecast ?? "—"}{e.unit ?? ""}
                </span>
              ) : (
                <span className="font-mono text-[11px] text-txt-low">{upcoming ? "upcoming" : "released"}</span>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
