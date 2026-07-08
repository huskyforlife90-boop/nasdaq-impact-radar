import type { AdapterStatus } from "../../lib/types";

/** Honesty panel: which feeds are live vs mocked, and why. */
export default function SourceStatus({ statuses }: { statuses: AdapterStatus[] }) {
  return (
    <div className="panel px-3.5 pb-3">
      <div className="panel-title px-0">Data sources · live vs demo</div>
      <ul className="space-y-1.5 text-[11.5px]">
        {statuses.map((s) => (
          <li key={s.id} className="flex items-start gap-2">
            <span className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${s.live ? "bg-bull live-dot" : "bg-sevYellow"}`} />
            <span>
              <span className="font-medium text-txt-hi">{s.name}</span>{" "}
              <span className={s.live ? "text-bull" : "text-sevYellow"}>{s.live ? "LIVE" : "DEMO"}</span>
              <span className="block text-txt-low">{s.note}</span>
              {s.lastError && <span className="block font-mono text-[10px] text-bear">{s.lastError.slice(0, 120)}</span>}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
