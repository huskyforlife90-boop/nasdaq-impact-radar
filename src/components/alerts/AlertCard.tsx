import { useState } from "react";
import { clock, timeAgo } from "../../lib/format";
import type { ScoredEvent } from "../../lib/types";

const DIR_STYLE: Record<string, string> = {
  bullish: "text-bull border-bull/40 bg-bull/10",
  bearish: "text-bear border-bear/40 bg-bear/10",
  mixed: "text-sevYellow border-sevYellow/40 bg-sevYellow/10",
  neutral: "text-txt-mid border-ink-line bg-ink-800"
};

export function SevDot({ sev }: { sev: ScoredEvent["severity"] }) {
  return <span className={`inline-block h-2 w-2 rounded-full bg-sev-${sev}`} aria-label={`${sev} severity`} />;
}

export default function AlertCard({ e, compact = false }: { e: ScoredEvent; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <article className={`panel px-3.5 py-3 border-l-2 ${e.severity === "red" ? "border-l-sevRed" : e.severity === "orange" ? "border-l-sevOrange" : "border-l-sevYellow"}`}>
      <div className="flex items-center gap-2 text-[11px] text-txt-low font-mono">
        <SevDot sev={e.severity} />
        <span className="text-txt-mid">{clock(e.ts)}</span>
        <span>· {timeAgo(e.ts)}</span>
        <span className="truncate">· {e.source}</span>
        {!e.live && <span className="rounded bg-ink-700 px-1.5 py-px text-[10px] tracking-wide text-sevYellow">DEMO</span>}
        {e.confirmations > 1 && (
          <span className="rounded bg-accent/10 px-1.5 py-px text-[10px] text-accent">×{e.confirmations} confirmed</span>
        )}
        <span className="ml-auto font-semibold text-txt-hi">{e.impactScore}</span>
      </div>

      <h3 className="mt-1.5 text-[13.5px] leading-snug font-medium">{e.headline}</h3>

      <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px]">
        <span className="chip cursor-default">{e.category}</span>
        <span className={`inline-flex items-center rounded border px-2 py-0.5 font-semibold uppercase tracking-wide ${DIR_STYLE[e.direction]}`}>
          {e.direction} · {e.confidence}%
        </span>
        {e.markets.slice(0, 4).map((m) => (
          <span key={m} className="chip cursor-default font-mono">{m}</span>
        ))}
        <span className="chip cursor-default">{e.scheduled ? "scheduled" : "unscheduled"}</span>
        {e.surprisePct != null && (
          <span className="chip cursor-default font-mono">surprise {(e.surprisePct * 100).toFixed(0)}%</span>
        )}
      </div>

      {!compact && (
        <>
          <p className="mt-2 text-[12px] leading-relaxed text-txt-mid">
            <span className="text-txt-hi">{e.rationale}</span> {e.nasdaqNote}
          </p>
          {e.mergedHeadlines && (
            <button onClick={() => setOpen((v) => !v)} className="mt-1.5 text-[11px] text-accent hover:underline">
              {open ? "Hide" : "Show"} {e.mergedHeadlines.length} merged headlines
            </button>
          )}
          {open && e.mergedHeadlines && (
            <ul className="mt-1 space-y-0.5 border-l border-ink-line pl-3 text-[11px] text-txt-low">
              {e.mergedHeadlines.map((h, i) => (
                <li key={i}>{h}</li>
              ))}
            </ul>
          )}
        </>
      )}
    </article>
  );
}
