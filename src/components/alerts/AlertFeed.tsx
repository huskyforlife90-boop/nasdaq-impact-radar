import type { ScoredEvent } from "../../lib/types";
import AlertCard from "./AlertCard";

export default function AlertFeed({ events }: { events: ScoredEvent[] }) {
  const past = events.filter((e) => e.ts <= Date.now());
  return (
    <section className="space-y-2" aria-label="Live catalyst feed">
      <div className="panel-title px-0">
        <span className="live-dot inline-block h-1.5 w-1.5 rounded-full bg-bull" />
        Live catalyst feed
        <span className="ml-auto font-mono normal-case tracking-normal text-txt-low">{past.length} events</span>
      </div>
      {past.length === 0 && (
        <div className="panel px-4 py-6 text-center text-sm text-txt-mid">
          No events match the current filters. Clear a filter or wait for the next refresh.
        </div>
      )}
      {past.map((e) => (
        <AlertCard key={e.id} e={e} />
      ))}
    </section>
  );
}
