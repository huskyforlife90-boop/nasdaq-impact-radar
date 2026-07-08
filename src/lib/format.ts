export function timeAgo(ts: number, now = Date.now()): string {
  const s = Math.round((now - ts) / 1000);
  if (s < 0) return `in ${fmtDur(-s)}`;
  if (s < 60) return `${s}s ago`;
  return `${fmtDur(s)} ago`;
}
function fmtDur(s: number): string {
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}
export function clock(ts: number): string {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
export function pct(n: number, digits = 2): string {
  return `${n >= 0 ? "+" : ""}${n.toFixed(digits)}%`;
}
