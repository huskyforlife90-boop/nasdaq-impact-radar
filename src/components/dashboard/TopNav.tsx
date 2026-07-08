import { APP } from "../../lib/config";
import { timeAgo } from "../../lib/format";
import type { Regime } from "../../lib/rollingSummary";
import type { VoiceSettings } from "../../lib/types";
import { announcer } from "../../lib/announcementEngine";

export default function TopNav({
  regime, meter, lastRefresh, loading, voice, setVoice, onRefresh
}: {
  regime: Regime;
  meter: number;
  lastRefresh: number | null;
  loading: boolean;
  voice: VoiceSettings;
  setVoice: (v: VoiceSettings) => void;
  onRefresh: () => void;
}) {
  const biasColor = regime.bias === "bullish" ? "text-bull" : regime.bias === "bearish" ? "text-bear" : "text-sevYellow";
  return (
    <header className="sticky top-0 z-30 border-b border-ink-line bg-ink-950/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1600px] items-center gap-3 px-4 py-2.5">
        <span className="relative flex h-5 w-5 items-center justify-center" aria-hidden>
          <span className="absolute h-5 w-5 rounded-full border border-accent/40" />
          <span className="absolute h-3 w-3 rounded-full border border-accent/60" />
          <span className="live-dot h-1.5 w-1.5 rounded-full bg-accent" />
        </span>
        <h1 className="text-[15px] font-semibold tracking-tight">
          Nasdaq Impact Radar
          <span className="ml-2 font-mono text-[10px] font-normal uppercase tracking-[0.2em] text-txt-low">QQQ · NQ · NDX</span>
        </h1>

        {APP.demoMode && (
          <span className="rounded border border-sevYellow/50 bg-sevYellow/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sevYellow">
            Demo mode — mock data
          </span>
        )}

        <div className="ml-auto flex items-center gap-2.5 text-[12px]">
          <span className="hidden items-center gap-1.5 sm:flex">
            <span className="text-txt-low">Regime</span>
            <span className={`font-semibold uppercase ${biasColor}`}>{regime.bias}</span>
            <span className="text-txt-low">·</span>
            <span className="text-txt-mid">{regime.risk}</span>
            <span className={`font-mono ${meter >= 0 ? "text-bull" : "text-bear"}`}>{meter >= 0 ? `+${meter}` : meter}</span>
          </span>
          <span className="hidden font-mono text-[11px] text-txt-low md:inline">
            {loading ? "refreshing…" : lastRefresh ? `updated ${timeAgo(lastRefresh)}` : "loading…"}
          </span>
          <button onClick={onRefresh} className="chip" title="Manual refresh">↻</button>
          <button
            onClick={() => {
              const muted = !voice.muted;
              setVoice({ ...voice, muted });
              if (muted) announcer.stop();
            }}
            className={`chip ${voice.muted ? "" : "chip-on"}`}
            aria-pressed={voice.muted}
            title={voice.muted ? "Unmute voice alerts" : "Mute voice alerts"}
          >
            {voice.muted ? "🔇 Muted" : "🔊 Voice on"}
          </button>
        </div>
      </div>
    </header>
  );
}
