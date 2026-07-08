import { clock } from "../../lib/format";
import type { ScoredEvent } from "../../lib/types";

/** Scrolling breaking-news tape (pauses on hover; static if reduced motion). */
export default function NewsTape({ events }: { events: ScoredEvent[] }) {
  const items = events.filter((e) => e.ts <= Date.now()).slice(0, 14);
  if (items.length === 0) return null;
  const row = (key: string) => (
    <div key={key} className="flex shrink-0 items-center">
      {items.map((e) => (
        <span key={key + e.id} className="mx-5 inline-flex items-center gap-2 text-[12px]">
          <span className={`h-1.5 w-1.5 rounded-full bg-sev-${e.severity}`} />
          <span className="font-mono text-txt-low">{clock(e.ts)}</span>
          <span className="text-txt-hi">{e.headline}</span>
          <span className={e.direction === "bullish" ? "text-bull" : e.direction === "bearish" ? "text-bear" : "text-txt-low"}>
            {e.direction === "bullish" ? "▲" : e.direction === "bearish" ? "▼" : "◆"}
          </span>
        </span>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden border-b border-ink-line bg-ink-900/80" aria-label="Breaking news tape">
      <div className="tape-track flex w-max py-1.5">{row("a")}{row("b")}</div>
    </div>
  );
}
