# Road to the Final

A fan-made tracker for the 2026 FIFA World Cup. Pick any of the 48 teams and follow their path through the tournament — live probabilities, group standings, match results, possible opponents, and a full fixture schedule.

**Live at:** [stephenburks.github.io/road-to-the-final](https://stephenburks.github.io/road-to-the-final/)

---

## Features

- **48 teams** organized by confederation with search and keyboard navigation
- **Live probabilities** from Polymarket prediction markets (fallback to calculated when unavailable)
- **Group stage tracker** with standings tables, match results, and win probability bars
- **Road to the Final bracket** showing every stage from group play through the final
- **Opponent watchlist** with difficulty ratings (R32) and matchup probability bars (R16)
- **Historical snapshots** — view probabilities as they were on any prior day
- **Shareable URLs** — `?team=argentina&date=2026-06-14&stage=r16` encodes your view
- **Hourly data updates** via GitHub Actions + football-data.org API
- **Dark theme** with Space Grotesk, Inter, and JetBrains Mono
- **Fully accessible** — keyboard-navigable tabs, ARIA roles, focus-visible states

---

## Tech Stack

- **React 18** — functional components, hooks, CSS Modules
- **Vite 8** — dev server and production build
- **No component library** — hand-written CSS with custom properties
- **Node.js data pipeline** — `scripts/update-data.js` runs hourly via GitHub Actions

---

## Project Structure

```
road-to-the-final/
├── index.html
├── vite.config.js
├── package.json
│
├── public/data/
│   ├── world-cup-2026.json          # Live data (48 teams, groups, paths)
│   └── snapshots/
│       ├── manifest.json             # Available snapshot dates
│       └── 2026-06-14.json          # Historical snapshot
│
├── scripts/
│   └── update-data.js               # Hourly data refresh (Node 18+, no deps)
│
├── .github/workflows/
│   ├── deploy.yml                   # Build + deploy to GitHub Pages
│   └── update-data.yml             # Hourly data update + commit
│
└── src/
    ├── main.jsx                     # Entry point (ErrorBoundary wrapper)
    ├── App.jsx                      # Root state, URL params, data orchestration
    ├── constants.js                 # Stages, labels, confederations, URLs
    ├── utils.js                     # Date formatting, URL params, localStorage
    │
    ├── hooks/
    │   ├── useData.js               # Fetches live JSON + manifest + snapshots
    │   └── useClickOutside.js       # Closes dropdowns on outside click
    │
    ├── styles/
    │   └── globals.css               # CSS custom properties, resets, animations
    │
    └── components/
        ├── Header.jsx/.module.css   # Logo + DateSelector + TeamSelector
        ├── Nav.jsx/.module.css       # Sticky section nav + Live/Historical badge
        ├── StageTabs.jsx/.module.css # Horizontal stage tabs with keyboard nav
        ├── Hero.jsx/.module.css      # City headline, 4 probability stat cards
        ├── RoadBracket.jsx/.module.css # 6-stage bracket with active highlighting
        ├── GroupStage.jsx/.module.css  # Standings tables + match result cards
        ├── OpponentWatchlist.jsx/.module.css # R32 watchlist, R16 matrix, QF+ placeholders
        ├── ScheduledMatches.jsx/.module.css  # Full fixture list across all stages
        ├── TeamSelector.jsx/.module.css # 48-team dropdown with search + keyboard nav
        ├── DateSelector.jsx/.module.css # Live vs historical snapshot picker
        ├── Disclaimer.jsx/.module.css   # Data source disclaimer
        ├── Footer.jsx/.module.css       # Attribution + data sources
        └── ui/
            ├── SectionLabel.jsx/.module.css
            ├── Loading.jsx/.module.css
            ├── EliminatedView.jsx/.module.css
            └── ErrorBoundary.jsx/.module.css
```

---

## Getting Started

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/ (production build)
```

Data is served from `public/data/` — you need a local server, not `file://`. Vite's dev server handles this automatically.

---

## Data Pipeline

The update script runs hourly via GitHub Actions:

```bash
# Run manually (requires football-data.org API key for live data)
node scripts/update-data.js
FOOTBALL_DATA_KEY=your_key node scripts/update-data.js
```

- Only fully recalculates teams that played today or yesterday
- Carries forward existing data for all other teams
- Uses ~6 API requests per match day, ~1 on quiet days
- Writes `world-cup-2026.json`, daily snapshots, and `manifest.json`

### Setup

1. Get a free API key from [football-data.org](https://www.football-data.org/)
2. Add it as a GitHub secret: **Settings → Secrets and variables → Actions → `FOOTBALL_DATA_KEY`**
3. The `update-data.yml` workflow runs every hour and commits changes automatically
4. The `deploy.yml` workflow rebuilds and deploys on every push to `main`

---

## Deployment

### GitHub Pages (default)

The base path defaults to `/road-to-the-final/`. To deploy:

1. Go to **Settings → Pages → Source** and select **GitHub Actions**
2. Push to `main` — the deploy workflow builds and publishes automatically
3. Your site will be live at `https://<username>.github.io/road-to-the-final/`

### Custom domain

To deploy at a root domain, set the `VITE_BASE` environment variable:

```bash
VITE_BASE=/ npm run build
```

Or add it as a repository secret for the deploy workflow.

### Other hosts

`npm run build` produces a static `dist/` folder — drag it to [Netlify Drop](https://app.netlify.com/drop), run `npx vercel dist/`, or serve it anywhere static hosting is available.

---

## URL Format

`?team=argentina&date=2026-06-14&stage=r16`

| Param    | Values                                              | Default   |
|----------|------------------------------------------------------|-----------|
| `team`   | Any team ID (`usa`, `argentina`, `france`, etc.)    | `usa`     |
| `date`   | `live` or `YYYY-MM-DD` (snapshot date)               | `live`    |
| `stage`  | `auto`, `group_stage`, `r32`, `r16`, `qf`, `sf`, `final` | `auto` |

Defaults are omitted from the URL to keep links clean.

---

## Data Sources

- **Match results & standings** — [football-data.org](https://www.football-data.org/) (free tier, 100 req/day)
- **Market probabilities** — [Polymarket](https://polymarket.com/) (group winner markets, no auth required)
- **Tournament bracket** — Official FIFA 2026 World Cup schedule and venue assignments

---

## License

This is a fan-made project for entertainment and discussion only. Not affiliated with FIFA. Probabilities reflect crowd-sourced expectations, not guaranteed outcomes. **Not intended for wagering or consequential decisions.**