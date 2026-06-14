# Road to the Final — Engineering Audit
**Date:** 2026-06-14  
**Reviewer:** Senior/Principal Full Stack Engineer (Claude)  
**Scope:** Full codebase, CI/CD, tooling findings (fallow + React Doctor), feature gaps
**Status:** Updated with completion markers — all items verified against current codebase

---

## Executive Summary

Road to the Final is a well-structured, accessibility-first React fan app with a solid foundation. The architecture is clean, the data pipeline is thoughtful, and the UX patterns are consistent. The critical gaps are: incomplete knockout logic (opponent prediction stops at R16, eliminated-team status is hard-coded to `false`), zero test coverage, no TypeScript, and two of the four tooling findings are actual problems (the React Doctor issues are false positives against `node_modules`).

This document prioritizes every item — tooling issues, code quality, bugs, and feature enhancements — in a single ranked list so you can work top-to-bottom with confidence.

### Status Summary

| Status | Count | Items |
|--------|-------|-------|
| ✅ COMPLETED | 9 | P2, P3, P7, P8, P9, P10, P11, P15, P17 |
| ⏸️ DEFERRED | 4 | P4, P12, P14, P18 |
| 🔴 REMAINING | 12 | P1, P5, P6, P13, P16, P19–P25 (plus 4 New Items: N1–N4) |

---

## Priority Index

| # | Title | Category | Severity | Status |
|---|-------|----------|----------|--------|
| P1 | React Doctor scanned `node_modules` — all 3 findings are false positives | Tooling | Critical | 🔴 **REMAINING** |
| P2 | Fallow: ESLint plugins are unlisted in `package.json` | Tooling | High | ✅ **COMPLETED** (f78d069) |
| P3 | Eliminated team detection is hard-coded to `false` | Bug | Critical | ✅ **COMPLETED** (d8727a5) |
| P4 | `buildOpponents()` R16 opponent list never populated | Bug | High | ⏸️ **DEFERRED** (see below) |
| P5 | No automated tests | Quality | High | 🔴 **REMAINING** |
| P6 | No TypeScript | Quality | High | 🔴 **REMAINING** |
| P7 | Unvalidated external API responses | Reliability | High | ✅ **COMPLETED** (b0d1605) |
| P8 | `buildPath()` bracket routing table is hand-rolled with no validation | Reliability | Medium | ✅ **COMPLETED** (85ec6c3) |
| P9 | Name-to-ID mapping is fragile (string matching on team names) | Reliability | Medium | ✅ **COMPLETED** (0812725) |
| P10 | Script error handling swallows failures silently | Reliability | Medium | ✅ **COMPLETED** (42cf774) |
| P11 | No fetch timeout on Polymarket or football-data.org calls | Reliability | Medium | ✅ **COMPLETED** (42cf774) |
| P12 | Fallow: High-complexity functions need tests or refactoring | Quality | Medium | ⏸️ **DEFERRED** (see below) |
| P13 | `GroupStage.jsx` is the hotspot — most churn + highest complexity | Quality | Medium | 🔴 **REMAINING** |
| P14 | `TeamSelector` component is 193 lines in a single function | Quality | Medium | ⏸️ **DEFERRED** (see below) |
| P15 | `App` has too many responsibilities (fan-out of 15 modules) | Quality | Medium | ✅ **COMPLETED** (4d970e0) |
| P16 | No Prettier configured | Quality | Low | 🔴 **REMAINING** |
| P17 | `update-data.yml` has no failure alert mechanism | CI/CD | Low | ✅ **COMPLETED** (42cf774) |
| P18 | Feature: Complete R16–Final opponent probability display | Feature | High | ⏸️ **DEFERRED** (see below) |
| P19 | Feature: Head-to-head history between two teams | Feature | Medium | 🔴 **REMAINING** |
| P20 | Feature: Match score push notifications / live update indicator | Feature | Medium | 🔴 **REMAINING** |
| P21 | Feature: Social share card (OG image per team) | Feature | Medium | 🔴 **REMAINING** |
| P22 | Feature: "Upset Tracker" — teams that overperformed their pre-tournament odds | Feature | Medium | 🔴 **REMAINING** |
| P23 | Feature: Difficulty of remaining schedule (aggregate FIFA rank gauntlet) | Feature | Low | 🔴 **REMAINING** |
| P24 | Feature: Group "Clinched" / "Eliminated" badges in GroupStage table | Feature | Low | 🔴 **REMAINING** |
| P25 | Feature: Bracket overlay comparing two teams side-by-side | Feature | Low | 🔴 **REMAINING** |

---

## Detailed Findings

---

### P1 — React Doctor: All 3 Findings Are False Positives Against `node_modules`
**Category:** Tooling | **Severity:** Critical (the tool is broken, not the code) | **Status:** 🔴 **REMAINING**

#### What happened
React Doctor was run without an exclude pattern, so it scanned `node_modules/` alongside source files. Every single file listed in all three findings is a `node_modules` path:

- **`this` in function component (×1649):** All hits are in `node_modules/.vite/deps/react-*.js`, `@babel/generator`, etc.
- **Missing effect dependencies (×30):** All hits are in `node_modules/react-dom/`.
- **Array lookup inside loop (×143):** All hits are in `node_modules/.vite/deps/`.

**The app's source code has none of these issues.** This is a tooling invocation problem.

#### Fix
Run React Doctor with a scope or exclusion flag. Most static analysis tools accept a `--ignore` or target directory:
```bash
npx react-doctor@latest src/
```
Or add a config file (`.reactdoctor.json` or equivalent) that sets `include: ["src/**"]`.

#### On adding React Doctor to CI
This is worth doing, but only after fixing the invocation scope. The value prop is real — catching `useEffect` dependency issues and SFC `this` bugs before they merge. Before adding it to CI, confirm:
1. Running `npx react-doctor src/` produces zero issues against your source files
2. Add a `.reactdoctorignore` or config to pin the scope so it doesn't regress on `node_modules`

---

### P2 — Fallow: ESLint Plugins Are Unlisted in `package.json`
**Category:** Tooling | **Severity:** High | **Status:** ✅ **COMPLETED** (f78d069)

#### What fallow found
Four packages imported in `eslint.config.js` are not declared in `package.json`:
- `@eslint/js`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`

#### Fix applied
All four are now in `devDependencies` in `package.json`:
```
"@eslint/js": "^10.0.1",
"eslint-plugin-react-hooks": "^7.1.1",
"eslint-plugin-react-refresh": "^0.5.3",
"globals": "^17.6.0",
```

---

### P3 — Eliminated Team Detection Hard-Coded to `false`
**Category:** Bug | **Severity:** Critical | **Status:** ✅ **COMPLETED** (d8727a5)

#### Previous state
The `eliminated` field on every team was set to `false` unconditionally.

#### Fix applied
Elimination is now computed mathematically from group standings (lines 745–756 in `scripts/update-data.js`):
```js
// Compute mathematical elimination from group standings
let eliminated = false;
if (rawStandings?.[t.group]) {
  const gRows = rawStandings[t.group];
  const teamRow = gRows.find(r => r.teamId === t.id);
  if (teamRow) {
    const remainingMatches = 3 - teamRow.played;
    const maxPossible = teamRow.pts + 3 * remainingMatches;
    const sorted = [...gRows].sort((a, b) => b.pts - a.pts);
    const secondPlacePts = sorted[1]?.pts ?? 0;
    eliminated = remainingMatches > 0 && maxPossible < secondPlacePts;
  }
}
```

**Note:** This only detects *mathematical* elimination during the group stage. Knockout elimination (losing a R32/R16/QF/SF match) is not yet implemented. During the knockout phase, this will need to be extended.

---

### P4 — `buildOpponents()` R16 Array Is Never Populated
**Category:** Bug | **Severity:** High | **Status:** ⏸️ **DEFERRED**

#### What was fixed
- R32 opponent building is now correct: `buildOpponents()` parses `opponentDesc` from `BRACKET_PATHS` and builds opponent lists for both single-group (`Winner Group X`, `Runner-up Group X`) and multi-group pool (`Best 3rd from ...`) R32 matchups. Commits: 3fce2bc, b212da6, 8eb8893.
- The `getFeederGroup()` utility (src/utils.js:91–115) extracts feeder group info from opponentDesc strings for both R32 and R16 stages.
- The `OpponentWatchlist` component renders feeder group standings tables for R16 when a single group can be identified.

#### What's still missing
- `buildOpponents()` still returns `r16: []` for all paths (lines 584 and 607 of `scripts/update-data.js`).
- R16 opponent probability computation (mapping R32 winner slots to R16 slots) is not implemented.
- As a result, `r16WithPct` is always `false` in `OpponentWatchlist.jsx`, and the `MatchupMatrix` probability bars never render for R16.

#### Why deferred
The feeder group standings display (commit b212da6) provides a functional alternative: users can see the standings table of the group that feeds into their team's R16 match. This covers the "Who will we likely face in R16?" use case for the 7 paths where R16 opponent is determinable from a single group. Full probability computation for all paths is a larger effort that should follow test setup (P5).

---

### P5 — No Automated Tests
**Category:** Quality | **Severity:** High | **Status:** 🔴 **REMAINING**

#### Current state
Zero test files. No Jest config, no Playwright config, no React Testing Library setup. No vitest config. No test script in `package.json`.

#### Why this matters
The fallow CRAP score analysis (18 functions at "critical" severity with scores 100–506) is entirely driven by zero coverage. CRAP = CC² × (1 − coverage/100)³ + CC. Any coverage at all dramatically reduces these scores. More importantly, complex functions with no tests are a silent bug factory — every change to `OpponentWatchlist`, `StageTabs`, or `ScheduledMatches` is unverified.

#### Recommended approach (incremental)
1. **Start with utils** — `src/utils.js` has pure functions (`formatDate`, `writeURLParams`, `daysUntil`) that are easy to unit test and have no React dependencies
2. **Hook tests** — `useData.js` with a mock `fetch` to validate data loading states
3. **Component smoke tests** — React Testing Library renders for `Hero`, `GroupStage`, `TeamSelector`
4. **E2E** — Playwright: select team → verify stat cards match data → change date → verify snapshot loads

Setup:
```bash
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
```
Vitest integrates natively with Vite (no separate babel config needed).

---

### P6 — No TypeScript
**Category:** Quality | **Severity:** High | **Status:** 🔴 **REMAINING**

No changes. All files remain `.js`/`.jsx`. No `tsconfig.json`, no type definitions, no interfaces.

#### Why it matters here specifically
The data shape is complex: 48 teams, each with nested `path`, `groupResults`, `possibleOpponents`, `advanceProbabilities`. A mistyped key access (`team.path.r32` vs `team.path['r32']`) or a wrong assumption about whether a field is nullable won't surface until runtime. The app already uses optional chaining defensively everywhere (`team?.path?.[stage]?.city`) — which is itself a signal that the codebase is managing uncertainty that TypeScript would eliminate at the source.

#### Recommended migration path
1. Rename `.js` → `.ts`, `.jsx` → `.tsx` incrementally (Vite supports mixing)
2. Start with `constants.ts` and `utils.ts` — no JSX, pure functions, easiest to type
3. Define a `Team`, `Match`, `GroupStandings` interface in `src/types.ts` — derive the data shape from `world-cup-2026.json`
4. Type `useData.js` — once the return type is typed, TypeScript propagates into every component
5. Enable `"strict": true` in `tsconfig.json`

---

### P7 — Unvalidated External API Responses
**Category:** Reliability | **Severity:** High | **Status:** ✅ **COMPLETED** (b0d1605)

#### Fix applied
Lightweight runtime validators added at lines 285–299 of `scripts/update-data.js`:
```js
function validateStandingsResponse(data) {
  if (!data || !Array.isArray(data.standings))
    throw new Error('Invalid standings response: expected { standings: [...] }');
  return data;
}
function validateMatchesResponse(data) { ... }
function validatePolymarketResponse(data) { ... }
```
Each API call is now validated before processing. If the response shape changes, the script fails loudly instead of silently producing malformed data.

---

### P8 — Bracket Routing Table Has No Integrity Check
**Category:** Reliability | **Severity:** Medium | **Status:** ✅ **COMPLETED** (85ec6c3)

#### Fix applied
`validateBracketPaths()` added at lines 630–681 of `scripts/update-data.js`. Called at script startup before any data processing. Validates:
- All 24 group-position combinations exist
- Every path has all required stages (r32, r16, qf, sf, final)
- Every stage entry has all required fields (match, date, city, venue, opponentDesc)
- Dates match `YYYY-MM-DD` format
- Critical missing entries throw an error that halts the script

---

### P9 — Team Name-to-ID Mapping Is String-Based and Fragile
**Category:** Reliability | **Severity:** Medium | **Status:** ✅ **COMPLETED** (0812725)

#### Fix applied
Primary lookup now uses TLA (Three-Letter Abbreviation) codes from football-data.org:
```js
const TLA_TO_ID = {
  MEX:'mexico', RSA:'southafrica', KOR:'southkorea', CZE:'czechia',
  CAN:'canada', BIH:'bosnia', QAT:'qatar', SUI:'switzerland',
  // ...all 48 teams
};
```
The `nameToId()` function (lines 241–246) tries TLA first, falls back to name matching, and logs a warning when the fallback fires.

---

### P10 — Script Error Handling Swallows Failures
**Category:** Reliability | **Severity:** Medium | **Status:** ✅ **COMPLETED** (42cf774)

#### Fix applied
`tryFetch()` now returns a `FETCH_ERROR` sentinel (line 267) on network failures, distinct from empty API responses. Callers can check `if (result === FETCH_ERROR)` to distinguish "API returned empty data" from "API was unreachable."

```js
const FETCH_ERROR = Symbol('fetch_error');
async function tryFetch(url, headers = {}, timeoutMs = 10000) {
  // ...returns FETCH_ERROR on failure instead of null
}
```

---

### P11 — No Fetch Timeout
**Category:** Reliability | **Severity:** Medium | **Status:** ✅ **COMPLETED** (42cf774)

#### Fix applied
`tryFetch()` now uses `AbortController` with a 10-second timeout (lines 269–282):
```js
const controller = new AbortController();
const timer = setTimeout(() => controller.abort(), timeoutMs);
try {
  const res = await fetch(url, { headers, signal: controller.signal });
  // ...
} catch (e) {
  if (e.name === 'AbortError') log(`Timed out: ${url}`);
  return FETCH_ERROR;
} finally {
  clearTimeout(timer);
}
```

---

### P12 — Fallow: High-Complexity Functions Need Tests or Refactoring
**Category:** Quality | **Severity:** Medium | **Status:** ⏸️ **DEFERRED**

#### What was done
- `useTeamSearch` hook extracted from `TeamSelector` (52894c8)
- `useAppState` hook extracted from `App.jsx` (4d970e0)
- `OpponentWatchlist` decomposed with sub-components (`MatchupMatrix`, `MatchupRow`, `VenueBanner`, `FutureStagePlaceholder`)

#### What's still needed
- Zero tests written — CRAP scores remain inflated
- `OpponentWatchlist` at 326 lines is still the highest-complexity component
- `StageTabs` inline arrow function at line 36 still flagged

#### Why deferred
Adding tests (P5) is the prerequisite for meaningfully lowering CRAP scores. The refactoring that has been done reduces cognitive complexity but doesn't address the metric until coverage exists.

---

### P13 — `GroupStage.jsx` Is the Git Hotspot
**Category:** Quality | **Severity:** Medium | **Status:** 🔴 **REMAINING**

#### Current state
`GroupStage.jsx` is 223 lines with two components (`GroupTable` at 108 lines, `MatchCard` at 43 lines, `GroupStage` at 69 lines). The `GroupTable` component is exported and reused by `OpponentWatchlist` — which is good. However, the file still contains:
- Inline anonymous function for standings rendering (line 48)
- Mixed concerns: table rendering, match cards, feeder group note, disclaimer

#### Fix
Extract `MatchCard` into its own file. Extract the `GroupTable` row rendering lambda into a named `StandingsRow` component. This would make each piece independently testable.

---

### P14 — `TeamSelector` Is 193 Lines in a Single Function
**Category:** Quality | **Severity:** Medium | **Status:** ⏸️ **DEFERRED**

#### What was done
`useTeamSearch` hook extracted (52894c8) — filters teams by query, handles the search logic.

#### What's still needed
Keyboard navigation handlers (9 key handlers for dropdown) and scroll-into-view logic remain in `TeamSelector.jsx`. These should be extracted into a `useDropdownKeyboard` hook. The `TeamOptionGroup` rendering sub-component for confederation groupings should also be extracted.

#### Why deferred
The `useTeamSearch` extraction was the highest-value split. The keyboard handler extraction is a lower priority — the handlers work correctly and are well-contained.

---

### P15 — `App.jsx` Has Fan-Out of 15 Modules
**Category:** Quality | **Severity:** Medium | **Status:** ✅ **COMPLETED** (4d970e0)

#### Fix applied
`useAppState()` custom hook extracted to `src/hooks/useAppState.js`, owning URL sync, localStorage, and the three state values (team, date, stage). `App.jsx` is now 117 lines — a clean layout/composition file that imports the hook and passes values to components.

---

### P16 — No Prettier
**Category:** Quality | **Severity:** Low | **Status:** 🔴 **REMAINING**

No `.prettierrc` file exists. Prettier is not in `devDependencies`. Code style is enforced manually.

#### Fix
```bash
npm install -D prettier eslint-config-prettier
```
Add `.prettierrc`:
```json
{ "singleQuote": true, "useTabs": true, "printWidth": 100 }
```
Add `prettier` to `eslint.config.js` last in the extends chain to disable conflicting rules.

---

### P17 — CI Data Update Has No Failure Alerting
**Category:** CI/CD | **Severity:** Low | **Status:** ✅ **COMPLETED** (42cf774)

#### Fix applied
`.github/workflows/update-data.yml` now has a "Notify on failure" step (lines 35–54):
```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      // Creates a GitHub issue with label 'data-update-failure'
      // Deduplicates — won't create multiple issues for the same failure
```
The workflow also now has `issues: write` permission to support this.

---

## Feature Recommendations

---

### P18 — Complete R16–Final Opponent Probability Display
**Priority:** High | **Effort:** 1–2 days | **Status:** ⏸️ **DEFERRED**

#### What was done
- R32 opponent building is complete: `buildOpponents()` correctly parses all 24 bracket path opponentDesc strings
- R16 feeder group standings display works: `getFeederGroup()` extracts feeder group from opponentDesc for both R32 and R16
- The `OpponentWatchlist` component renders feeder group standings tables for R16 when a single group is identifiable

#### What's still needed
- `buildOpponents()` needs R16 opponent list computation (mapping R32 match slots to opposing R32 slots)
- R16 probability bars in `MatchupMatrix` need data from `buildOpponents()`
- SF/QF/Final opponent probability extension

#### Why deferred
The feeder group standings display provides a functional alternative that covers the highest-value use case. Full probability computation depends on the bracket being populated with R32 results (which won't happen until the tournament reaches that phase). This can be built closer to the knockout stage.

---

### P19 — Head-to-Head History Between Tracked Team and Opponents
**Priority:** Medium | **Effort:** 2–3 days | **Status:** 🔴 **REMAINING**

No work done.

---

### P20 — Live Match Score Indicator
**Priority:** Medium | **Effort:** 1 day | **Status:** 🔴 **REMAINING**

No work done.

---

### P21 — Social Share Card per Team
**Priority:** Medium | **Effort:** 2–3 days | **Status:** 🔴 **REMAINING**

No work done.

---

### P22 — Upset Tracker
**Priority:** Medium | **Effort:** 1 day | **Status:** 🔴 **REMAINING**

No work done.

---

### P23 — Remaining Schedule Difficulty Rating
**Priority:** Low | **Effort:** Half day | **Status:** 🔴 **REMAINING**

No work done.

---

### P24 — "Clinched" / "Eliminated" Badges in Group Table
**Priority:** Low | **Effort:** Half day | **Status:** 🔴 **REMAINING**

No work done.

---

### P25 — Two-Team Bracket Comparison
**Priority:** Low | **Effort:** 2 days | **Status:** 🔴 **REMAINING**

No work done.

---

## Fallow & React Doctor — Summary Verdict

| Tool | Finding | Real Issue? | Action | Status |
|------|---------|-------------|--------|--------|
| React Doctor — `this` in SFC (×1649) | **False positive** — all `node_modules` | No | Fix tool invocation: `npx react-doctor src/` | 🔴 |
| React Doctor — Missing effect deps (×30) | **False positive** — all `node_modules` | No | Same fix | 🔴 |
| React Doctor — Array in loop (×143) | **False positive** — all `node_modules` | No | Same fix | 🔴 |
| Fallow — Unlisted deps (4) | **Real** — ESLint plugins not in `package.json` | Yes | `npm install -D @eslint/js globals eslint-plugin-react-hooks eslint-plugin-react-refresh` | ✅ |
| Fallow — Complexity/CRAP (38 functions) | **Real** — but inflated by zero test coverage | Partially | Add tests first; refactor highest-CRAP functions | ⏸️ |
| Fallow — Hotspot: `GroupStage.jsx` | **Real** — most churn + complexity | Yes | Refactor + tests | 🔴 |
| Fallow — Large functions (7 flagged) | **Real** — `TeamSelector` (193 lines) is the worst | Yes | Extract hooks + sub-components | ⏸️ |
| Fallow — Zero dead code | **Good signal** | N/A | No action needed | ✅ |
| Fallow — Zero circular deps | **Good signal** | N/A | No action needed | ✅ |
| Fallow — Zero duplicate code | **Good signal** | N/A | No action needed | ✅ |

---

## What's Actually Good (Don't Touch)

- **Accessibility** — ARIA labels, keyboard navigation, `aria-live`, reduced-motion — above average for any project at this scale
- **Data architecture** — The hourly pipeline, carry-forward strategy, and snapshot system are genuinely clever
- **Error boundary** — Catches render crashes with useful recovery options
- **Minimal dependencies** — React + React DOM. Nothing else. Extremely easy to maintain and upgrade
- **URL + localStorage sync** — Shareable links work correctly; state survives refresh
- **CI/CD deploy pipeline** — OIDC auth, no PATs, clean Pages deployment
- **Bracket path validation** — Runs at script startup, catches typos before they corrupt data
- **TLA-based team matching** — Robust against football-data.org display name changes
- **Feeder group logic** — `getFeederGroup()` correctly extracts single-group R16 opponents from bracket path opponentDesc strings

---

## New Items (Added 2026-06-14)

---

### N1 — Full Schedule Section Spacing
**Category:** Design | **Severity:** Low | **Status:** 🔴 **REMAINING**

#### Issue
The `ScheduledMatches` component's `.schedule` container uses `gap: 4px` between stage blocks. The rest of the design language uses 9–16px gaps (inter-card gaps in `GroupStage` are 9px, stat grid gap is 12px, group grid gap is 16px). The 4px gap makes stage blocks look too tightly packed compared to the rest of the interface.

#### Location
`src/components/ScheduledMatches.module.css`, line 4:
```css
.schedule {
  display: flex;
  flex-direction: column;
  gap: 4px;   /* ← too tight */
}
```

#### Fix
Change to `gap: 8px` or `gap: 12px` to match the design language. The 8px value matches the visual rhythm of other section components.

---

### N2 — Mobile Horizontal Overflow / Scroll
**Category:** Bug | **Severity:** Medium | **Status:** 🔴 **REMAINING**

#### Issue
The app has a horizontal overflow/scroll issue on mobile viewports. Several potential causes identified:

1. **StageTabs** — `.outer` has `overflow-x: auto` and `.inner` has `min-width: max-content`. When all 6 stage tabs render, they may push beyond the viewport width (particularly on phones <375px).
2. **RoadBracket grid** — 6-column grid collapses to 3 columns at `max-width: 900px`, but a 3-column grid with cards could still overflow on narrow screens since cards use `width: calc(100% - 14px)` which may not account for `gap`.
3. **GroupStage group grid** — 2-column layout with tables. Tables with many columns (9 columns including position, team name, P/W/D/L/GD/Pts/Win%) have no horizontal overflow handling and may push beyond container width.

#### Diagnosis needed
Check on actual mobile viewports (iPhone SE ~375px, iPhone 14 ~390px) to identify the overflow source. The body has `overflow-x: hidden` so the overflow shouldn't visibly scroll, but the content may be clipped instead.

#### Suggested fix approach
- Tables in `GroupStage` and `OpponentWatchlist` need `overflow-x: auto` wrappers
- RoadBracket grid needs `overflow-x: auto` or fewer columns on mobile
- StageTabs may need tab truncation or a horizontal scroll with visible scrollbar indicator
- Global: Check any element with `min-width` or explicit pixel widths that exceed viewport

---

### N3 — App-Wide Navigation Tabs
**Category:** Feature | **Severity:** Medium | **Status:** 🔴 **REMAINING**

#### Request
Add two new navigation items:

1. **"Tournament Schedule for the day"** — Shows all matches occurring on the current date (across all groups/stages). This is distinct from the per-team schedule in `ScheduledMatches`. It should show a global view of "what's happening today in the tournament."

2. **"Tournament bracket as it stands"** — A full tournament bracket view showing all 48 teams, their current positions, and the bracket tree. This is distinct from the per-team `RoadBracket` which shows only one team's path.

#### Implementation notes
- Both items need to be added to the `Nav.jsx` component (currently has 4 links: The Road, Groups, Opponents, Schedule)
- "Tournament Schedule for the day" requires fetching matches filtered by today's date from the data (the data already has match dates — filtering by today is a presentation concern)
- "Tournament bracket as it stands" requires a new component that renders the full 48-team bracket tree. This is a substantial UI component — consider a simplified initial version that shows group stage standings + knockout bracket structure, then iterate
- URL routing: consider if these should be top-level views or sections within the existing page. The current architecture is a single-page app with anchor-based section navigation — adding top-level views would require routing changes (React Router or similar)

---

### N4 — Emoji Fallbacks for PC + ADA Compliance
**Category:** Accessibility | **Severity:** Medium | **Status:** 🔴 **REMAINING**

#### Issue
The flag emojis (🇺🇸, 🇧🇷, etc.) and icon emojis (✓, ✕, ●, ⚠️, ❓, ⏳, 🏳️) render correctly on Mac/Apple devices but may appear as tofu (□) or two-letter codes on Windows/PC.

#### Affected locations
- **Flag emojis** — Every team reference: `TeamSelector` dropdown, `Hero` heading (via `document.title`), `StageTabs` (city labels), `GroupStage` table rows, `OpponentWatchlist` cards, `ScheduledMatches` match rows, etc. Flags come from the `ALL_TEAMS` array in `scripts/update-data.js` and from the saved data.
- **Icon emojis** — Status indicators:
  - `✓` — completed stages (StageTabs, ScheduledMatches)
  - `✕` — eliminated badge (StageTabs), loss indicator (ScheduledMatches)
  - `●` — current stage indicator (StageTabs, ScheduledMatches)
  - `⚠️` — conditional path notice (StageTabs)
  - `❓` — future/unplayed match indicator (ScheduledMatches)
  - `⏳` — future stage placeholder (OpponentWatchlist)
  - `🏳️` — fallback flag (multiple components)
  - `🟢🟡🟠🔴` — difficulty legend (OpponentWatchlist)
  - `📅` — historical banner (App.jsx)
  - `⚽` — goal scorer indicator (GroupStage)
  - `½` — draw indicator (ScheduledMatches)

#### WCAG compliance
- The `✓` checkmark (U+2713) at color `#22c55e` on `var(--surface)` background — needs contrast verification
- The `✕` cross (U+2715) at color `#ef4444` — needs contrast verification
- The `●` dot (U+25CF) at color `var(--green)` — purely decorative, already `aria-hidden="true"` ✓
- Flag emojis are mostly `aria-hidden="true"` with team names as accessible text — this is correct ✓

#### Proposed solution (prioritized)

1. **Immediate (low-effort):** Add `aria-label` text alternatives where missing. Most icon emojis already have `aria-hidden="true"` with nearby accessible text. Audit to ensure 100% coverage.
2. **Short-term:** Replace icon emojis with CSS-rendered equivalents:
   - `✓` → CSS pseudo-element with a checkmark SVG or unicode in a font that renders on Windows
   - `✕` → Same approach
   - `🟢🟡🟠🔴` → CSS colored circles (already done in `DiffPips` — the legend items can use the same approach)
3. **Medium-term:** For flag emojis, adopt SVG flag icons from a library like `flag-icons` or `circle-flags`. This ensures consistent rendering across all platforms including Windows.
   - Integration: Map each `team.id` to an SVG flag component. Fallback to the emoji flag for platforms that support it.
   - Consider `react-circle-flags` (tree-shakeable per-flag imports) or inline SVG sprite.

---

*Generated for review — confirm items before starting work. Priority order above reflects risk + user impact, not estimated effort.*
*Updated 2026-06-14 with completion status verified against current codebase (commits through e83e201).*
