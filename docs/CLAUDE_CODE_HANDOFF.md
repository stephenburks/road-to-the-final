# Road to the Final — Claude Code Handoff
**Project:** Fan-made 2026 FIFA World Cup tracker  
**Stack:** Vite + React 18, CSS Modules, Node.js data script  
**Author:** Stephen Burks — https://github.com/stephenburks/  
**Status:** Feature-complete, needs final polish

---

## What this project is

A static React web app that lets any fan pick one of the 48 World Cup teams and follow their path through the tournament. It shows live group standings, match results, round-by-round probabilities, possible opponents, and a full fixture schedule. It supports historical snapshots (select any past day to see how probabilities looked then) and shareable URLs that encode team + date + stage.

Data is served from flat JSON files in `public/data/`. A Node.js script (`scripts/update-data.js`) updates those files, designed to run hourly via GitHub Actions with minimal API usage — it only fully recalculates teams playing that day or the previous day; all others carry forward.

---

## Project structure

```
road-to-final-v2/
├── index.html                        # Thin shell — loads Vite entry
├── vite.config.js
├── package.json
│
├── public/
│   └── data/
│       ├── world-cup-2026.json       # Live data (209KB, 48 teams)
│       └── snapshots/
│           ├── manifest.json         # { available[], labels{}, earliest, latest }
│           ├── 2026-06-13.json       # Historical snapshot (same schema, isHistorical:true)
│           └── 2026-06-14.json
│
├── scripts/
│   └── update-data.js                # 712-line data refresh script (Node 18+, no deps)
│
├── .github/
│   └── workflows/
│       └── update-data.yml           # Hourly GitHub Actions job
│
└── src/
    ├── main.jsx                      # ReactDOM.createRoot
    ├── App.jsx                       # Root state, URL params, data orchestration (128 lines)
    ├── constants.js                  # STAGE_ORDER, STAGE_LABELS, CONFEDERATIONS, author info
    ├── utils.js                      # daysUntil, formatDate, URL read/write, localStorage
    │
    ├── hooks/
    │   ├── useData.js                # Fetches live JSON + manifest + snapshots
    │   └── useClickOutside.js        # Closes dropdowns on outside click
    │
    ├── styles/
    │   └── globals.css               # CSS custom properties, resets, focus-visible, animations
    │
    └── components/
        ├── Header.jsx/.module.css    # Logo + DateSelector + TeamSelector
        ├── Nav.jsx/.module.css       # Sticky nav + Live/Historical badge
        ├── StageTabs.jsx/.module.css # Horizontal stage tabs, keyboard nav, ⚠ conditional badges
        ├── Hero.jsx/.module.css      # Big city headline, 4 prob stat cards, conditional venue note
        ├── RoadBracket.jsx/.module.css # 6-stage bracket visual, clickable nodes
        ├── GroupStage.jsx/.module.css  # Standings tables + match result cards
        ├── OpponentWatchlist.jsx/.module.css # R32 watchlist, R16 matrix, QF+ placeholder
        ├── ScheduledMatches.jsx/.module.css  # Full fixture list all stages
        ├── TeamSelector.jsx/.module.css # 48-team dropdown grouped by confederation + search
        ├── DateSelector.jsx/.module.css # Live vs historical snapshot picker
        ├── Disclaimer.jsx/.module.css   # Data source disclaimer (Polymarket, football-data.org)
        ├── Footer.jsx/.module.css       # Attribution + data sources
        └── ui/
            ├── SectionLabel.jsx/.module.css
            ├── Loading.jsx/.module.css
            └── EliminatedView.jsx/.module.css
```

---

## Running locally

```bash
npm install
npm run dev      # → http://localhost:5173
npm run build    # → dist/ (deploy this folder)
```

Data is fetched from `/data/world-cup-2026.json` at runtime — must be served via a local server, not `file://`. The dev server handles this automatically.

To run the data update script manually:
```bash
node scripts/update-data.js
# With live API access:
FOOTBALL_DATA_KEY=your_key node scripts/update-data.js
```

---

## Data model

### `public/data/world-cup-2026.json` — top level

```json
{
  "lastUpdated": "2026-06-14T14:25:16.149Z",
  "snapshotDate": "2026-06-14",
  "isHistorical": false,
  "tournament": {
    "name": "FIFA World Cup 2026",
    "currentStage": "group_stage",
    "stages": {
      "group_stage": { "status": "active",   "label": "Group Stage", "date": "Jun 12–27" },
      "r32":         { "status": "upcoming", "label": "Round of 32", "date": "Jun 28–Jul 2" },
      "r16":         { "status": "future",   "label": "Round of 16", "date": "Jul 4–7" },
      "qf":          { "status": "future",   "label": "Quarterfinal","date": "Jul 9–11" },
      "sf":          { "status": "future",   "label": "Semifinal",   "date": "Jul 14–15" },
      "final":       { "status": "future",   "label": "The Final",   "date": "Jul 19" }
    }
  },
  "groups": { "A": { "standings": [...], "winProbabilities": { "mexico": 52 } }, ... },
  "teams": [...]
}
```

### Per-team object

```json
{
  "id": "usa",
  "name": "USA",
  "flag": "🇺🇸",
  "group": "D",
  "confederation": "CONCACAF",
  "fifaRank": 14,
  "eliminated": false,
  "currentStage": "group_stage",

  "groupResults": [
    {
      "matchday": 1,
      "opponent": "Paraguay",
      "opponentFlag": "🇵🇾",
      "result": "W",
      "score": "4-1",
      "date": "2026-06-12",
      "venue": "SoFi Stadium, Los Angeles",
      "scorers": ["Bobadilla OG 7'", "Balogun 31'", "Balogun 45+5'", "Reyna 90+8'"]
    }
  ],

  "advanceProbabilities": {
    "r32": 94, "r16": 38, "qf": 22, "sf": 11, "final": 5, "winner": 3,
    "source": "market"
  },

  "path": {
    "group_stage": {
      "status": "active",
      "city": "Los Angeles · Seattle",
      "venue": "Various venues",
      "date": "Jun 12–Jun 25",
      "detail": "3 pts after MD1"
    },
    "r32": {
      "status": "upcoming",
      "match": 81,
      "date": "2026-07-01",
      "city": "San Francisco",
      "venue": "Levi's Stadium",
      "opponentDesc": "Best 3rd from B/E/F/I/J",
      "conditional": true,
      "conditionNote": "Venue assumes USA win Group D. Runner-up path leads to a different venue and date."
    },
    "r16": { "status": "future", "match": 94, "date": "2026-07-06", "city": "Seattle", "venue": "Lumen Field", "opponentDesc": "Winner Group G (Match 82)", "conditional": true, "conditionNote": "..." },
    "qf":  { "status": "future", "match": 98, "date": "2026-07-10", "city": "Los Angeles", "venue": "SoFi Stadium", "opponentDesc": "Winner Match 94", "conditional": true, "conditionNote": "..." },
    "sf":  { ... },
    "final": { ... }
  },

  "possibleOpponents": {
    "r32": [
      {
        "group": "B",
        "likelyTeam": "Bosnia & Herz.",
        "altTeam": "Qatar",
        "flag": "🇧🇦",
        "altFlag": "🇶🇦",
        "fifaRank": 71,
        "difficulty": 1,
        "label": "Favorable",
        "color": "#22C55E",
        "note": "Qatar (#51) also possible. Both very winnable R32 draws.",
        "pct": null
      }
    ],
    "r16": [
      {
        "opponent": "Belgium",
        "flag": "🇧🇪",
        "dPct": 52,
        "gPct": 68,
        "pct": 26,
        "note": "Most likely R16 opponent. De Bruyne-era Belgium still dangerous."
      }
    ]
  }
}
```

### `public/data/snapshots/manifest.json`

```json
{
  "available": ["2026-06-13", "2026-06-14"],
  "labels": {
    "2026-06-13": "Jun 13 (Tournament start)",
    "2026-06-14": "Jun 14 (Latest)"
  },
  "earliest": "2026-06-13",
  "latest": "2026-06-14",
  "generated": "2026-06-14T14:25:16.149Z"
}
```

---

## App state (App.jsx)

```js
// Three URL-encoded pieces of state
const [selectedTeamId, setSelectedTeamId]  // 'usa', 'belgium', etc — persisted to localStorage
const [selectedDate,   setSelectedDate]    // 'live' | 'YYYY-MM-DD'
const [selectedStage,  setSelectedStage]   // 'auto' | 'group_stage' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'

// Data
const { liveData, manifest, snapData, loadingSnap, error } = useData(selectedDate)
const data = selectedDate === 'live' ? liveData : snapData

// Derived
const team        = data.teams.find(t => t.id === selectedTeamId)
const activeStage = selectedStage === 'auto' ? team.currentStage : selectedStage
const isHistorical = selectedDate !== 'live'
```

URL format: `?team=belgium&date=2026-06-14&stage=r16`
Defaults are omitted (USA, live, auto) to keep URLs clean.

---

## CSS architecture

All colours and tokens are CSS custom properties in `src/styles/globals.css`:

```css
--bg: #080814;          /* page background */
--surface: rgba(255,255,255,0.03);
--border: rgba(255,255,255,0.07);
--text: #d1d5db;
--text-hi: #f2eee6;
--text-lo: #9ca3af;
--text-dim: #6b7280;    /* bumped from #4b5563 for WCAG AA contrast */
--purple: #6366f1;
--purple-lo: rgba(99,102,241,0.12);
--purple-b: rgba(99,102,241,0.28);
--green: #22c55e;
--amber: #f59e0b;
--red: #ef4444;
--font-display: 'Space Grotesk', system-ui, sans-serif;
--font-body: 'Inter', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', ui-monospace, monospace;
--radius: 10px;
--max-width: 1100px;
```

Focus states use `focus-visible` (never `focus`) so keyboard users get a ring, mouse users don't:
```css
*:focus { outline: none; }
*:focus-visible { outline: 2px solid var(--purple); outline-offset: 3px; border-radius: 6px; }
.stage-tab:focus-visible { outline-color: var(--green); }
```

Components use CSS Modules (`.module.css` co-located with each `.jsx`). Dynamic colours (difficulty ratings, prob bar fills, team-specific tints) are set as inline `style` props — everything else is a class.

---

## Key component behaviours

### TeamSelector
- 48 teams grouped by confederation: UEFA, CONMEBOL, CONCACAF, AFC, CAF, OFC, then Eliminated
- Sorted within each group by tournament win probability (highest first)
- Search filters by team name or confederation
- Eliminated teams shown greyed at bottom with "OUT" tag, not selectable
- `role="listbox"` + `role="option"` + `aria-selected` for accessibility

### DateSelector
- Hidden when `manifest.available` is empty (no snapshots exist yet)
- "Live" option always at top with animated green dot
- Historical dates listed newest-first with human-readable labels from manifest
- Appears in amber/gold when a historical date is selected

### StageTabs
- Horizontal scroll on mobile (momentum scroll, hidden scrollbar)
- Arrow Left/Right keyboard navigation between tabs
- States: done (✓ grey), current (● green pulse), future (dim), eliminated (✕ red), selected (purple outline ring)
- Conditional future stages show ⚠ with tooltip from `path.conditionNote`

### Hero
- Big heading is the city for the active stage (`path[activeStage].city`)
- For group_stage: shows team's own game cities only (NOT all cities in the group)
- When `path[activeStage].conditional === true`: shows amber warning note with `conditionNote`
- 4 probability stat cards: R32%, R16%, QF%, Final%

### RoadBracket
- 6 columns, connector line behind nodes that fills green up to current stage
- Clicking any node fires `onStageSelect` (switches the active stage in StageTabs + Hero)
- Conditional future stages show "⚠ Conditional" below the detail text, with tooltip

### OpponentWatchlist
- **group_stage**: not rendered
- **r32**: grid of opponent cards with difficulty pips, team name, alt team, notes
- **r16**: probability bar matrix + top-4 callout cards (when `pct` data exists)
- **qf/sf/final**: dashed placeholder card "opponents update live as bracket fills in"
- Banner at top shows match number, date, venue — amber if no conditional, purple if conditional
- Conditional banner shows full `conditionNote` text

### ScheduledMatches
- Full fixture list grouped by stage: Group Stage (from `groupResults`), then R32–Final (from `path`)
- Played games: result icon (✓/½/✗), date, opponent, score
- Future games: ❓ with opponent description and venue
- Conditional future matches shown at 75% opacity
- Footer note: "❓ Future matches are conditional on advancing from each stage."

### GroupStage
- Only rendered when `activeStage === 'group_stage'`
- Shows team's own group standings table + a second table for the likely R16 feeder group
- Match result cards for all 3 group games (past: coloured W/D/L; future: venue info)

---

## Data coverage as of June 14, 2026

**Teams with Polymarket-sourced probabilities (21):**
Mexico, Canada, Brazil, Morocco, Scotland, USA, Paraguay, Australia, Türkiye, Germany, Netherlands, Japan, Belgium, Spain, France, Norway, Argentina, Portugal, Colombia, England, Croatia

**Teams with rich R32 opponent data (13):**
Mexico, Canada, Brazil, USA, Australia, Germany, Netherlands, Belgium, Spain, France, Argentina, Portugal, England

**Teams with R16 matchup probabilities (13):**
Same as above

**Teams with real match results (12):**
Mexico, South Africa, Canada, Bosnia & Herz., Brazil, Morocco, Haiti, Scotland, USA, Paraguay, Australia, Türkiye

**Remaining 35 teams:** Have structural path/bracket data and calculated (not market) probabilities, but no rich opponent notes or R16 matchup data yet. These populate as the tournament progresses and the update script runs.

---

## Update script logic (`scripts/update-data.js`)

Runs hourly via GitHub Actions. Key logic:

1. **Fetch today + yesterday matches** → build `activeTeamIds` Set
2. **If no active teams** → carry forward all existing team data unchanged, skip all API calls except step 1
3. **If active teams exist** → fetch standings + all matches + Polymarket probabilities for all groups
4. **Per team**: if in `activeTeamIds` → full recalculate; else → carry forward from existing JSON
5. **Write** `public/data/world-cup-2026.json` (always), `public/data/snapshots/YYYY-MM-DD.json` (overwrite daily), and update `manifest.json`

**API usage on a typical match day:** ~6 requests (2 match fetches + 1 standings + 3 Polymarket group slugs)  
**API usage on a quiet day:** ~1 request (today's matches check → finds none → exits)  
**football-data.org free tier:** 100 req/day. We use ~6–24/day. Fine.  
**Polymarket:** No auth required. Fetches group winner markets.

**FOOTBALL_DATA_KEY** must be set as a GitHub Actions secret in repo Settings → Secrets → Actions.

---

## Known data quirks / things to be aware of

### Group stage city derivation
Fixed in the script: `buildPath()` now only uses games where the team is home OR away, not all games in the group. This was causing Vancouver to appear in USA's hero (from the Australia vs Turkey game).

### Conditional venues
All R32/R16/QF/SF/Final path entries have `conditional: true` and a `conditionNote` string. The UI surfaces these in three places: the Hero amber banner, the StageTabs ⚠ indicator, and the RoadBracket card label. The underlying logic is: the bracket routing table (`BRACKET_PATHS` in the script) maps `GROUP-POSITION` (e.g. `D-1` = Group D winner) to a specific venue path. If the team finishes 2nd instead of 1st, they play in a different city on a different date.

### R32 opponent pool logic
For each team, `possibleOpponents.r32` lists the groups whose 3rd-place teams could be the R32 opponent (based on the official FIFA bracket assignment rules). The pool is hardcoded in `buildOpponents()` in the script. For teams with rich data, this is supplemented with curated `likelyTeam`, `altTeam`, difficulty ratings, and notes.

### England specifically
England's R32 has TWO opponent entries because their bracket position depends heavily on whether they finish 1st or 2nd in Group L:
- **1st place**: 3rd-place team from Group K pool (likely DR Congo, #56)
- **2nd place**: Runner-up of Group K (likely Colombia, #13)

The OpponentWatchlist renders these as two separate cards, each with a `note` explaining the condition.

### Teams without rich data
For the 35 teams without curated opponent data, `possibleOpponents.r32` contains auto-generated entries with `likelyTeam: 'TBD'` until live standings can resolve who the 3rd-place teams will be. The OpponentWatchlist handles `TBD` gracefully.

---

## GitHub Actions setup

The workflow file is at `.github/workflows/update-data.yml`. To activate:

1. Push repo to GitHub
2. Go to **Settings → Secrets and variables → Actions**
3. Add secret: `FOOTBALL_DATA_KEY` = your football-data.org API key (free tier is fine)
4. The workflow runs automatically every hour at `:00`
5. It only commits if `public/data/` changed — quiet hours produce no commits

Manual trigger: GitHub → Actions → "Update World Cup Data" → "Run workflow"

---

## Outstanding items / known issues

These are the things that still need attention. This list is what to hand off to Claude Code:

### 1. Rich opponent data for remaining 35 teams
Only 13 teams have curated R32 opponent data with difficulty ratings and notes. The other 35 show TBD. Someone needs to write the opponent pool entries for teams like Sweden, Norway, Japan, Colombia, Uruguay, etc. — following the same pattern as the existing rich entries in the JSON. This is a data authoring task, not a code change. The `RICH_OPPONENTS` object in the patch script (`/tmp/fix-data.js` from session) is the right place to add these.

### 2. Score display on ScheduledMatches
`ScheduledMatches` renders a score when `match.score` is set, but the match data structure for R32+ knockout rounds doesn't yet have `score` — it only has `opponentDesc`. When knockout results come in, the update script will need to hydrate actual scores into the team's knockout match history. Currently the UI handles `null` score gracefully (shows venue instead), but it's worth confirming this renders well once real knockout data flows through.

### 3. Mobile layout review
The responsive breakpoints are set at 900px and 580px. Key mobile concerns:
- StageTabs: momentum scroll works but tab labels may be very long on small screens — consider abbreviating `Quarterfinal` → `QF` etc. on mobile
- Hero stat grid: collapses to 2×2 at 900px — looks fine
- GroupStage: two tables stack to single column at 900px — fine
- OpponentWatchlist R16 matchup rows: the 3-column grid collapses at 600px — needs a visual check
- TeamSelector dropdown width (240px) may feel cramped on very small phones

### 4. Polymarket slug reliability
The Polymarket group winner market slugs (e.g. `world-cup-group-d-winner`) are guesses based on observed patterns. Some may 404 or return no data. The script handles this gracefully (logs a warning, falls back to calculated probs) but the slug list in `fetchPolymarketAll()` should be verified against live Polymarket once the tournament is underway and markets are live.

### 5. Knockout bracket routing after group stage
When Group Stage ends (June 27), the update script will need to:
- Mark `currentStage` as `r32` for teams that advanced
- Set `eliminated: true` for teams that didn't qualify
- Update `path.r32.status` from `upcoming` to `active`/`done` as matches are played
- The bracket routing table (`BRACKET_PATHS`) handles venue/date automatically — but the script's `buildPath()` logic needs to check knockout match results from football-data.org and set the right `status` per stage

Currently `eliminated` is hardcoded to `false` for all teams and `currentStage` is hardcoded to `group_stage`. This will need updating as the tournament progresses.

### 6. No error boundary
There's no React error boundary wrapping the component tree. If any component throws (e.g. unexpected null in team data for a newly-added team), the whole app crashes to a white screen. Worth adding a simple `ErrorBoundary` wrapper in `App.jsx`.

### 7. Sharing / social meta tags
`index.html` has a basic `<meta name="description">` but no Open Graph or Twitter Card tags. Adding these would make shared links show a preview card. The description and image would ideally be dynamic (team + stage) but static OG tags would still be an improvement.

### 8. Deploy configuration
The app is currently configured with `base: '/'` in `vite.config.js`. If deploying to a GitHub Pages subdirectory (e.g. `stephenburks.github.io/road-to-final/`), change this to `base: '/road-to-final/'`. Netlify and Vercel deploys at root domain don't need this change.

---

## Design language summary (for UI work)

- **Dark theme only.** Background `#080814`, surfaces at `rgba(255,255,255,0.03)`
- **Three fonts:** Space Grotesk (display/headings), Inter (body), JetBrains Mono (labels, badges, code, stats)
- **Accent colours:** Purple `#6366f1` (interactive, selected), Green `#22c55e` (live, completed, winning), Amber `#f59e0b` (historical, conditional, warnings), Red `#ef4444` (eliminated, danger), Orange `#fb923c` (tough opponents)
- **Borders:** Always `rgba(255,255,255,0.07)` base; coloured variants for states (e.g. `var(--purple-b)` for active elements)
- **Border radius:** `var(--radius)` = 10px for cards, 8px for smaller cards, 6–7px for buttons
- **No shadows except glow effects** — cards use border + background tint, not box-shadow
- **Transitions:** `0.15s` for colours/backgrounds, `0.2s` for transforms, `0.3s` for glow effects
- **Typography hierarchy:** Display weight 800 for hero headings, 700 for card titles and section labels, 600 for UI labels, 400/500 for body text
- **All section headings** are visually hidden `<h2>` with a visible `<SectionLabel>` component (decorative label + flanking lines)

---

## Commands reference

```bash
# Development
npm run dev                    # → localhost:5173

# Production build
npm run build                  # → dist/

# Data update (manual)
node scripts/update-data.js
FOOTBALL_DATA_KEY=xxx node scripts/update-data.js

# Deploy options
# Netlify: drag dist/ to netlify.com/drop
# Vercel:  npx vercel dist/
# GH Pages: push dist/ to gh-pages branch (or use gh-pages npm package)

# After deploying, connect GitHub Actions to auto-update data on the repo
# and configure your host to serve the repo's public/ directory
```

---

*Handoff generated June 14, 2026. All 65 modules build cleanly (`npm run build`). No TypeScript, no external component libraries — just React, CSS Modules, and Vite.*
