/**
 * SIGNATURE ELEMENT — the Impact Radar gauge.
 * A semicircular bear→bull dial with radar sweep rings; the needle is the
 * rolling event-weighted Nasdaq sentiment (-100..+100) tilted by yields,
 * VIX and DXY context.
 */
export default function BiasMeter({ meter }: { meter: number }) {
  const angle = (-90 + (meter + 100) * 0.9) * (Math.PI / 180); // -90°..+90°
  const cx = 130, cy = 120, r = 92;
  const nx = cx + Math.sin(angle) * r * 0.86;
  const ny = cy - Math.cos(angle) * r * 0.86;
  const arc = (start: number, end: number, color: string, w = 10) => {
    const a1 = (start * Math.PI) / 180, a2 = (end * Math.PI) / 180;
    const x1 = cx + Math.sin(a1) * r, y1 = cy - Math.cos(a1) * r;
    const x2 = cx + Math.sin(a2) * r, y2 = cy - Math.cos(a2) * r;
    return <path d={`M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`} stroke={color} strokeWidth={w} fill="none" strokeLinecap="round" />;
  };
  const label = meter >= 15 ? "BULLISH" : meter <= -15 ? "BEARISH" : Math.abs(meter) > 5 ? "MIXED" : "NEUTRAL";
  const color = meter >= 15 ? "#2FD387" : meter <= -15 ? "#F2555A" : "#E8C547";
  return (
    <div className="panel">
      <div className="panel-title">Nasdaq bullish / bearish meter</div>
      <svg viewBox="0 0 260 150" className="w-full px-2 pb-2" role="img" aria-label={`Nasdaq sentiment ${meter} of 100, ${label}`}>
        {[0.55, 0.72, 0.88].map((k) => (
          <path key={k} d={`M ${cx - r * k} ${cy} A ${r * k} ${r * k} 0 0 1 ${cx + r * k} ${cy}`}
            stroke="#1E2536" strokeWidth="1" fill="none" />
        ))}
        {arc(-90, -30, "#F2555A")}
        {arc(-30, 30, "#E8C547")}
        {arc(30, 90, "#2FD387")}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="3" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="5" fill={color} />
        <text x={cx} y={cy - 34} textAnchor="middle" fill="#E8ECF4" fontSize="24" fontFamily="IBM Plex Mono, monospace" fontWeight="600">
          {meter > 0 ? `+${meter}` : meter}
        </text>
        <text x={cx} y={cy - 16} textAnchor="middle" fill={color} fontSize="11" letterSpacing="2">{label}</text>
        <text x={cx - r} y={cy + 16} textAnchor="middle" fill="#5C6785" fontSize="9">BEAR -100</text>
        <text x={cx + r} y={cy + 16} textAnchor="middle" fill="#5C6785" fontSize="9">BULL +100</text>
      </svg>
    </div>
  );
}
