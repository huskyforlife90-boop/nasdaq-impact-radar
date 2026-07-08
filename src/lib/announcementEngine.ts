import type { ScoredEvent, Severity, VoiceSettings } from "./types";

export const DEFAULT_VOICE_SETTINGS: VoiceSettings = {
  enabled: true,
  muted: false,
  minSeverity: "orange",
  macroRedOnly: false,
  chime: true,
  voiceURI: null,
  rate: 1.05,
  volume: 0.9,
  quietHoursEnabled: false,
  quietStart: "22:00",
  quietEnd: "07:00"
};

const SEV_RANK: Record<Severity, number> = { yellow: 0, orange: 1, red: 2 };

function inQuietHours(s: VoiceSettings, now = new Date()): boolean {
  if (!s.quietHoursEnabled) return false;
  const [sh, sm] = s.quietStart.split(":").map(Number);
  const [eh, em] = s.quietEnd.split(":").map(Number);
  const mins = now.getHours() * 60 + now.getMinutes();
  const start = sh * 60 + sm, end = eh * 60 + em;
  return start <= end ? mins >= start && mins < end : mins >= start || mins < end;
}

export function shouldAnnounce(e: ScoredEvent, s: VoiceSettings): boolean {
  if (!s.enabled || s.muted) return false;
  if (inQuietHours(s)) return false;
  if (SEV_RANK[e.severity] < SEV_RANK[s.minSeverity]) return false;
  if (s.macroRedOnly) {
    return e.severity === "red" && ["Macro", "Fed", "Rates"].includes(e.category);
  }
  return true;
}

export function announcementText(e: ScoredEvent): string {
  const sev = e.severity === "red" ? "High impact alert" : e.severity === "orange" ? "Important alert" : "Watch item";
  const dir =
    e.direction === "bullish" ? "Bias: bullish for Nasdaq."
    : e.direction === "bearish" ? "Bias: bearish for Nasdaq."
    : e.direction === "mixed" ? "Bias: mixed." : "Bias: neutral.";
  return `${sev}. ${e.category}. ${e.headline}. ${dir} Confidence ${e.confidence} percent.`;
}

/** Web-Audio chime played before speech (no asset files needed). */
function chime(volume: number) {
  try {
    const Ctx = window.AudioContext || (window as any).webkitAudioContext;
    const ctx = new Ctx();
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(880, ctx.currentTime);
    osc.frequency.setValueAtTime(1318, ctx.currentTime + 0.12);
    osc.connect(gain);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.001, 0.35 * volume), ctx.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.55);
    osc.onended = () => ctx.close();
  } catch {
    /* audio not available */
  }
}

/**
 * Queued speech so overlapping alerts read out one at a time.
 * Uses the browser SpeechSynthesis API — no server or API key involved.
 */
class Announcer {
  private queue: string[] = [];
  private speaking = false;
  private announced = new Set<string>();

  voices(): SpeechSynthesisVoice[] {
    return typeof speechSynthesis !== "undefined" ? speechSynthesis.getVoices() : [];
  }

  announce(e: ScoredEvent, s: VoiceSettings) {
    if (this.announced.has(e.id)) return;
    if (!shouldAnnounce(e, s)) return;
    this.announced.add(e.id);
    if (s.chime) chime(s.volume);
    this.queue.push(announcementText(e));
    this.drain(s);
  }

  test(s: VoiceSettings) {
    if (s.chime) chime(s.volume);
    this.queue.push("Voice check. High impact alert. Macro. C P I comes in above forecast. Bias: bearish for Nasdaq.");
    this.drain(s);
  }

  stop() {
    this.queue = [];
    if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
    this.speaking = false;
  }

  private drain(s: VoiceSettings) {
    if (this.speaking || typeof speechSynthesis === "undefined") return;
    const next = this.queue.shift();
    if (!next) return;
    this.speaking = true;
    const u = new SpeechSynthesisUtterance(next);
    u.rate = s.rate;
    u.volume = s.volume;
    const v = this.voices().find((v) => v.voiceURI === s.voiceURI);
    if (v) u.voice = v;
    u.onend = u.onerror = () => {
      this.speaking = false;
      this.drain(s);
    };
    speechSynthesis.speak(u);
  }
}

export const announcer = new Announcer();
