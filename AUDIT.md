# Road to the Final — Engineering Audit
**Date:** 2026-06-14  
**Reviewer:** Senior/Principal Full Stack Engineer (Claude)  
**Scope:** Full codebase, CI/CD, tooling findings (fallow + React Doctor), feature gaps

---

## Executive Summary

Road to the Final is a well-structured, accessibility-first React fan app with a solid foundation. The architecture is clean, the data pipeline is thoughtful, and the UX patterns are consistent. The critical gaps are: incomplete knockout logic (opponent prediction stops at R16, eliminated-team status is hard-coded to `false`), zero test coverage, no TypeScript, and two of the four tooling findings are actual problems (the React Doctor issues are false positives against `node_modules`).

This document prioritizes every item — tooling issues, code quality, bugs, and feature enhancements — in a single ranked list so you can work top-to-bottom with confidence.

---

## Priority Index

| # | Title | Category | Severity |
|---|-------|----------|----------|
| P1 | React Doctor scanned `node_modules` — all 3 findings are false positives | Tooling | Critical |
| P2 | Fallow: ESLint plugins are unlisted in `package.json` | Tooling | High |
| P3 | Eliminated team detection is hard-coded to `false` | Bug | Critical |
| P4 | `buildOpponents()` R16 opponent list never populated | Bug | High |
| P5 | No automated tests | Quality | High |
| P6 | No TypeScript | Quality | High |
| P7 | Unvalidated external API responses | Reliability | High |
| P8 | `buildPath()` bracket routing table is hand-rolled with no validation | Reliability | Medium |
| P9 | Name-to-ID mapping is fragile (string matching on team names) | Reliability | Medium |
| P10 | Script error handling swallows failures silently | Reliability | Medium |
| P11 | No fetch timeout on Polymarket or football-data.org calls | Reliability | Medium |
| P12 | Fallow: High-complexity functions need tests or refactoring | Quality | Medium |
| P13 | `GroupStage.jsx` is the hotspot — most churn + highest complexity | Quality | Medium |
| P14 | `TeamSelector` component is 193 lines in a single function | Quality | Medium |
| P15 | `App` has too many responsibilities (fan-out of 15 modules) | Quality | Medium |
| P16 | No Prettier configured | Quality | Low |
| P17 | `update-data.yml` has no failure alert mechanism | CI/CD | Low |
| P18 | Feature: Complete R16–Final opponent probability display | Feature | High |
| P19 | Feature: Head-to-head history between two teams | Feature | Medium |
| P20 | Feature: Match score push notifications / live update indicator | Feature | Medium |
| P21 | Feature: Social share card (OG image per team) | Feature | Medium |
| P22 | Feature: "Upset Tracker" — teams that overperformed their pre-tournament odds | Feature | Medium |
| P23 | Feature: Difficulty of remaining schedule (aggregate FIFA rank gauntlet) | Feature | Low |
| P24 | Feature: Group "Clinched" / "Eliminated" badges in GroupStage table | Feature | Low |
| P25 | Feature: Bracket overlay comparing two teams side-by-side | Feature | Low |

---

## Detailed Findings

---

### P1 — React Doctor: All 3 Findings Are False Positives Against `node_modules`
**Category:** Tooling | **Severity:** Critical (the tool is broken, not the code)

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
**Category:** Tooling | **Severity:** High

#### What fallow found
Four packages imported in `eslint.config.js` are not declared in `package.json`:
- `@eslint/js`
- `eslint-plugin-react-hooks`
- `eslint-plugin-react-refresh`
- `globals`

These are currently installed as transitive dependencies of other packages, which is why the app works. But transitive dep resolution is non-deterministic — a dependency update could remove them and silently break your lint step.

#### Fix
Add them to `devDependencies`:
```bash
npm install -D @eslint/js globals eslint-plugin-react-hooks eslint-plugin-react-refresh
```

This is a 30-second fix. Do it before anything else in the tooling setup.

---

### P3 — Eliminated Team Detection Hard-Coded to `false`
**Category:** Bug | **Severity:** Critical

#### Location
`scripts/update-data.js` — wherever `eliminated` is set on each team object.

#### What's wrong
The `eliminated` field on every team is set to `false` unconditionally. There is no code that checks whether a team has been knocked out of the tournament and flips this flag. As the group stage concludes and knockout rounds progress, teams that finish bottom of their group or lose a knockout match will still appear as active.

**User impact:** A fan of a team that gets eliminated sees the app continuing to display advancement probabilities and scheduled matches as if elimination didn't happen. The `EliminatedView` component exists and is wired up — it just never gets triggered.

#### Fix
After group standings are resolved, check whether a team qualified for the Round of 32:
```js
// After fetching and processing group standings:
const qualified = new Set(qualifiedTeamIds); // derive from top-2 finishers per group + best 3rds
team.eliminated = !qualified.has(team.id);
team.currentStage = team.eliminated ? 'eliminated' : 'r32';
```
For knockout rounds, check match results for the team's fixture and mark eliminated if they lost.

---

### P4 — `buildOpponents()` R16 Array Is Never Populated
**Category:** Bug | **Severity:** High

#### Location
`scripts/update-data.js`, `buildOpponents()` function

#### What's wrong
```js
const r16Opps = [];  // populated logic is missing — always returns empty array
return { r32: r32Opps, r16: r16Opps };
```
The R32 opponents are built correctly from the bracket path table. R16 opponents require knowing who wins the R32 match in the opposing slot — which is derivable from the bracket structure once R32 fixture assignments are known.

**User impact:** The OpponentWatchlist component shows "TBD" for R16 even during the group stage when bracket positions are deterministic and likely opponents could be shown with probabilities.

#### Fix
Map each team's R32 match result slot to the opposing R32 slot, then compute likelihood from group standings. The bracket path table already has the match numbers — cross-reference those to build R16 candidate pools using the same difficulty-rating logic used for R32.

---

### P5 — No Automated Tests
**Category:** Quality | **Severity:** High

#### Current state
Zero test files. No Jest config, no Playwright config, no React Testing Library setup.

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
**Category:** Quality | **Severity:** High

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
**Category:** Reliability | **Severity:** High

#### Location
`scripts/update-data.js` — `fetchStandings()`, `fetchMatches()`, `fetchPolymarketAll()`

#### What's wrong
The script assumes that `football-data.org` returns `response.standings[0].table[].team.name` and that Polymarket returns `tokens[].outcome` with a `.price`. If either API changes their response schema, the script silently produces malformed team objects (missing probabilities, wrong team names, undefined fields).

**Real-world example:** Polymarket's token structure (`token.outcome` vs `token.outcomeName`) has changed in the past. If it changes again, all advancement probabilities silently drop to zero — no error, no alert.

#### Fix
Add lightweight runtime validation before using API responses:
```js
function validateStandingsResponse(data) {
  if (!data?.standings?.[0]?.table) {
    throw new Error(`Unexpected standings shape: ${JSON.stringify(data).slice(0, 200)}`);
  }
}
```
For a more robust solution, add `zod` to the script's runtime dependencies and define schemas for each API's expected shape.

---

### P8 — Bracket Routing Table Has No Integrity Check
**Category:** Reliability | **Severity:** Medium

#### Location
`scripts/update-data.js`, lines ~105–202 (the `BRACKET_PATHS` object)

#### What's wrong
600+ lines of manually encoded bracket paths (`r32`, `r16`, `qf`, `sf`, `final` per group position per group). This is correct for the 2026 World Cup format, but:
- No runtime check that match numbers are unique across conflicting team positions
- If FIFA adjusts the bracket (they have done this before), this table requires careful manual diff
- A single typo is invisible until a specific team hits a specific bracket slot

#### Fix
Add a small validation step at script startup:
```js
function validateBracketPaths(paths) {
  // Check no two team positions in the same bracket slot map to the same match
  // Check all match IDs are non-null and in expected numeric range
}
```

Long-term: derive bracket paths from the official fixture list rather than hard-coding them.

---

### P9 — Team Name-to-ID Mapping Is String-Based and Fragile
**Category:** Reliability | **Severity:** Medium

#### Location
`scripts/update-data.js`, `nameToId()` function

#### What's wrong
Team identification relies on matching team names from `football-data.org` to the internal team ID list. The script has 23 hard-coded name aliases (e.g., `"Turkey" → "Türkiye"`, `"Czech Republic" → "Czechia"`). If `football-data.org` updates a team's display name, the match silently fails and that team's data is skipped.

#### Fix
`football-data.org` provides team codes (e.g., `USA`, `GER`, `BRA`). Use those as the canonical key instead of display names. Map API codes → internal IDs once in a lookup table; fall back to name matching only as a last resort with explicit logging when it fires.

---

### P10 — Script Error Handling Swallows Failures
**Category:** Reliability | **Severity:** Medium

#### Location
`scripts/update-data.js`, `tryFetch()` and callers

#### What's wrong
`tryFetch()` catches all errors and returns `null`. Callers treat `null` the same as "no data" and continue. If `fetchStandings()` returns `{}` (empty object on API failure), the script carries forward no standings update — which is safe — but there's no way to distinguish "API returned 200 with empty data" from "API returned 503 and we caught the error."

#### Fix
Distinguish failure modes:
```js
const FETCH_ERROR = Symbol('FETCH_ERROR');
async function tryFetch(url, opts) {
  try { return await fetch(url, opts).then(r => r.json()); }
  catch (err) { console.error(`Fetch failed: ${url}`, err.message); return FETCH_ERROR; }
}
// Callers: if (result === FETCH_ERROR) { skip update, log distinctly }
```

---

### P11 — No Fetch Timeout
**Category:** Reliability | **Severity:** Medium

#### Location
All `fetch()` calls in `scripts/update-data.js` and `src/hooks/useData.js`

#### What's wrong
Uncancelled fetches in GitHub Actions can hang indefinitely, consuming runner minutes. In the browser, a slow snapshot fetch hangs the loading state with no timeout.

#### Fix
```js
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 10_000);
try {
  const res = await fetch(url, { signal: controller.signal });
  clearTimeout(timeoutId);
  return res.json();
} catch (err) {
  if (err.name === 'AbortError') console.error('Fetch timed out:', url);
  throw err;
}
```

---

### P12 — Fallow: High-Complexity Functions Need Tests or Refactoring
**Category:** Quality | **Severity:** Medium

#### What fallow found
38 functions exceed complexity thresholds. The CRAP metric (Change Risk Anti-Patterns) is artificially inflated by zero test coverage — any coverage at all would drop most of these below threshold. The highest-risk functions by CRAP score:

| Function | File | CRAP | Action |
|----------|------|------|--------|
| `OpponentWatchlist` | OpponentWatchlist.jsx:169 | 506 | Refactor + tests |
| `<arrow>` (tab render) | StageTabs.jsx:36 | 462 | Extract to named function |
| `StageBlock` | ScheduledMatches.jsx:62 | 342 | Split into sub-components |
| `App` | App.jsx:41 | 342 | Extract hooks |
| `OpponentCard` | OpponentWatchlist.jsx:20 | 306 | Split card + sub-components |
| `buildPath` | update-data.js:452 | 272 | Decompose |
| `BracketCard` | RoadBracket.jsx:108 | 240 | Tests first, then refactor |

The fallow recommendation to "add tests" is the fastest path to lowering CRAP scores without touching the logic. Refactoring is the sustainable path.

#### Fix strategy
1. Add unit tests first — especially for pure rendering logic (test that a "completed" stage shows a checkmark)
2. Extract anonymous arrow functions to named functions so they're individually testable
3. Refactor the largest functions (193-line `TeamSelector`, 94-line `App`) into focused sub-components/hooks

---

### P13 — `GroupStage.jsx` Is the Git Hotspot
**Category:** Quality | **Severity:** Medium

#### What fallow found
`GroupStage.jsx` has the highest "hotspot score" (100/100): 3 commits, 390 lines added, 201 deleted, complexity density 0.25. It's the most frequently changed file with above-average complexity — the definition of technical debt accumulation.

**Three complex functions in one file:**
- `GroupTable` (86 lines) — renders standings table with conditional team highlighting and group navigation
- Anonymous arrow (56 lines) at line 48 — sorting/filtering logic inline in JSX
- `GroupStage` component (36 lines, cognitive complexity 14)

#### Fix
Extract the anonymous arrow at line 48 into a named `sortGroupTeams(standings, teamId)` function that can be tested in isolation. Then separate `GroupTable` into its own file. The `GroupStage` component itself can stay — it's the orchestrator.

---

### P14 — `TeamSelector` Is 193 Lines in a Single Function
**Category:** Quality | **Severity:** Medium

#### Location
`src/components/TeamSelector.jsx:6`

#### What's wrong
A 193-line React function that handles: dropdown open/close state, keyboard navigation (9 key handlers), search filtering, group-based rendering, flag display, and scroll-into-view. Fallow flags 5 separate sub-functions within it as over-threshold.

#### Fix
Extract:
- `useTeamSearch(teams, query)` — filtering hook
- `useDropdownKeyboard(...)` — keyboard handler hook  
- `TeamOptionGroup` — rendering sub-component for each confederation grouping

The logic is correct; it just needs to be spread across files so each piece is testable.

---

### P15 — `App.jsx` Has Fan-Out of 15 Modules
**Category:** Quality | **Severity:** Medium

#### Location
`src/App.jsx:41`

#### What's wrong
`App.jsx` imports 15 modules and directly manages: URL param sync, localStorage, team selection state, date selection state, stage selection state, auto-stage resolution, and data loading coordination. It has cognitive complexity 14 with a CRAP score of 342.

#### Fix
Extract `useAppState()` custom hook that owns URL sync, localStorage, and the three state values. `App.jsx` becomes a layout/composition file — it imports the hook and passes values to components. This reduces the component's complexity and gives you a clean, testable state machine.

---

### P16 — No Prettier
**Category:** Quality | **Severity:** Low

#### What's wrong
ESLint is configured but Prettier is not. Code style inconsistencies exist (some lines exceed 100 chars, some CSS uses 2-space indent, some JS files mix tab styles). Per the project's stated preference (tabs, ~100 chars, single quotes), Prettier would enforce this without manual review.

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
**Category:** CI/CD | **Severity:** Low

#### Location
`.github/workflows/update-data.yml`

#### What's wrong
If `node scripts/update-data.js` fails (API down, script crash), the commit step silently produces no commit. No notification is sent. If the football-data.org API goes down during the tournament, the app serves stale data indefinitely with no alert to you.

#### Fix
Add a failure notification step. The simplest approach is a GitHub issue or email via Actions:
```yaml
- name: Notify on failure
  if: failure()
  uses: actions/github-script@v7
  with:
    script: |
      github.rest.issues.create({ owner, repo, title: 'Data update failed', body: 'Check Actions run.' })
```

---

## Feature Recommendations

---

### P18 — Complete R16–Final Opponent Probability Display
**Priority:** High | **Effort:** 1–2 days

The `OpponentWatchlist` component has UI for R16, SF, and Final opponent prediction — but the data is never populated for R16 onward. Once P4 is fixed (populate `buildOpponents()` R16 logic), extending to SF/Final requires mapping the half-bracket: which R16 winners feed into each QF slot, etc.

This is the single biggest UX gap. Users watching a team that qualifies for R32 deserve to see "your likely R16 opponent is Argentina (72% probability based on Group C standings)."

---

### P19 — Head-to-Head History Between Tracked Team and Opponents
**Priority:** Medium | **Effort:** 2–3 days

The opponent watchlist shows likely opponents by difficulty rating (FIFA rank-based). Add a "head-to-head record" section: last 5 meetings, wins/draws/losses, goals scored. This data is available from `football-data.org` (H2H endpoint) or could be a curated JSON for the 48-team field.

**Why:** Sports fans make decisions based on historical matchups. "We've beaten Argentina twice in the last 4 years" is more meaningful than a FIFA rank number.

---

### P20 — Live Match Score Indicator
**Priority:** Medium | **Effort:** 1 day

The app currently shows "last updated: X minutes ago" in the header. During a live match for the tracked team, show a pulsing "LIVE" badge and the current score. The hourly data update is too slow for live scores, but the `football-data.org` API supports match-by-match polling. Add a 2-minute polling interval during the tracked team's match window.

**Detection:** Check if `currentMatchDate === today` and match time is within +/- 2 hours of now.

---

### P21 — Social Share Card per Team
**Priority:** Medium | **Effort:** 2–3 days

Add a share button on the Hero section that copies a URL like `?team=usa&stage=r32` with a pre-filled text: "USA is on their way to the Final — check their road here." Bonus: generate an OG image per team (using Satori/Vercel OG or a static pre-generated image per team) so links unfurl with the team flag and current stats in Slack/iMessage/Twitter.

**Why:** Viral growth. Fans share their team's bracket — this is the core use case.

---

### P22 — Upset Tracker
**Priority:** Medium | **Effort:** 1 day

A new section or separate tab: "Teams that overperformed their pre-tournament Polymarket odds." Compare each team's current advancement probability vs. their Day 1 snapshot probability. Rank teams by improvement. This is a single data comparison once historical snapshots exist (which they do — the snapshot system is already live).

**Why:** Upsets are the most-discussed tournament narrative. A Morocco 2022-style run is immediately surfaced.

---

### P23 — Remaining Schedule Difficulty Rating
**Priority:** Low | **Effort:** Half day

On the Hero section, below the advancement probability cards, show a "Difficulty of remaining schedule" metric — average FIFA rank of opponents in upcoming group games + expected knockout opponents. This aggregates the `possibleOpponents` data that already exists into a single scannable number.

---

### P24 — "Clinched" / "Eliminated" Badges in Group Table
**Priority:** Low | **Effort:** Half day

In the `GroupStage` standings table, show visual indicators next to team names: green "C" for clinched qualification, red "E" for eliminated, yellow "●" for in contention. The bracket logic can derive clinched/eliminated status from points with remaining games. This is a standard feature in any bracket app.

---

### P25 — Two-Team Bracket Comparison
**Priority:** Low | **Effort:** 2 days

Add an optional second team selector (in the header or a separate "Compare" mode). Show both teams' bracket paths side by side. Highlight where they would collide. This is the premium fan use case: "If USA and England both advance, when do they meet?"

---

## Fallow & React Doctor — Summary Verdict

| Tool | Finding | Real Issue? | Action |
|------|---------|-------------|--------|
| React Doctor — `this` in SFC (×1649) | **False positive** — all `node_modules` | No | Fix tool invocation: `npx react-doctor src/` |
| React Doctor — Missing effect deps (×30) | **False positive** — all `node_modules` | No | Same fix |
| React Doctor — Array in loop (×143) | **False positive** — all `node_modules` | No | Same fix |
| Fallow — Unlisted deps (4) | **Real** — ESLint plugins not in `package.json` | Yes | `npm install -D @eslint/js globals eslint-plugin-react-hooks eslint-plugin-react-refresh` |
| Fallow — Complexity/CRAP (38 functions) | **Real** — but inflated by zero test coverage | Partially | Add tests first; refactor highest-CRAP functions |
| Fallow — Hotspot: `GroupStage.jsx` | **Real** — most churn + complexity | Yes | Refactor + tests |
| Fallow — Large functions (7 flagged) | **Real** — `TeamSelector` (193 lines) is the worst | Yes | Extract hooks + sub-components |
| Fallow — Zero dead code | **Good signal** | N/A | No action needed |
| Fallow — Zero circular deps | **Good signal** | N/A | No action needed |
| Fallow — Zero duplicate code | **Good signal** | N/A | No action needed |

---

## What's Actually Good (Don't Touch)

- **Accessibility** — ARIA labels, keyboard navigation, `aria-live`, reduced-motion — above average for any project at this scale
- **Data architecture** — The hourly pipeline, carry-forward strategy, and snapshot system are genuinely clever
- **Error boundary** — Catches render crashes with useful recovery options
- **Minimal dependencies** — React + React DOM. Nothing else. Extremely easy to maintain and upgrade
- **URL + localStorage sync** — Shareable links work correctly; state survives refresh
- **CI/CD deploy pipeline** — OIDC auth, no PATs, clean Pages deployment

---

*Generated for review — confirm items before starting work. Priority order above reflects risk + user impact, not estimated effort.*
