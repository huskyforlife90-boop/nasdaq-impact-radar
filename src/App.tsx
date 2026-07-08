import { useMemo } from "react";
import AlertFeed from "./components/alerts/AlertFeed";
import HistoryPanel from "./components/alerts/HistoryPanel";
import EconCalendar from "./components/calendar/EconCalendar";
import BiasMeter from "./components/dashboard/BiasMeter";
import ContextWidgets from "./components/dashboard/ContextWidgets";
import NewsTape from "./components/dashboard/NewsTape";
import RegimeCard from "./components/dashboard/RegimeCard";
import SourceStatus from "./components/dashboard/SourceStatus";
import TopNav from "./components/dashboard/TopNav";
import Watchlist from "./components/dashboard/Watchlist";
import FilterBar from "./components/filters/FilterBar";
import RollingSummaryCard from "./components/summary/RollingSummaryCard";
import VoiceSettingsPanel from "./components/settings/VoiceSettingsPanel";
import { applyFilters, EMPTY_FILTERS, useEngine } from "./hooks/useEngine";
import { usePersistentState } from "./hooks/useSettings";
import { DEFAULT_VOICE_SETTINGS } from "./lib/announcementEngine";
import { APP } from "./lib/config";
import type { FeedFilters, VoiceSettings } from "./lib/types";

export default function App() {
  const [voice, setVoice] = usePersistentState<VoiceSettings>("nir.voice", DEFAULT_VOICE_SETTINGS);
  const [filters, setFilters] = usePersistentState<FeedFilters>("nir.filters", EMPTY_FILTERS);
  const [storedPoll, setPollSeconds] = usePersistentState<number>("nir.poll", APP.pollSecondsDefault);
  const pollSeconds = Math.max(30, storedPoll); // 15s was too aggressive for the free-tier relay; clamp older saved values

  const engine = useEngine(voice, pollSeconds);
  const filtered = useMemo(() => applyFilters(engine.events, filters), [engine.events, filters]);

  const topAlerts = useMemo(
    () =>
      engine.events
        .filter((e) => e.ts <= Date.now() && e.severity === "red")
        .sort((a, b) => b.impactScore - a.impactScore)
        .slice(0, 3),
    [engine.events]
  );

  return (
    <div className="min-h-full">
      <TopNav
        regime={engine.regime}
        meter={engine.meter}
        lastRefresh={engine.lastRefresh}
        loading={engine.loading}
        voice={voice}
        setVoice={setVoice}
        onRefresh={engine.refresh}
      />
      <NewsTape events={engine.events} />

      <main className="mx-auto grid max-w-[1600px] grid-cols-1 gap-3 px-4 py-3 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1.1fr)_minmax(0,0.9fr)]">
        {/* Left column: filters + live feed */}
        <div className="space-y-3">
          <FilterBar
            filters={filters}
            setFilters={setFilters}
            pollSeconds={pollSeconds}
            setPollSeconds={setPollSeconds}
            onRefresh={engine.refresh}
            loading={engine.loading}
          />
          <AlertFeed events={filtered} />
        </div>

        {/* Middle column: top alerts, calendar, summary, history */}
        <div className="space-y-3">
          {topAlerts.length > 0 && (
            <div className="panel px-3.5 pb-3">
              <div className="panel-title px-0 sev-red">Top live alerts</div>
              <ul className="space-y-1.5 text-[12.5px]">
                {topAlerts.map((e) => (
                  <li key={e.id} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-sev-red" />
                    <span>
                      <span className="text-txt-hi">{e.headline}</span>
                      <span className={`ml-1.5 font-mono text-[11px] ${e.direction === "bullish" ? "text-bull" : e.direction === "bearish" ? "text-bear" : "text-txt-low"}`}>
                        {e.direction} {e.confidence}% · {e.impactScore}
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <EconCalendar events={engine.events} />
          <RollingSummaryCard summary={engine.summary} />
          <HistoryPanel events={engine.events} />
        </div>

        {/* Right column: meter, regime, watchlist, context, voice, sources */}
        <div className="space-y-3">
          <BiasMeter meter={engine.meter} />
          <RegimeCard regime={engine.regime} ctx={engine.context} />
          <Watchlist ctx={engine.context} />
          <ContextWidgets ctx={engine.context} note={engine.contextNote} />
          <VoiceSettingsPanel s={voice} set={setVoice} />
          <SourceStatus statuses={engine.statuses} />
        </div>
      </main>

      <footer className="mx-auto max-w-[1600px] px-4 pb-4 text-[10.5px] leading-relaxed text-txt-low">
        Informational tool, not investment advice. Bias labels are rules-based heuristics — verify against your own
        process before trading. Demo items are always marked; see the Data sources panel for what is live.
      </footer>
    </div>
  );
}
