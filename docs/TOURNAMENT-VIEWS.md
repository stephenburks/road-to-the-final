# Tournament Views — Design Plan

**Status**: Proposed  
**Author**: Fred (Lead Architect)  
**Date**: 2026-06-14  

## Context

The app is currently entirely team-focused: user picks a team, and every view (Bracket, Groups, Opponents, Schedule) shows that team's perspective. Two new app-wide views are needed that operate across ALL 48 teams independent of team selection:

1. **Tournament Bracket** — Full 48-team bracket visualization showing the entire tournament structure at a glance. All groups feeding into knockout rounds, all paths visible.
2. **Tournament Schedule** — All matches happening today (or on a selected date) across all teams/groups, tournament-wide. Not the selected team's schedule — the whole tournament's daily slate.

### Distinction from existing team-focused views

The existing Nav links are ALL team-scoped and are NOT being replaced:

| Nav Link | Target | Scope |
|----------|--------|-------|
| Today | `#hero` — Hero stats & probabilities | Selected team |
| Bracket | `#road` — RoadBracket (6-stage path) | Selected team |
| Groups | `#groups` — GroupStage standings | Selected team's group |
| Opponents | `#opponents` — OpponentWatchlist | Selected team |
| Schedule | `#schedule` — ScheduledMatches | Selected team's full path |

The new **Tournament Bracket** and **Tournament Schedule** are fundamentally different views that show ALL 48 teams simultaneously. They do NOT replace or rename any existing nav items — they are a separate "mode" with their own section(s).

The earlier renaming of "The Road" → "Today" and the addition of "Bracket" to the nav (N3 request) was about improving the team-focused nav labels. These remain team-scoped and coexist with the new tournament views via a mode toggle.

## Decision

### UI Placement

**Approach: Dual-mode Nav with toggle**

Add a toggle in the existing Nav that switches between two "modes":

```
[⚽ Road to the Final]

├─ My Team  |  Tournament    ← toggle
│
│  (My Team mode — existing views)
│   Today | Bracket | Groups | Opponents | Schedule
│
│  (Tournament mode — new views)
│   Full Bracket  |  Today's Matches  |  All Groups
```

The toggle replaces the current nav links with tournament-wide versions. The hero and team selector remain visible (user can still see which team they're tracking on the side).

**Rationale**: 
- Keeps the page clean instead of doubling its length with new sections
- Existing nav already has `overflow-x: auto` — handles more items gracefully
- Toggle pattern is common for "perspective switching" (e.g., GitHub's "Personal" vs "Organization" dashboard views)
- No state management changes needed beyond a simple boolean in App state

**Alternative considered**: Add sections below existing content. Rejected — page would be very long, and the nav links would be competing for space with 7+ items.

### Component Architecture

```
New components to create:
├── TournamentBracket.jsx    — Full 48-team bracket visualization
├── TournamentBracket.module.css
├── TournamentSchedule.jsx   — Today's matches across all teams
├── TournamentSchedule.module.css
└── TournamentMode.jsx       — Wrapper that composes tournament views
    (or just inline in App.jsx)

Existing components to modify:
├── App.jsx                  — Add mode toggle state + conditional rendering
├── Nav.jsx                  — Add toggle + conditional nav links
├── useAppState.js           — Add `viewMode` state ('team' | 'tournament')
```

### Data Flow

**Tournament Bracket** uses:
- `data.groups` — all 12 group standings (already loaded)
- `data.teams` — all 48 teams with their `path` data (already loaded)
- No new data fetches needed — all data is already in the JSON

**Tournament Schedule** uses:
- `data.teams[].groupResults` — all teams' match data with dates
- Filter by today's date (`new Date().toISOString().split('T')[0]` or tournament date)
- Can also extend to "pick a date" like the existing DateSelector (but tournament-wide)

### UI Layout — Tournament Bracket

The 48-team World Cup bracket is complex. For the group stage → knockout flow, I propose:

**Group Stage grid** (top section):  
- 12 groups in a 3×4 or 4×3 grid
- Each group shows a mini-table with top 2 (advancing) highlighted  
- Group winners go to specific R32 slots, runners-up to others
- Compact cards: group letter, top 2 team names with flags

**Knockout bracket** (below):  
- Horizontal bracket tree: R32 → R16 → QF → SF → Final
- 32 slots in R32 (24 from groups + 8 best 3rd-place)
- Each match shows: team flags, names, score (if played), or "TBD"
- Lines/connectors between rounds
- On narrow viewports: vertical layout (rounds stacked), horizontal scroll within each round

**MVP approach**: Start with the knockout bracket first since the group → knockout mapping involves complex 3rd-place logic. Show groups as simple summary cards above the bracket.

### UI Layout — Tournament Schedule

- Date picker at top (defaults to today)
- Section per group showing that group's matches for the selected date
- Or: chronological list of all matches sorted by kickoff time
- Each match card: flags, teams, score (if played), venue, scorers
- Similar visual style to existing GroupStage match cards

### Implementation Plan

| Step | What | Effort | Depends on |
|------|------|--------|------------|
| 1 | Add `viewMode` to `useAppState.js` | Small | — |
| 2 | Update `Nav.jsx` with mode toggle | Small | Step 1 |
| 3 | Create `TournamentBracket.jsx` + CSS | Large | Step 1 |
| 4 | Create `TournamentSchedule.jsx` + CSS | Medium | Step 1 |
| 5 | Update `App.jsx` to conditionally render | Small | Steps 3-4 |
| 6 | Build & test | Small | Step 5 |

**Total estimated effort**: ~4-6 hours (Bracket is the heavy lift — the 48-team knockout tree visualization requires careful layout design)

### Bracket Data Model

The existing `data.teams[].path` gives each team's knockout path through R32→R16→QF→SF→Final. To build the full bracket, we need to:
1. For each knockout match slot (e.g., Match 79 in R32), determine which teams could land there
2. Cross-reference group positions with the tournament bracket structure
3. Show actual teams where group stage is complete, "TBD" placeholders otherwise

The `teams[].path[stage].match` field gives match numbers. We can build a reverse index: `matchNumber → [team slots]`.

### Risks

- **Bracket complexity**: The 48-team format with 3rd-place teams is non-trivial to model correctly. We may need a lookup table mapping group positions → match slots.
- **Data completeness**: Not all teams have populated `path` data with match numbers. Need graceful fallbacks.
- **Performance**: Rendering 48+ team paths in a single bracket view — should be fine with React, but will monitor.

### Open Questions

1. Should the mode toggle persist in URL? (Recommend: yes, as `?mode=tournament`)
2. In tournament mode, what happens to the existing team-focused nav links? Three options:
   - **A) Hide them** — Nav only shows tournament links, team selector still visible in Header
   - **B) Keep them** — Nav shows both sets (crowded with 7+ links)
   - **C) Dual row** — Secondary nav bar below the existing nav for tournament links (recommended — clean separation)
   - See "UI Placement" section above for the chosen approach.
3. For the Tournament Bracket — how much detail per match? (Recommend: compact — flags + names, score if played. Expand on click.)
4. Does the Tournament Schedule replace or supplement the team-focused "Schedule" section? (It supplements — they serve different purposes: one is "my team's path", the other is "what's happening today across the tournament")

---

*Implementation pending user approval. Do not start coding the tournament views until this plan is signed off.*
