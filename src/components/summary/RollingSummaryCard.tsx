import { timeAgo } from "../../lib/format";
import type { RollingSummary } from "../../lib/types";

export default function RollingSummaryCard({ summary }: { summary: RollingSummary | null }) {
  if (!summary) return null;
  const toneColor = summary.tone === "bullish" ? "text-bull" : summary.tone === "bearish" ? "text-bear" : "text-sevYellow";
  return (
    <div className="panel px-3.5 pb-3">
      <div className="panel-title px-0">
        Rolling summary
        <span className="ml-auto font-mono normal-case tracking-normal">{timeAgo(summary.ts)}</span>
      </div>
      <p className="text-[13px] leading-relaxed text-txt-hi">{summary.headlineSummary}</p>
      <div className="mt-2 flex items-center gap-3 text-[12px]">
        <span className={`font-semibold uppercase tracking-wide ${toneColor}`}>{summary.tone}</span>
        <span className="text-txt-low">Risk score</span>
        <div className="h-1.5 flex-1 rounded bg-ink-700">
          <div className="h-1.5 rounded" style={{ width: `${summary.riskScore}%`, background: summary.riskScore > 66 ? "#EF4351" : summary.riskScore > 40 ? "#F08C3C" : "#2FD387" }} />
        </div>
        <span className="font-mono text-txt-hi">{summary.riskScore}</span>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-bull">Top bullish catalysts</p>
          <ul className="mt-1 space-y-1 text-[11.5px] text-txt-mid">
            {summary.topBullish.length === 0 && <li className="text-txt-low">None in window.</li>}
            {summary.topBullish.map((e) => <li key={e.id} className="truncate">▲ {e.headline}</li>)}
          </ul>
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-[0.14em] text-bear">Top bearish catalysts</p>
          <ul className="mt-1 space-y-1 text-[11.5px] text-txt-mid">
            {summary.topBearish.length === 0 && <li className="text-txt-low">None in window.</li>}
            {summary.topBearish.map((e) => <li key={e.id} className="truncate">▼ {e.headline}</li>)}
          </ul>
        </div>
      </div>
    </div>
  );
}
