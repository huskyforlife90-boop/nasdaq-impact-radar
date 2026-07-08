import type { Regime } from "../../lib/rollingSummary";
import type { MarketContext } from "../../lib/types";

export default function RegimeCard({ regime, ctx }: { regime: Regime; ctx: MarketContext | null }) {
  const biasColor = regime.bias === "bullish" ? "text-bull" : regime.bias === "bearish" ? "text-bear" : "text-sevYellow";
  const riskColor = regime.risk === "risk-on" ? "text-bull" : regime.risk === "risk-off" ? "text-bear" : "text-txt-mid";
  return (
    <div className="panel px-3.5 pb-3">
      <div className="panel-title px-0">Market regime</div>
      <div className="flex items-baseline gap-3">
        <span className={`text-xl font-semibold uppercase tracking-wide ${biasColor}`}>{regime.bias}</span>
        <span className={`text-sm font-semibold uppercase tracking-wide ${riskColor}`}>{regime.risk}</span>
      </div>
      <p className="mt-1.5 text-[12px] leading-relaxed text-txt-mid">
        {regime.risk === "risk-off"
          ? "Defensive tape: volatility, dollar or yields are working against high-beta tech."
          : regime.risk === "risk-on"
          ? "Constructive tape: volatility bleeding off and rates cooperating with growth."
          : "Balanced tape: no dominant cross-asset pressure on Nasdaq right now."}
        {ctx && !ctx.live && " (context is simulated demo data)"}
      </p>
    </div>
  );
}
