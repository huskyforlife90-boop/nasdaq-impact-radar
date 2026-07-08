/**
 * NASDAQ IMPACT RADAR — BACKEND RELAY
 *
 * Purpose: some sources can't (CORS) or shouldn't (secret API keys) be called
 * from the browser. This tiny Express server is the single place where real
 * credentials live. Every endpoint returns `{ configured: false }` instead of
 * faking data when its credentials are missing — the frontend then falls back
 * to clearly-labeled demo data.
 *
 * Endpoints:
 *   GET /api/health                    → relay + per-source config status
 *   GET /api/forexfactory              → FF weekly calendar (no key needed)
 *   GET /api/unusualwhales/flow-alerts → UW official API (UW_API_KEY)
 *   GET /api/stockmktnewz              → X API v2 (X_BEARER_TOKEN) — scaffold
 *   GET /api/news                      → Finnhub general news (FINNHUB_API_KEY)
 *   GET /api/context                   → FRED 10Y/DXY + Finnhub quotes
 */
import express from "express";
import cors from "cors";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Minimal .env loader (no extra dependency): server/.env then project .env
const __dirname = path.dirname(fileURLToPath(import.meta.url));
for (const p of [path.join(__dirname, ".env"), path.join(__dirname, "..", ".env")]) {
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf8").split("\n")) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !(m[1] in process.env)) process.env[m[1]] = m[2];
    }
  }
}

const app = express();
app.use(cors()); // relay serves the SPA origin; lock this down in production

const PORT = process.env.PORT || 8787;
const UW_API_KEY = process.env.UW_API_KEY || "";
const FINNHUB_API_KEY = process.env.FINNHUB_API_KEY || "";
const X_BEARER_TOKEN = process.env.X_BEARER_TOKEN || "";
const STOCKMKTNEWZ_USER_ID = process.env.STOCKMKTNEWZ_USER_ID || "";
const FRED_API_KEY = process.env.FRED_API_KEY || "";

/** naive in-memory cache so we don't hammer upstream feeds.
 * Failures are cached too (shorter TTL) — without this, a single upstream
 * rate-limit (429) or outage gets re-hit on every poll instead of backing
 * off, which can prolong or worsen the rate limit. */
const cache = new Map();
async function cached(key, ttlMs, fn, errorTtlMs = 60_000) {
  const hit = cache.get(key);
  if (hit && Date.now() - hit.ts < hit.ttl) {
    if (hit.error) throw new Error(hit.value);
    return hit.value;
  }
  try {
    const value = await fn();
    cache.set(key, { ts: Date.now(), value, ttl: ttlMs, error: false });
    return value;
  } catch (err) {
    cache.set(key, { ts: Date.now(), value: String(err), ttl: errorTtlMs, error: true });
    throw err;
  }
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    sources: {
      forexFactory: { configured: true, note: "public weekly calendar feed, cached 10 min" },
      unusualWhales: { configured: !!UW_API_KEY },
      stockMktNewz: { configured: !!(X_BEARER_TOKEN && STOCKMKTNEWZ_USER_ID) },
      newsWire: { configured: !!FINNHUB_API_KEY },
      marketContext: { configured: !!(FRED_API_KEY || FINNHUB_API_KEY) }
    }
  });
});

/**
 * FOREX FACTORY — weekly calendar JSON feed published for calendar apps.
 * No key required; cached 10 minutes; the browser can't fetch it directly
 * because of CORS, which is exactly why this relay exists.
 */
app.get("/api/forexfactory", async (_req, res) => {
  try {
    const rows = await cached(
      "ff",
      10 * 60_000,
      async () => {
        const r = await fetch("https://nfs.faireconomy.media/ff_calendar_thisweek.json", {
          headers: { "User-Agent": "nasdaq-impact-radar/0.1 (personal dashboard)" }
        });
        if (!r.ok) throw new Error(`FF feed HTTP ${r.status}`);
        return r.json();
      },
      5 * 60_000 // back off 5 min on failure (e.g. rate limit) instead of retrying every poll
    );
    res.json(rows);
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

/**
 * UNUSUAL WHALES — OFFICIAL API ONLY (https://unusualwhales.com/api).
 * Requires a paid API token in UW_API_KEY. If their endpoint shape changes,
 * update the path below — docs: https://api.unusualwhales.com/docs
 */
app.get("/api/unusualwhales/flow-alerts", async (_req, res) => {
  if (!UW_API_KEY) return res.json({ configured: false, alerts: [] });
  try {
    const data = await cached("uw", 30_000, async () => {
      const r = await fetch("https://api.unusualwhales.com/api/option-trades/flow-alerts?limit=50", {
        headers: { Authorization: `Bearer ${UW_API_KEY}`, Accept: "application/json" }
      });
      if (!r.ok) throw new Error(`UW HTTP ${r.status}`);
      return r.json();
    });
    res.json({ configured: true, alerts: data.data ?? data.alerts ?? [] });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

/**
 * STOCKMKTNEWZ — X API v2 scaffold. Only runs with PAID X API credentials.
 * We deliberately do NOT scrape X or use unofficial mirrors.
 */
app.get("/api/stockmktnewz", async (_req, res) => {
  if (!X_BEARER_TOKEN || !STOCKMKTNEWZ_USER_ID) {
    return res.json({
      configured: false,
      tweets: [],
      note: "Set X_BEARER_TOKEN + STOCKMKTNEWZ_USER_ID (paid X API v2) to enable."
    });
  }
  try {
    const data = await cached("smn", 60_000, async () => {
      const url = `https://api.twitter.com/2/users/${STOCKMKTNEWZ_USER_ID}/tweets?max_results=25&tweet.fields=created_at`;
      const r = await fetch(url, { headers: { Authorization: `Bearer ${X_BEARER_TOKEN}` } });
      if (!r.ok) throw new Error(`X API HTTP ${r.status}`);
      return r.json();
    });
    res.json({ configured: true, tweets: data.data ?? [] });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

/** NEWS WIRE — Finnhub general market news (free tier). */
app.get("/api/news", async (_req, res) => {
  if (!FINNHUB_API_KEY) return res.json({ configured: false, items: [] });
  try {
    const items = await cached("news", 60_000, async () => {
      const r = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${FINNHUB_API_KEY}`);
      if (!r.ok) throw new Error(`Finnhub HTTP ${r.status}`);
      return r.json();
    });
    res.json({ configured: true, items: (items || []).slice(0, 40) });
  } catch (err) {
    res.status(502).json({ error: String(err) });
  }
});

/**
 * MARKET CONTEXT — best-effort composite:
 * - US10Y from FRED (DGS10) and broad dollar (DTWEXBGS) if FRED_API_KEY set
 * - Watchlist ETF/stock quotes from Finnhub if FINNHUB_API_KEY set
 * - VIX / NQ / ES futures need licensed market data → intentionally omitted
 *   here; the frontend backfills them with labeled demo values.
 */
const WATCHLIST = ["QQQ", "AAPL", "MSFT", "NVDA", "AMD", "META", "AMZN", "TSLA"];
app.get("/api/context", async (_req, res) => {
  const configured = !!(FRED_API_KEY || FINNHUB_API_KEY);
  if (!configured) return res.json({ configured: false });
  const out = { configured: true, quotes: [] };
  try {
    if (FRED_API_KEY) {
      const fred = async (series) => {
        const r = await fetch(
          `https://api.stlouisfed.org/fred/series/observations?series_id=${series}&api_key=${FRED_API_KEY}&file_type=json&sort_order=desc&limit=2`
        );
        if (!r.ok) throw new Error(`FRED ${series} HTTP ${r.status}`);
        const j = await r.json();
        const obs = (j.observations || []).filter((o) => o.value !== ".");
        return obs.map((o) => parseFloat(o.value));
      };
      const [dgs10, dxy] = await cached("fred", 15 * 60_000, async () =>
        Promise.all([fred("DGS10"), fred("DTWEXBGS")])
      );
      if (dgs10?.length) {
        out.us10y = dgs10[0];
        if (dgs10.length > 1) out.us10yChgBps = Math.round((dgs10[0] - dgs10[1]) * 100 * 10) / 10;
      }
      if (dxy?.length) {
        out.dxy = dxy[0];
        if (dxy.length > 1) out.dxyChg = Math.round((dxy[0] - dxy[1]) * 100) / 100;
      }
    }
    if (FINNHUB_API_KEY) {
      out.quotes = await cached("quotes", 30_000, async () => {
        const qs = await Promise.all(
          WATCHLIST.map(async (s) => {
            const r = await fetch(`https://finnhub.io/api/v1/quote?symbol=${s}&token=${FINNHUB_API_KEY}`);
            if (!r.ok) return null;
            const j = await r.json();
            return j && j.c ? { symbol: s, last: j.c, chgPct: j.dp ?? 0, live: true } : null;
          })
        );
        return qs.filter(Boolean);
      });
    }
    res.json(out);
  } catch (err) {
    res.status(502).json({ error: String(err), partial: out });
  }
});

app.listen(PORT, () => {
  console.log(`[relay] listening on http://localhost:${PORT}`);
  console.log(`[relay] configured: UW=${!!UW_API_KEY} Finnhub=${!!FINNHUB_API_KEY} X=${!!X_BEARER_TOKEN} FRED=${!!FRED_API_KEY}`);
});
