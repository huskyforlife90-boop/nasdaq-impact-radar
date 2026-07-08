# Nasdaq Impact Radar

A dark-mode trader dashboard that monitors, ranks, summarizes, and **announces aloud** live catalysts affecting Nasdaq, QQQ, and NQ futures. It runs fully in **demo mode with zero credentials**, and upgrades source-by-source to live data as you add keys to the backend relay.

Informational tool only — not investment advice. All bias labels are rules-based heuristics you can edit in one file.

---

## What is live vs. mocked (read this first)

| Source | Status out of the box | How to make it live | Honesty notes |
|---|---|---|---|
| **Forex Factory** (economic calendar) | Mocked in demo mode; **live with the relay running, no key needed** | Run `npm run relay`, set `VITE_DEMO_MODE=false` | FF has no official REST API. The relay uses FF's published weekly calendar JSON feed (`nfs.faireconomy.media/ff_calendar_thisweek.json`), cached 10 min. Browser-direct access is blocked by CORS, hence the relay. |
| **Unusual Whales** (options flow) | Mocked | Set `UW_API_KEY` in `server/.env` | Uses only the **official paid API** (`api.unusualwhales.com`). The key never ships to the browser. Endpoint used: `/api/option-trades/flow-alerts`. |
| **StockMKTNewz** (breaking news, X account) | **Scaffold + mock — not live** | Set `X_BEARER_TOKEN` + `STOCKMKTNEWZ_USER_ID` (paid X API v2) in `server/.env` | There is **no free public API for X timelines**, and scraping violates X's ToS, so this app does not fake access. The connector interface is fully built; it activates only with real credentials. |
| **News Wire** (general market news) | Mocked | Set `FINNHUB_API_KEY` (free tier at finnhub.io) in `server/.env` | Relay endpoint `/api/news` wraps Finnhub `news?category=general`. Swap in Marketaux/Polygon/Benzinga by editing one function in `server/index.js`; the frontend contract stays the same. |
| **Market context** (US10Y, DXY, watchlist quotes) | Mocked | Set `FRED_API_KEY` (free) and/or `FINNHUB_API_KEY` | 10Y (FRED `DGS10`) and broad dollar (`DTWEXBGS`) are daily series, not tick data. Watchlist quotes come from Finnhub. **VIX and NQ/ES futures require licensed market data** — they stay clearly-labeled demo values until you wire a paid provider into `/api/context`. |

Every mock event carries `live: false`, renders a **DEMO** badge, and mock sources are suffixed "(demo)". The **Data sources** panel in the right column shows live/demo status per adapter, in real time, including the last error if a live fetch failed.

---

## Quick start (demo mode, zero keys)

```bash
npm install
npm run dev          # http://localhost:5173 — fully working with mock data
```

## Going live

```bash
cp .env.example .env                 # frontend settings
# create server/.env with your keys (see the RELAY SERVER section of .env.example)

# set in .env:
#   VITE_DEMO_MODE=false

npm run dev:all      # runs the relay (:8787) + the app (:5173) together
```

Vite proxies `/api/*` to the relay in dev, so `VITE_RELAY_URL` can stay empty locally.

### Where exactly keys go

- **`server/.env`** → `UW_API_KEY`, `FINNHUB_API_KEY`, `FRED_API_KEY`, `X_BEARER_TOKEN`, `STOCKMKTNEWZ_USER_ID`. These are read only by `server/index.js`. Never put them in frontend env vars — anything prefixed `VITE_` is public.
- **`.env` (project root)** → `VITE_DEMO_MODE`, `VITE_RELAY_URL` (production relay URL), `VITE_POLL_SECONDS`.

---

## Architecture

```
src/
  adapters/            ← one file per source (adapter pattern)
    types.ts             SourceAdapter interface + relay fetch helper
    forexFactory.ts      scheduled macro calendar (live via relay)
    unusualWhales.ts     options flow (official API via relay)
    stockMktNewz.ts      X connector scaffold (credentials-gated)
    newsWire.ts          general market news (Finnhub via relay)
    marketContext.ts     VIX/DXY/US10Y/quotes composite
    mockData.ts          ALL demo data lives here, clearly labeled
    index.ts             adapter registry — add new sources here
  lib/
    config.ts            ★ THE rules file: scoring weights, severity
                           thresholds, bias rules, credibility, watchlist
    scoringEngine.ts     0–100 impact score → yellow/orange/red
    biasEngine.ts        bullish/bearish/mixed/neutral + confidence + why
    deduplication.ts     near-duplicate merge (Jaccard, 30-min window)
    announcementEngine.ts browser speech synthesis, chime, quiet hours
    rollingSummary.ts    sentiment meter, regime, rolling tone summary
  hooks/
    useEngine.ts         polling pipeline: fetch → dedupe → score → bias
                         → announce → summarize
  components/
    dashboard/ alerts/ filters/ calendar/ summary/ settings/
server/
  index.js             ← Express relay; the only place secrets live
```

**Pipeline per refresh:** all adapters fetch in parallel → events merged and near-duplicates grouped (multi-source confirmation boosts score) → each group scored 0–100 (credibility, category, tier-1 release, surprise vs forecast, session, recency decay) → bias rules vote on direction/confidence with plain-English rationale → fresh orange/red events are queued for speech → rolling summary rebuilt every 3 minutes.

## Editing the market logic

Everything intentionally lives in **`src/lib/config.ts`**:

- `SCORING.severityThresholds` — where orange (50) and red (72) start
- `CATEGORY_BASE`, `SOURCE_CREDIBILITY`, `TIER1_RELEASES` — score inputs
- `BIAS_RULES` — ordered keyword/surprise rules, each with direction, weight, confidence, rationale, and a Nasdaq-specific note (both surface in the UI and voice alerts)
- `WATCHLIST`, `NASDAQ_SYMBOLS`, dedup window/threshold, summary cadence

## Voice alerts

Browser `SpeechSynthesis` — no API needed. Defaults: announce **orange/red only**, chime on, queueing so overlapping alerts read one at a time. Settings panel covers enable/disable, red-macro-only mode, voice, rate, volume, mute, and quiet hours. Note: browsers require one user interaction (any click) before audio can play.

## Deployment

**Simplest: one small Node host (Render / Railway / Fly / a VPS).**

```bash
npm install && npm run build     # static app in dist/
npm run relay                    # serve the relay (PORT env respected)
```

Serve `dist/` from any static host (Netlify, Vercel, S3+CloudFront, nginx) and set `VITE_RELAY_URL=https://your-relay-host` **at build time**. Or serve both from one box by putting nginx in front: static `dist/` + proxy `/api` → `:8787`.

**Vercel-only option:** port each route in `server/index.js` to an `api/` serverless function (they are plain fetch-based handlers, ~1:1 translation) and keep `VITE_RELAY_URL` empty.

Production hardening checklist: restrict CORS in `server/index.js` to your app's origin, add basic rate limiting, and keep `server/.env` out of git (already covered by `.gitignore`).

## Extending into a fully live trader tool

1. **Real-time transport** — replace polling with SSE/WebSocket: have the relay poll upstream and push; `useEngine` only needs its fetch swapped for a subscription.
2. **Licensed market data** — wire Polygon/Databento/dxFeed into `/api/context` for real VIX, NQ, ES ticks; the frontend already renders whatever the relay returns and labels the rest demo.
3. **More sources** — one new file in `src/adapters/` + one line in `adapters/index.ts`. The adapter contract (`fetch(): { events, status }`) handles everything else: dedup, scoring, voice, filters.
4. **Smarter bias** — `BIAS_RULES` is deliberately data-not-code; you can also swap `biasEngine.ts` for an LLM or model-based classifier behind the same `biasFor()` signature.
5. **Persistence/replay** — log scored events to SQLite/Postgres in the relay for multi-day replay and backtesting of the scoring rules.
