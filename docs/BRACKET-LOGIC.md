# Tournament Bracket Logic — Reference

This document maps every possible path through the 2026 World Cup knockout bracket. There are **24 group-position paths** (12 groups × 2 finish positions). Every team in the same group finishing in the same position follows an identical path.

---

## USA (Group D) — Worked Example

USA's path depends entirely on whether they finish 1st or 2nd in Group D.

### Path D-1: USA finishes 1st in Group D

| Stage | Match | Date | City | Venue | Opponent | Can determine today? |
|-------|-------|------|------|-------|----------|---------------------|
| **R32** | 81 | Jul 1 | San Francisco | Levi's Stadium | Best 3rd-place from groups **B, E, F, I, J** (5 groups) | No — 5 possibilities until group stage resolves |
| **R16** | 94 | Jul 6 | Seattle | Lumen Field | Winner of **Group G** | **Yes** — Group G's winner is the feeder. Show Group G standings. |
| **QF** | 98 | Jul 10 | Los Angeles | SoFi Stadium | Winner of Match 94 | No — depends on R16 result |
| **SF** | 102 | Jul 15 | Atlanta | Mercedes-Benz | Winner of QF bracket | No |
| **Final** | 104 | Jul 19 | East Rutherford | MetLife Stadium | Winner of other SF (Match 101) | No |

R32 opponent pool (3rd-place teams from each group, based on current standings):
- Group B: Bosnia & Herz., Qatar, Switzerland (currently: Bosnia #1)
- Group E: Germany, Curaçao, Ivory Coast, Ecuador (currently: Curaçao #3)
- Group F: Netherlands, Japan, Sweden, Tunisia (currently: Sweden #3)
- Group I: France, Senegal, Iraq, Norway (currently: Iraq #3)
- Group J: Argentina, Algeria, Austria, Jordan (currently: Jordan #3)

### Path D-2: USA finishes 2nd in Group D

| Stage | Match | Date | City | Venue | Opponent | Can determine today? |
|-------|-------|------|------|-------|----------|---------------------|
| **R32** | 88 | Jul 3 | Dallas | AT&T Stadium | Winner of **Group C** | **Yes** — Group C's current leader is Brazil |
| **R16** | 95 | Jul 7 | Atlanta | Mercedes-Benz | Winner of Match 87 | No — multiple R32 paths feed into Match 87 |
| **QF** | 99 | Jul 11 | Miami | Hard Rock Stadium | Winner of Match 95 | No |
| **SF** | 102 | Jul 15 | Atlanta | Mercedes-Benz | Winner of QF bracket | No |
| **Final** | 104 | Jul 19 | East Rutherford | MetLife Stadium | Winner of other SF (Match 101) | No |

---

## Complete Path Reference: All 24 Group-Position Combinations

Legend:
- **Green rows**: R16 opponent is a specific group → feeder group standings can render today
- **Orange rows**: R32 opponent is a specific group → single opponent card can render today
- **White rows**: R32 opponent pool spans multiple groups → can only show watchlist range

---

### Group A

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **A-1** (1st) | 79, Jun 28, Mexico City | Best 3rd from C/E/F/H/I (5 groups) | 93, Jul 5, Guadalajara | Winner Match 79 | No |
| **A-2** (2nd) | 80, Jun 29, Atlanta | Best 3rd from E/H/I/J/K (5 groups) | 94, Jul 6, Seattle | Winner Match 80 | No |

### Group B

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **B-1** (1st) | 85, Jul 2, Boston | Best 3rd from E/F/G/I/J (5 groups) | 96, Jul 7, Vancouver | Winner Match 85 | No |
| **B-2** (2nd) | 82, Jul 1, Seattle | Best 3rd from A/E/H/I/J (5 groups) | 94, Jul 6, Seattle | Winner Match 82 | No |

### Group C

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **C-1** (1st) | 87, Jul 3, Kansas City | Best 3rd from D/E/I/J/L (5 groups) | 96, Jul 7, Vancouver | Winner Match 86 | No |
| **C-2** (2nd) | 88, Jul 3, Dallas | **Runner-up Group D** (single) | 95, Jul 7, Atlanta | Winner Match 87 | No |

### Group D

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **D-1** (1st) | 81, Jul 1, San Francisco | Best 3rd from B/E/F/I/J (5 groups) | 94, Jul 6, Seattle | **Winner Group G** ✅ | **YES** — Group G |
| **D-2** (2nd) | 88, Jul 3, Dallas | **Winner Group C** ✅ | 95, Jul 7, Atlanta | Winner Match 87 | No |

### Group E

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **E-1** (1st) | 81, Jul 1, San Francisco | Best 3rd from B/E/F/I/J (5 groups) | 94, Jul 6, Seattle | Winner Match 82 | No |
| **E-2** (2nd) | 86, Jul 2, Miami | **Winner Group J** ✅ | 96, Jul 7, Vancouver | Winner Match 86 | No |

### Group F

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **F-1** (1st) | 88, Jul 3, Dallas | **Runner-up Group D** (single) | 95, Jul 7, Atlanta | Winner Match 87 | No |
| **F-2** (2nd) | 87, Jul 3, Kansas City | **Winner Group K** ✅ | 96, Jul 7, Vancouver | Winner Match 86 | No |

### Group G

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **G-1** (1st) | 82, Jul 1, Seattle | Best 3rd from A/E/H/I/J (5 groups) | 94, Jul 6, Seattle | **Winner Group D** ✅ | **YES** — Group D |
| **G-2** (2nd) | 88, Jul 3, Dallas | **Runner-up Group D** (single) | 95, Jul 7, Atlanta | Winner Match 87 | No |

### Group H

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **H-1** (1st) | 84, Jul 2, Los Angeles | **Runner-up Group J** (single) | 96, Jul 7, Vancouver | Winner Match 85 | No |
| **H-2** (2nd) | 80, Jun 29, Atlanta | **Winner Group L** ✅ | 94, Jul 6, Seattle | Winner Match 80 | No |

### Group I

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **I-1** (1st) | 85, Jul 2, Boston | Best 3rd from E/F/G/I/J (5 groups) | 96, Jul 7, Vancouver | Winner Match 85 | No |
| **I-2** (2nd) | 86, Jul 2, Miami | **Winner Group J** ✅ | 96, Jul 7, Vancouver | Winner Match 86 | No |

### Group J

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **J-1** (1st) | 79, Jun 28, Mexico City | Best 3rd from C/E/F/H/I (5 groups) | 93, Jul 5, Guadalajara | Winner Match 79 | No |
| **J-2** (2nd) | 84, Jul 2, Los Angeles | **Winner Group H** ✅ | 96, Jul 7, Vancouver | Winner Match 85 | No |

### Group K

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **K-1** (1st) | 80, Jun 29, Atlanta | Best 3rd from E/H/I/J/K (5 groups) | 94, Jul 6, Seattle | Winner Match 80 | No |
| **K-2** (2nd) | 83, Jun 29, Toronto | **Runner-up Group L** (single) | 95, Jul 7, Atlanta | Winner Match 83 | No |

### Group L

| Path | R32 Match | R32 Opponent | R16 Match | R16 Opponent | R16 Determinable? |
|------|-----------|-------------|-----------|-------------|-------------------|
| **L-1** (1st) | 83, Jun 29, Toronto | **Runner-up Group K** (single) | 95, Jul 7, Atlanta | Winner Match 83 | No |
| **L-2** (2nd) | 80, Jun 29, Atlanta | **Winner Group K** ✅ | 94, Jul 6, Seattle | Winner Match 80 | No |

---

## Data Determinability Summary

### R32 Opponent Pools

| Type | Count | Description | UI treatment |
|------|-------|-------------|-------------|
| **Best 3rd from N groups** | 14 paths | Variable pool of 2-5 groups | Show opponent watchlist with all possible 3rd-place teams |
| **Winner Group X** | 5 paths | Single opponent group (current leader) | Show single opponent card with the group's current 1st-place team |
| **Runner-up Group X** | 5 paths | Single opponent group (current 2nd place) | Show single opponent card with the group's current 2nd-place team |

### R16 Opponent Pools

| Type | Count | Description | UI treatment |
|------|-------|-------------|-------------|
| **Winner Group X** (specific) | 7 paths | Single identifiable group | Show feeder group standings table |
| **Winner Match N** (indirect) | 17 paths | Depends on R32 result | Cannot show standings — too many possibilities |

### Paths where R16 feeder IS determinable today:

| Path | R16 Feeder Group | Trigger phrase |
|------|-----------------|----------------|
| D-1 | Group G | `Winner Group G` |
| G-1 | Group D | `Winner Group D` |
| C-2 | Runner-up Group D | `Runner-up Group D` |
| F-1 | Runner-up Group D | `Runner-up Group D` |
| G-2 | Runner-up Group D | `Runner-up Group D` |
| R32 singles* | N/A (R32 not R16) | `Winner Group C`, `Winner Group J`, `Winner Group K`, `Winner Group H`, `Winner Group L`, `Runner-up Group J`, `Runner-up Group K`, `Runner-up Group L` |

*R32 single-group matchups: C-2 vs winner C, D-2 vs winner C, E-2 vs winner J, F-2 vs winner K, H-1 vs runner-up J, H-2 vs winner L, I-2 vs winner J, J-2 vs winner H, K-2 vs runner-up L, L-1 vs runner-up K, L-2 vs winner K

---

## USA's R16 Display Logic (confirmed pattern)

1. **Path D-1 (current path since USA is 1st in Group D after MD1)**:
   - R32 opponentDesc: `"Best 3rd from B/E/F/I/J"` → Multi-group watchlist (correctly shows grid of possible 3rd-place teams)
   - R16 opponentDesc: `"Winner Group G (Match 82)"` → **Single group** → Show Group G standings table below matchup matrix
   - Feeder key: `"G"` (extracted by regex)

2. **Path D-2 (if USA drops to 2nd)**:
   - R32 opponentDesc: `"Winner Group C"` → **Single group** → Show Brazil today (Group C leader)
   - R16 opponentDesc: `"Winner Match 87"` → **Indirect** → Cannot show standings

---

## What the UI should show per stage

### Group Stage Tracker
- Always: team's own group standings + match cards
- If R16 opponent group is determinable: feeder group standings with label

### R32 Opponent Watchlist
- If single group: one prominent opponent card (current leader or runner-up of that group)
- If multi-group pool: grid of cards (current 3rd-place team from each possible group)
- Always: difficulty legend

### R16 Opponent Watchlist
- If probability data exists: matchup probability bars + callout cards
- If single feeder group is determinable: feeder group standings table below
- If indirect: show only probability bars (or "TBD" placeholder if no data)

---

## What was fixed (verified 2026-06-14)

- ✅ **R32 opponent building**: `buildOpponents()` now parses `opponentDesc` from `BRACKET_PATHS` and builds opponent lists for both single-group (`Winner Group X`, `Runner-up Group X`) and multi-group pool (`Best 3rd from ...`) R32 matchups — fixing the 13 paths that were previously missed.
- ✅ **`getFeederGroup` handles R32 + R16**: The regex pattern in `getFeederGroup` (see `src/utils.js:94-96`) already handles any stage — the function accepts a `stage` parameter and reads `team.path?.[stage]?.opponentDesc`. It's called for both R32 and R16 in `OpponentWatchlist.jsx` (lines 206-207).
- ⏸️ **R16 opponent probability lists**: `buildOpponents()` still returns `r16: []` — R16 probability computation via mapping R32 match slots to opposing R32 slots is deferred. The feeder group standings display provides a functional alternative for paths where R16 opponent is a single identifiable group.
