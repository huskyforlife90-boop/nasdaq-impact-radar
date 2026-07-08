import { useEffect, useState } from "react";
import { announcer } from "../../lib/announcementEngine";
import type { Severity, VoiceSettings } from "../../lib/types";

export default function VoiceSettingsPanel({ s, set }: { s: VoiceSettings; set: (v: VoiceSettings) => void }) {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  useEffect(() => {
    const load = () => setVoices(announcer.voices());
    load();
    if (typeof speechSynthesis !== "undefined") speechSynthesis.onvoiceschanged = load;
  }, []);
  const Row = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label className="flex items-center justify-between gap-3 py-1.5 text-[12px] text-txt-mid">
      <span>{label}</span>{children}
    </label>
  );
  return (
    <div className="panel px-3.5 pb-3">
      <div className="panel-title px-0">Voice alerts</div>
      <Row label="Announce alerts aloud">
        <input type="checkbox" checked={s.enabled} onChange={(e) => set({ ...s, enabled: e.target.checked })} />
      </Row>
      <Row label="Chime before speech">
        <input type="checkbox" checked={s.chime} onChange={(e) => set({ ...s, chime: e.target.checked })} />
      </Row>
      <Row label="Minimum severity to announce">
        <select value={s.minSeverity} onChange={(e) => set({ ...s, minSeverity: e.target.value as Severity })}
          className="rounded border border-ink-line bg-ink-800 px-1.5 py-0.5 text-txt-hi">
          <option value="yellow">yellow +</option>
          <option value="orange">orange + (default)</option>
          <option value="red">red only</option>
        </select>
      </Row>
      <Row label="Only red Macro / Fed / Rates">
        <input type="checkbox" checked={s.macroRedOnly} onChange={(e) => set({ ...s, macroRedOnly: e.target.checked })} />
      </Row>
      <Row label="Voice">
        <select value={s.voiceURI ?? ""} onChange={(e) => set({ ...s, voiceURI: e.target.value || null })}
          className="max-w-[55%] rounded border border-ink-line bg-ink-800 px-1.5 py-0.5 text-txt-hi">
          <option value="">System default</option>
          {voices.map((v) => <option key={v.voiceURI} value={v.voiceURI}>{v.name}</option>)}
        </select>
      </Row>
      <Row label={`Speed ${s.rate.toFixed(2)}×`}>
        <input type="range" min={0.5} max={2} step={0.05} value={s.rate} onChange={(e) => set({ ...s, rate: Number(e.target.value) })} />
      </Row>
      <Row label={`Volume ${(s.volume * 100).toFixed(0)}%`}>
        <input type="range" min={0} max={1} step={0.05} value={s.volume} onChange={(e) => set({ ...s, volume: Number(e.target.value) })} />
      </Row>
      <Row label="Quiet hours">
        <span className="flex items-center gap-1.5">
          <input type="checkbox" checked={s.quietHoursEnabled} onChange={(e) => set({ ...s, quietHoursEnabled: e.target.checked })} />
          <input type="time" value={s.quietStart} onChange={(e) => set({ ...s, quietStart: e.target.value })}
            className="rounded border border-ink-line bg-ink-800 px-1 py-0.5 text-[11px] text-txt-hi" />
          <span>–</span>
          <input type="time" value={s.quietEnd} onChange={(e) => set({ ...s, quietEnd: e.target.value })}
            className="rounded border border-ink-line bg-ink-800 px-1 py-0.5 text-[11px] text-txt-hi" />
        </span>
      </Row>
      <button onClick={() => announcer.test(s)} className="chip chip-on mt-1.5">Play test announcement</button>
    </div>
  );
}
