# Fixes: Nav Links, Live Scores, Next Match LIVE, Broadcasts

## Fix 1: Nav Section Links (src/components/Nav.tsx)

**Problem**: `<a href="#hero">` etc. only work on team page where DOM elements exist.

**Solution**: Convert to `<button>` with onClick handler that:
- If `view !== 'team'`: call `onViewChange('team')`, then `setTimeout(() => scroll, 50)`
- If `view === 'team'`: scroll immediately

**Contract**:
- `Nav` already receives `view` and `onViewChange` — no prop changes needed
- Section IDs: `hero`, `road`, `groups`, `opponents`, `schedule`, `squad` — all confirmed existing

## Fix 2: GroupStage Live Scores

**Problem**: Team mode GroupStage matches use `team.groupResults` (30-min pipeline). No live polling.

**Solution**: Option A — add optional `liveData` prop to team mode MatchCard.

**Data flow**:
```
useLiveScores(dailyMatches, teams, isHistorical) → Map<"homeId:awayId", LiveMatchPatch>
                                                          ↓
GroupStage: for each groupResult, find opponent ID → lookup patch → compute team-perspective score
                                                          ↓
MatchCard (team mode): if liveData present → override score, clock, isLive
```

**Contract changes**:
- `TeamMatchCardProps` adds: `liveData?: { score: string; clock: string; status: 'IN_PROGRESS' | 'FINISHED' }`
- `GroupStage` calls `useLiveScores(data.dailyMatches ?? {}, data.teams, data.isHistorical)` — this reuses the existing hook which activates when today's dailyMatches has IN_PROGRESS matches

## Fix 3a: Next Match LIVE State

**Problem**: Hero's Next Match card uses `useTeamRecord` which fetches once, no live state detection.

**Solution**: In `useTeamRecord`, extract `status.type.state` from `nextEvent[0].competitions[0]`. If state === 'in', extract score and clock.

**Contract changes**:
- `NextEvent` adds: `isLive: boolean; clock?: string; score?: string`
- Hero shows LIVE badge + score when `nextEvent.isLive`

## Fix 3b: Broadcasts on All Match Cards

**Problem**: ESPN `broadcasts` data is in the API response but not plumbed through to `dailyMatches` or match cards.

**Solution**:
1. Pipeline: extract broadcasts from `competition.broadcasts[]` into `espnMatches` match objects
2. Pipeline: pass broadcasts into `dailyMatches` entries
3. Types: add `broadcasts?: string[]` to `DailyMatch`
4. HomePage enrich: pass broadcasts through
5. MatchCard neutral mode: show broadcasts (below score, same style as Next Match card in Hero)

**Data format**: `string[]` — e.g., `["FOX", "Telemundo", "Peacock"]`

---

## Implementation Plan

### Step 1: Fix Nav Links
**Agent**: Fred
**File**: `src/components/Nav.tsx`
- Add `handleSectionClick(id: string)` — scrolls to element, navigates to team if needed
- Replace 6 `<a>` with `<button>`

### Step 2: Fix Live Scores for GroupStage
**Files**: `src/components/GroupStage.tsx`, `src/components/groups/MatchCard.tsx`
- Add `liveData` to `TeamMatchCardProps`
- GroupStage uses `useLiveScores` and passes patches to MatchCard
- MatchCard team mode uses liveData when present

### Step 3: Next Match LIVE State
**Files**: `src/hooks/useTeamRecord.ts`, `src/components/Hero.tsx`
- Extract status, clock, score from nextEvent
- Add isLive detection
- Hero shows LIVE state

### Step 4: Broadcasts Pipeline
**File**: `scripts/update-data.js`
- Extract broadcasts in `fetchESPNEventDetails`
- Store in `espnMatches` and `dailyMatches`

### Step 5: Broadcasts Types + MatchCard
**Files**: `src/types.ts`, `src/components/HomePage.tsx`, `src/components/groups/MatchCard.tsx`
- Add `broadcasts` to `DailyMatch` type
- Pass through `enrich`
- Display in MatchCard neutral mode

### Step 6: Verify
```bash
npx eslint src/ scripts/ --max-warnings=0 && npm test && npm run build
```
