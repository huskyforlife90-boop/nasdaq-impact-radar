import { pct } from "../../lib/format";
import type { MarketContext } from "../../lib/types";

function Cell({ label, value, chg, invert = false }: { label: string; value?: string; chg?: number; invert?: boolean }) {
  const good = chg != null && (invert ? chg < 0 : chg >= 0);
  return (
    <div className="rounded border border-ink-line bg-ink-850 px-2.5 py-2">
      <p className="text-[10px] uppercase tracking-[0.14em] text-txt-low">{label}</p>
      <p className="font-mono text-[15px] text-txt-hi">{value ?? "—"}</p>
      {chg != null && <p className={`font-mono text-[11px] ${good ? "text-bull" : "text-bear"}`}>{chg >= 0 ? "+" : ""}{chg.toFixed(2)}</p>}
    </div>
  );
}

export default function ContextWidgets({ ctx, note }: { ctx: MarketContext | null; note: string }) {
  return (
    <div className="panel px-3.5 pb-3">
      <div className="panel-title px-0">Context · rates, vol, dollar</div>
      <div className="grid grid-cols-2 gap-2">
        <Cell label="VIX" value={ctx?.vix?.toFixed(2)} chg={ctx?.vixChg} invert />
        <Cell label="DXY" value={ctx?.dxy?.toFixed(2)} chg={ctx?.dxyChg} invert />
        <Cell label="US10Y" value={ctx?.us10y != null ? ctx.us10y.toFixed(2) + "%" : undefined} chg={ctx?.us10yChgBps} invert />
        <Cell label="NQ / ES trend" value={ctx?.nqChgPct != null ? pct(ctx.nqChgPct) : undefined} chg={ctx?.esChgPct} />
      </div>
      <p className="mt-2 text-[10.5px] text-txt-low">{note}</p>
    </div>
  );
}
