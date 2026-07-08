import { pct } from "../../lib/format";
import type { MarketContext } from "../../lib/types";

export default function Watchlist({ ctx }: { ctx: MarketContext | null }) {
  return (
    <div className="panel">
      <div className="panel-title">Watchlist {ctx && !ctx.live && <span className="ml-auto text-sevYellow normal-case">demo quotes</span>}</div>
      <table className="w-full px-2 text-[12px]">
        <tbody>
          {(ctx?.quotes ?? []).map((q) => (
            <tr key={q.symbol} className="border-t border-ink-line/60">
              <td className="px-3.5 py-1.5 font-mono font-semibold">{q.symbol}</td>
              <td className="py-1.5 text-right font-mono text-txt-mid">{q.last.toFixed(2)}</td>
              <td className={`px-3.5 py-1.5 text-right font-mono ${q.chgPct >= 0 ? "text-bull" : "text-bear"}`}>{pct(q.chgPct)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
