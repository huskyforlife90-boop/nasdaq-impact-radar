import { APP } from "../../lib/config";
import { clock, timeAgo } from "../../lib/format";
import type { ScoredEvent } from "../../lib/types";
import { SevDot } from "./AlertCard";

/** Replay panel: important (orange/red) events from the last 30–60 minutes. */
export default function HistoryPanel({ events }: { events: ScoredEvent[] }) {
  const now = Date.now();
  const items = events
    .filter((e) => e.ts <= now && now - e.ts <= APP.historyWindowMin * 60_000 && e.severity !== "yellow")
    .sort((a, b) => b.ts - a.ts);
  return (
    <div className="panel">
      <div className="panel-title">Alert replay · last {APP.historyWindowMin} min</div>
      <ul className="max-h-72 overflow-y-auto px-3.5 pb-3">
        {items.length === 0 && <li className="py-3 text-[12px] text-txt-low">No orange/red alerts in the window yet.</li>}
        {items.map((e) => (
          <li key={e.id} className="flex items-start gap-2 border-b border-ink-line/60 py-2 text-[12px] last:border-0">
            <SevDot sev={e.severity} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-txt-hi">{e.headline}</p>
              <p className="font-mono text-[10.5px] text-txt-low">
                {clock(e.ts)} · {timeAgo(e.ts)} · {e.direction} {e.confidence}% · score {e.impactScore}
                {e.confirmations > 1 ? ` · ×${e.confirmations}` : ""}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
