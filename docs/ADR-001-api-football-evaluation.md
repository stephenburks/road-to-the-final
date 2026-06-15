# ADR-001: API-Football (API-Sports v3) as Replacement for football-data.org

**Status:** Proposed  
**Date:** 2026-06-15  
**Author:** Fred (Lead Architect)  
**Drivers:** Goal scorer data availability, API rate limit parity, data completeness

---

## Context

### Current State
The project uses **football-data.org v4** (`/v4/competitions/2000/matches`, `/v4/competitions/2000/standings`) on a free tier (100 req/day) to populate match results, scores, and group standings for the 2026 FIFA World Cup.

### The Gap
**football-data.org's free tier does not provide goal scorer data.** The `update-data.js` script carries forward scorers from previous data (line 501: `scorers: existingMatch?.scorers?.length ? existingMatch.scorers : []`), which means scorers can only exist if they were manually seeded. There is no automated pipeline for "who scored, and when."

This is the primary feature gap driving this evaluation. Users see empty `scorers: []` arrays for matches that have already been played, and the only fix is manual data entry.

### What We Still Need From Any API
| Data Need | Current Source | Critical? |
|-----------|---------------|-----------|
| Match scores & results (W/D/L) | football-data.org | Yes |
| Goal scorers (player name + minute) | *NOT AVAILABLE* | **Yes — THE GAP** |
| Group standings (pts, GD, GF, GA) | football-data.org | Yes |
| Match dates, venues, cities | football-data.org | Yes |
| Win/advance probabilities | Polymarket | Yes (unchanged) |

---

## Decision

**Recommendation: Migrate to API-Football (API-Sports v3) on the free tier.**

API-Football provides all current data needs plus the critical goal scorer data (`/fixtures/events`), on an identical 100 req/day free tier, with a smarter batching strategy to stay within quota.

---

## Options Considered

### Option A: Stay with football-data.org + manual scorer seeding
- **Pros**: Zero migration effort, no code changes
- **Cons**: Never gets scorer data automatically; manual work scales with tournament (72 group matches, 32 knockout); data goes stale between manual updates
- **Verdict**: Rejected — defeats the purpose of an automated data pipeline

### Option B: Migrate to API-Football (recommended)
- **Pros**: Full scorer data via `/fixtures/events`; richer match data (halftime scores, penalty shootout scores); all current features maintained; same rate limit (100 req/day); image/logo calls don't count toward quota; status endpoint is free
- **Cons**: Migration effort (~1-2 days); different response shapes require parser changes; league ID for WC 2026 needs verification; free tier may not have historical/pre-tournament data
- **Verdict**: **Accepted** — scorer data is worth the migration

### Option C: Dual-source (football-data.org + API-Football for events only)
- **Pros**: Minimal changes to existing pipeline; add events as supplemental call
- **Cons**: Two APIs to manage, two API keys, two rate limits to track, two failure modes; overall complexity increase; API-Football still needs 1 call per fixture for events — the `ids` batching is only useful if you're already using API-Football's fixture IDs
- **Verdict**: Rejected — adds complexity without reducing API-Football's per-fixture event cost

### Trade-off Matrix

| Dimension | Option A (Stay) | Option B (Migrate) | Option C (Dual) |
|-----------|----------------|-------------------|-----------------|
| Complexity | Low | Medium | High |
| Cost | $0 | $0 (free tier) | $0 |
| Scorer data | Manual only | Automated | Automated but fragile |
| Migration effort | None | ~1-2 days | ~0.5-1 day |
| Maintenance | Low | Medium | High (2 APIs) |
| Data completeness | Partial | Full | Full |
| Team familiarity | High | New — requires learning | New — requires learning |

---

## Endpoint Mapping

### API-Football League ID
FIFA World Cup is **league ID 1** in API-Football. Verification command:
```bash
curl -s "https://v3.football.api-sports.io/leagues?id=1&season=2026" \
  -H "x-apisports-key: YOUR_KEY"
```

The World Cup 2026 would be queried with `league=1&season=2026`.

### Current → API-Football Mapping

| Current (football-data.org) | API-Football v3 | Purpose |
|---|---|---|
| `/competitions/2000/matches` | `/fixtures?league=1&season=2026` | All match results, dates, venues |
| `/competitions/2000/standings` | `/standings?league=1&season=2026` | Group tables |
| *(not available)* | `/fixtures/events?fixture={ID}` | Goal scorers, cards, subs |
| *(not available)* | `/fixtures?ids=215662-215663-...` | Up to 20 fixtures with events inlined |

### API-Football Response Shapes vs. Our Data Model

#### Standings Response Shape
```json
{
  "response": [{
    "league": {
      "id": 1, "name": "World Cup", "season": 2026,
      "standings": [[
        {
          "rank": 1,
          "team": { "id": 10, "name": "Mexico", "logo": "..." },
          "points": 3,
          "goalsDiff": 2,
          "group": "Group A",
          "form": "W",
          "all": { "played": 1, "win": 1, "draw": 0, "lose": 0,
                   "goals": { "for": 2, "against": 0 } },
          "home": { "played": 0, "win": 0, "draw": 0, "lose": 0,
                    "goals": { "for": 0, "against": 0 } },
          "away": { "played": 1, "win": 1, "draw": 0, "lose": 0,
                    "goals": { "for": 2, "against": 0 } }
        }
      ]]
    }
  }]
}
```

**Field mapping to our `buildGroupStandings()` output:**
- `rank` → `pos`
- `team.id` → team lookup (needs new mapping, API-Football uses numeric team IDs, not TLAs)
- `team.name` → `team`
- `all.played` → `played`
- `all.win` → `w`
- `all.draw` → `d`
- `all.lose` → `l`
- `all.goals.for` → `gf`
- `all.goals.against` → `ga`
- `goalsDiff` → `gd`
- `points` → `pts`
- `group` → group letter (strip "Group " prefix)

**⚠ Critical difference**: API-Football uses **numeric team IDs** (e.g., `"id": 10` for Mexico), not Three-Letter Abbreviations (TLAs). Our current `TLA_TO_ID` mapping won't work. We need a `API_FB_TEAM_ID_TO_INTERNAL` mapping for all 48 teams.

#### Fixtures Response Shape
```json
{
  "response": [{
    "fixture": {
      "id": 123456,
      "date": "2026-06-11T14:00:00+00:00",
      "venue": { "id": 556, "name": "Estadio Azteca", "city": "Mexico City" },
      "status": { "long": "Match Finished", "short": "FT", "elapsed": 90 }
    },
    "league": { "id": 1, "name": "World Cup", "round": "Group Stage - 1" },
    "teams": {
      "home": { "id": 10, "name": "Mexico", "winner": true },
      "away": { "id": 153, "name": "South Africa", "winner": false }
    },
    "goals": { "home": 2, "away": 0 },
    "score": {
      "halftime": { "home": 1, "away": 0 },
      "fulltime": { "home": 2, "away": 0 },
      "extratime": { "home": null, "away": null },
      "penalty": { "home": null, "away": null }
    }
  }]
}
```

**Field mapping to our `buildGroupResults()`:**
- `fixture.status.short === 'FT'` (or `'AET'`, `'PEN'`) → `status: 'FINISHED'`
- `score.fulltime.home/away` → `score.fullTime.home/away` (we use camelCase `fullTime`)
- `teams.home.id` → numeric team ID lookup
- `fixture.venue.name + ', ' + fixture.venue.city` → venue string
- `goals.home/away` → final score

#### Fixtures/Events Response Shape (THE KEY ENDPOINT)
```json
{
  "response": [
    {
      "time": { "elapsed": 34, "extra": null },
      "team": { "id": 10, "name": "Mexico" },
      "player": { "id": 1234, "name": "H. Lozano" },
      "assist": { "id": 5678, "name": "R. Jiménez" },
      "type": "Goal",
      "detail": "Normal Goal",
      "comments": null
    },
    {
      "time": { "elapsed": 67, "extra": null },
      "team": { "id": 10, "name": "Mexico" },
      "player": { "id": 5678, "name": "R. Jiménez" },
      "assist": { "id": null, "name": null },
      "type": "Goal",
      "detail": "Penalty"
    }
  ]
}
```

**Mapping to our `scorers: string[]` format:**
```js
// Filter for type === "Goal" (includes Normal Goal, Own Goal, Penalty)
// Missed Penalty is type "Goal" with detail "Missed Penalty" — filter out
const scorers = events
  .filter(e => e.type === 'Goal' && e.detail !== 'Missed Penalty')
  .map(e => `${e.player.name} ${e.time.elapsed}'${e.detail === 'Penalty' ? ' (P)' : e.detail === 'Own Goal' ? ' (OG)' : ''}`);
// Result: ["H. Lozano 34'", "R. Jiménez 67' (P)"]
```

---

## Data Model Comparison

### What Stays the Same
- `tournament` object structure — unchanged
- `groups[G].standings[]` — field names change (see mapping above) but shape is same
- `teams[].path` — bracket routing is hardcoded in our script, not dependent on API
- `teams[].advanceProbabilities` — Polymarket is the source, unchanged
- `teams[].possibleOpponents` — derived from standings, unchanged logic

### What Changes
| Aspect | football-data.org | API-Football |
|--------|-------------------|--------------|
| Team identification | TLA strings (e.g., `"MEX"`) | Numeric IDs (e.g., `10`) |
| Team name format | Simple names | Names may include accented chars |
| Match status | `"FINISHED"`, `"SCHEDULED"` | `"FT"`, `"AET"`, `"PEN"`, `"NS"`, etc. |
| Score format | `fullTime`, `halfTime`, `extraTime`, `penalties` (camelCase) | `halftime`, `fulltime`, `extratime`, `penalty` (lowercase) |
| Standings grouping | `s.group.replace('Group ', '')` | `league.standings[0][0].group` — also "Group X" |
| Scorers | **Not available** | Available via `/fixtures/events` |
| Venue data | Already in match data | `fixture.venue.name`, `fixture.venue.city` |
| Halftime scores | Available | Available (richer — also extratime, penalty) |

---

## API Call Budget on Free Tier (100 req/day)

### Strategy: Batch fixtures by IDs for events inclusion

API-Football has a critical efficiency feature: when you query fixtures by specific IDs (up to 20 per call), events are **inlined in the response**. This means we don't need separate `/fixtures/events` calls.

```bash
# 1 call: Gets standings for all 12 groups
curl "https://v3.football.api-sports.io/standings?league=1&season=2026" \
  -H "x-apisports-key: KEY"

# 4 calls: All 72 group matches with events inlined (20+20+20+12)
curl "https://v3.football.api-sports.io/fixtures?ids=1001-1002-...1020" \
  -H "x-apisports-key: KEY"
```

### Daily Budget During Group Stage

| Call | Endpoint | Count | Purpose |
|------|----------|-------|---------|
| 1 | `/standings?league=1&season=2026` | 1 | All 12 group tables |
| 2-5 | `/fixtures?ids=...` (batched ×20) | 4 | All 72 group matches + events |
| 6+ | Polymarket slugs | ~12 | Market probabilities |
| **Total** | | **~17** | **83 remaining for headroom** |

### Daily Budget During Knockout Stage (R32 onward)

| Call | Endpoint | Count | Purpose |
|------|----------|-------|---------|
| 1 | `/standings?league=1&season=2026` | 1 | Standings (may be final) |
| 2 | `/fixtures?live=all` | 1 | Live matches with events |
| 3 | Polymarket slugs | ~12 | Market probabilities |
| **Total** | | **~14** | **86 remaining** |

### Quiet Days (no matches)
| Call | Endpoint | Count |
|------|----------|-------|
| 1 | `/status` | 0 (free) |
| 2 | Polymarket slugs | ~12 |
| | **Total** | **~12** |

The 100 req/day budget is **comfortably sufficient** for all tournament phases.

---

## Migration Plan

### Phase 1: Discovery & Verification (30 min)
1. Register free API key at [dashboard.api-football.com](https://dashboard.api-football.com/register)
2. Verify World Cup 2026 league ID:
   ```bash
   curl -s "https://v3.football.api-sports.io/leagues?season=2026&current=true" \
     -H "x-apisports-key: $KEY" | jq '.response[] | select(.name | test("World Cup"))'
   ```
3. Fetch actual fixtures to verify response shapes match documented format
4. Build the `API_FB_TEAM_ID_TO_INTERNAL` mapping by cross-referencing team names

### Phase 2: New Fetch Functions in `update-data.js` (2-3 hours)
1. Add `AF_BASE`, `AF_KEY`, `AF_HEADERS` config
2. Write `fetchStandingsAF()` — replaces `fetchStandings()`, maps response to our format
3. Write `fetchFixturesWithEventsAF()` — fetches all fixtures in batches of 20 IDs, inlines events
4. Write `parseEventsToScorers(events, teamId)` — converts event objects to our `"Name 34'"` format
5. Write `validateFixturesResponseAF()` — validates the new response shape
6. Add numeric team ID mapping (new constant `AF_TEAM_ID_TO_INTERNAL_ID`)

### Phase 3: Modify `buildGroupResults()` (1 hour)
- Accept events-scorers map (keyed by fixture ID → team ID → scorer strings)
- Replace carry-forward logic with fresh scorer data from API
- Keep the fallback to carry-forward when API is unavailable

### Phase 4: Environment & Config (30 min)
- Add `API_FOOTBALL_KEY` to env vars (alongside existing `FOOTBALL_DATA_KEY`)
- Graceful fallback: if `API_FOOTBALL_KEY` is missing, use football-data.org
- This enables a gradual cutover with zero-downtime

### Phase 5: Remove football-data.org dependency (30 min)
- Once verified stable, remove `FD_BASE`, `FD_KEY`, `FD_HEADERS` config
- Remove `fetchMatches()`, `fetchStandings()` old functions
- Update documentation

### Phase 6: Testing (1 hour)
- Write unit tests for the new response parsers
- Test the events→scorers transformation
- Test edge cases: own goals, penalties, missed penalties, VAR-cancelled goals

**Total estimated effort: ~1-2 days**

---

## Risk Assessment

### Risk 1: World Cup 2026 not yet listed on free tier ⚠ MEDIUM
**Mitigation**: Verify with the `/leagues?season=2026` endpoint before writing any code. If WC 2026 isn't yet available, the API may add it closer to the tournament. Fallback: keep football-data.org until API-Football has WC 2026 data.

### Risk 2: Team ID mapping brittleness ⚠ MEDIUM
API-Football uses numeric IDs (e.g., Mexico = 10). If their team IDs differ from what we expect, the mapping will break.  
**Mitigation**: Build the mapping by querying `/teams?league=1&season=2026` and matching by team name to our `ALL_TEAMS` array. Include a validation step that flags any unmapped teams.

### Risk 3: Events coverage may vary by competition ⚠ LOW
The docs note: "The coverage of a competition can vary from season to season and values set to `True` do not guarantee 100% data availability." World Cup is the premier competition — coverage is near-certain for events, but it's worth verifying.  
**Mitigation**: Check the `coverage` field in the leagues response for WC 2026 before committing.

### Risk 4: Rate limit on free tier may be stricter during tournament ⚠ LOW
API-Football also imposes per-minute rate limits (`X-RateLimit-Limit`, `X-RateLimit-Remaining` response headers).  
**Mitigation**: Our batched approach (max 5 API calls per run) is well within any reasonable per-minute limit. Add delay between batches if needed.

### Risk 5: Data loss during migration ⚠ LOW
If we cut over and the API-Football data is incomplete, we lose data.  
**Mitigation**: Phase 4's dual-key approach means we can fall back to football-data.org by simply not setting `API_FOOTBALL_KEY`. Also, our carry-forward logic preserves existing scorer data if the new API is unavailable.

### Risk 6: Player name format differences ⚠ LOW
API-Football returns names like `"H. Lozano"` (initial + surname) or `"Federico Andrada"` (full name). This may differ from what users expect.  
**Mitigation**: This is acceptable — any player name is better than empty `scorers: []`. We can apply name formatting later if needed.

---

## Consequences

### What Becomes Easier
- **Goal scorer data is automated** — the primary driver for this change
- **Richer match data** — halftime scores, extratime scores, penalty shootout scores all available
- **Better status granularity** — `AET`, `PEN`, `HT`, `1H`, `2H` instead of just `FINISHED`/`SCHEDULED`
- **Free status endpoint** — can monitor API health without consuming quota
- **Player images** — available for potential future use (player headshots in scorer display)

### What Becomes Harder
- **Team identification** — numeric IDs instead of human-readable TLAs means we need and maintain a 48-entry mapping table
- **Response parsing** — two different response shapes to handle (nested standings, richer fixture objects)
- **Initial setup** — need to register, verify league IDs, build team ID mapping before any code works

### What Needs Revisiting
- `TLA_TO_ID` mapping → becomes `AF_TEAM_ID_TO_INTERNAL_ID` (numeric → internal)
- `validateStandingsResponse()` → new shape validation
- `validateMatchesResponse()` → new shape validation
- `buildGroupResults()` → scorer injection from events instead of carry-forward only
- `fetchActiveTeamIds()` → uses `/fixtures` with date filter; API-Football supports `from`/`to` params identically

---

## Action Items

- [ ] Register free API-Football key at [dashboard.api-football.com](https://dashboard.api-football.com/register)
- [ ] Verify WC 2026 league ID: `curl -s "https://v3.football.api-sports.io/leagues?season=2026&current=true" -H "x-apisports-key: $KEY" | jq '.response[] | select(.name | test("World Cup"))'`
- [ ] Verify coverage: check `coverage.events` is `true` for WC 2026
- [ ] Fetch actual standings + fixtures to validate documented response shapes
- [ ] Build `AF_TEAM_ID_TO_INTERNAL_ID` mapping (48 entries) by matching names from `/teams?league=1&season=2026`
- [ ] Implement `fetchStandingsAF()` with shape validation
- [ ] Implement `fetchFixturesWithEventsAF()` with ID batching (20 per call)
- [ ] Implement `parseEventsToScorers()` — filter Goal events, format `"Name 34'"` strings
- [ ] Add `API_FOOTBALL_KEY` env var with graceful fallback to football-data.org
- [ ] Preserve carry-forward logic as fallback when API-Football is unavailable
- [ ] Add response validators for new shapes
- [ ] Write tests for event parsing, scorer formatting, and batching logic
- [ ] Remove football-data.org dependency once stable (not before 1 week of stable runs)
- [ ] Update `scripts/update-data.js` file header to document new API source
