#!/usr/bin/env node
/**
 * update-data.js — Road to the Final · Smart Data Refresh
 * ─────────────────────────────────────────────────────────
 * Designed to run hourly via GitHub Actions with minimal API usage.
 * Only fully recalculates teams that played today or yesterday.
 * All other teams carry forward existing data unchanged.
 *
 * Writes:
 *   public/data/world-cup-2026.json           ← always-current live data
 *   public/data/snapshots/YYYY-MM-DD.json     ← one snapshot per day (overwritten)
 *   public/data/snapshots/manifest.json       ← index of available snapshots
 *
 * Usage:
 *   node scripts/update-data.js
 *
 * Data sources: ESPN (scores, standings, scorers, cards), Polymarket (probabilities).
 * Requires Node 18+ (built-in fetch). No npm dependencies needed for the script.
 */

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { fileURLToPath, pathToFileURL } from 'url'

import { TEAMS as ALL_TEAMS } from './lib/teams.js'
import { STAGE_ORDER, GROUP_LETTERS } from './lib/tournament.js'
import {
	calcProbs,
	calcProbsFallback,
	diffRating,
	diffLabel,
	diffColor,
} from './lib/probabilities.js'
import {
	computeStandings,
	buildGroupStandings,
	buildGroupResults,
	injectScorers,
	injectCards,
} from './lib/standings.js'
import {
	buildPath,
	buildOpponents,
	buildR16Opponents,
	validateBracketPaths,
} from './lib/bracket.js'
import {
	canStillFinishTop3,
	determineCurrentStage,
} from './lib/elimination.js'
import { validateAppData } from './lib/validate.js'
import { buildActualBracket } from './lib/actualBracket.js'
import { deriveLivePath, derivePossibleOpponents } from './lib/livePath.js'
import { computeTotalGoals } from './lib/teamStats.js'
import { log } from './lib/fetchUtil.js'
import { fetchESPNEventDetails, normalizeESPNCalendarDates, fetchESPNBracketStructure } from './lib/espn.js'
import { fetchPolymarketAll, attachMatchupOdds } from './lib/polymarket.js'

// ─── Paths ───────────────────────────────────────────────────────────────────
const __filename = fileURLToPath(import.meta.url)
const __dirname  = path.dirname(__filename)
const ROOT       = path.join(__dirname, '..')
const LIVE_PATH     = path.join(ROOT, 'public', 'data', 'world-cup-2026.json')
const VERSION_PATH  = path.join(ROOT, 'public', 'data', 'version.json')
const SNAP_DIR      = path.join(ROOT, 'public', 'data', 'snapshots')
const MF_PATH       = path.join(SNAP_DIR, 'manifest.json')


function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function fmtLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}


// ─── Load existing live data (for carry-forward) ──────────────────────────────
function loadExisting() {
  if (fs.existsSync(LIVE_PATH)) {
    try { return JSON.parse(fs.readFileSync(LIVE_PATH, 'utf8')); } catch { /* parsing failed */ }
  }
  return null;
}




function isSingleGroupDegraded(groupData) {
  // A group is degraded if it has no win probabilities at all.
  // When using market (Polymarket) data, win probabilities are tournament-level
  // and may sum to very little — that's valid, not degraded.
  if (!groupData?.winProbabilities) return true;
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Road to the Final — Data Update ===');
  ensure(path.join(ROOT, 'public', 'data'));
  ensure(SNAP_DIR);

  validateBracketPaths();

  const existing   = loadExisting();

  // Polymarket + ESPN always run (no API key needed for either)
  const polyData = await fetchPolymarketAll();

  const TOURNAMENT_START_ESPN = '2026-06-11';
  const TOURNAMENT_END_ESPN   = '2026-07-19'; // full tournament through the Final
  const { matches: espnMatches, scorers: espnScorers, cards: espnCards, activeTeams: espnActiveTeams, bracketEvents: espnBracketEvents }
    = await fetchESPNEventDetails(TOURNAMENT_START_ESPN, TOURNAMENT_END_ESPN);

  // Authoritative bracket structure from ESPN's bracket page — used to
  // correctly map R32 events to FIFA bracket position and to resolve R16+
  // feeder pairings (which the scoreboard endpoint can't be trusted for).
  const espnBracketStructure = await fetchESPNBracketStructure();

  // Normalize all ESPN UTC dates to local venue dates
  normalizeESPNCalendarDates(espnMatches, espnScorers, espnCards);

  const activeIds  = espnActiveTeams;
  const hasActive  = activeIds.size > 0;

  log(`Active teams today/yesterday: ${hasActive ? activeIds.size : 'none — carrying forward all team data'}`);

  if (!Object.keys(polyData.winner || {}).length && !Object.keys(polyData.r32 || {}).length)
    log('⚠  No Polymarket data returned — API may be unavailable');

  // Compute standings directly from ESPN match data (no separate API call)
  const rawStandings = computeStandings(espnMatches);

  log(`ESPN standings: ${Object.keys(rawStandings).length} groups | ESPN matches: ${espnMatches.size} | Polymarket: ${Object.keys(polyData.winner || {}).length} winner + ${Object.keys(polyData.group || {}).length} group + ${Object.keys(polyData.r32 || {}).length} R32 teams`);

  // Build group data — per-group carry-forward for healthy groups
  const groupsData = {};
  const existingGroups = existing?.groups || {};

  for (const g of GROUP_LETTERS) {
    const existingGroup = existingGroups[g];

    if (hasActive && Object.keys(rawStandings).length > 0) {
      // Fresh ESPN data: always rebuild from standings
      const standArr = buildGroupStandings(g, rawStandings);
      const winProbs = {};
      standArr.forEach(s => {
        // Use Polymarket group winner data directly, fallback to existing or 0
        winProbs[s.teamId] = polyData.group?.[s.teamId]
          ?? existingGroup?.winProbabilities?.[s.teamId]
          ?? 0;
      });
      groupsData[g] = { standings: standArr, winProbabilities: winProbs };
    } else if (existingGroup && !isSingleGroupDegraded(existingGroup)) {
      // Quiet day with healthy existing data: carry forward but refresh
      // Polymarket group win probabilities (market odds change independently)
      const refreshed = { ...existingGroup };
      if (Object.keys(polyData.group || {}).length > 0) {
        const updatedWinProbs = { ...existingGroup.winProbabilities };
        for (const tid of Object.keys(updatedWinProbs)) {
          if (typeof polyData.group[tid] === 'number') {
            updatedWinProbs[tid] = polyData.group[tid];
          }
        }
        refreshed.winProbabilities = updatedWinProbs;
      }
      groupsData[g] = refreshed;
    } else {
      // No existing data or degraded: rebuild with available market data
      const standArr = buildGroupStandings(g, rawStandings);
      const winProbs = {};
      standArr.forEach(s => {
        winProbs[s.teamId] = polyData.group?.[s.teamId] ?? 0;
      });
      groupsData[g] = { standings: standArr, winProbabilities: winProbs };
    }
  }

  if (!hasActive || !Object.keys(rawStandings).length) {
    const carried = GROUP_LETTERS.filter(g => existingGroups[g] && !isSingleGroupDegraded(existingGroups[g])).length;
    log(`No new standings — carrying forward ${carried}/12 healthy groups`);
  }

  // Build team data — full recalc for active teams, smart carry-forward for others
  const teams = ALL_TEAMS.map(t => {
    const existingTeam = existing?.teams?.find(e => e.id === t.id);
    const isActive = hasActive && activeIds.has(t.id);

    // Group elimination: in the 48-team World Cup format, top 2 + 8 best 3rds
    // advance, so a team is mathematically locked out only when guaranteed 4th.
    // Brute-force simulate remaining match outcomes; if no scenario has this
    // team finishing top 3, they're definitively out. Polymarket=0% (below)
    // handles the more nuanced "can finish 3rd but won't make the wildcard 8".
    let eliminated = false;
    if (rawStandings?.[t.group]) {
      eliminated = !canStillFinishTop3(t.id, t.group, rawStandings, espnMatches);
    }
    // Polymarket signal: r32=0 means the market resolved against the team.
    if (typeof polyData.r32?.[t.id] === 'number' && polyData.r32[t.id] === 0) {
      eliminated = true;
    }

    // Knockout stage detection — only when tournament has knockout data
    const stageResult = determineCurrentStage(t.id, t.group, rawStandings, espnMatches);
    const stage = stageResult?.stage ?? 'group_stage';
    if (stageResult?.eliminated) {
      eliminated = true;
    }

    if (!isActive && existingTeam) {
      // Carry forward but always recalculate advance probabilities with fresh
      // Polymarket data (market odds change independently of match results)
      const hasFreshPoly = typeof polyData.r32?.[t.id] === 'number'
        || typeof polyData.r16?.[t.id] === 'number'
        || typeof polyData.qf?.[t.id] === 'number'
        || typeof polyData.sf?.[t.id] === 'number'
        || typeof polyData.final?.[t.id] === 'number'
        || typeof polyData.winner?.[t.id] === 'number';
      const teamAdvP = hasFreshPoly
        ? calcProbs(t.id, t.group, rawStandings, polyData, existingTeam.advanceProbabilities)
        : existingTeam.advanceProbabilities;

      // Carry forward but always update computed fields if standings exist
      if (Object.keys(rawStandings).length > 0) {
        const teamPath = buildPath(t.id, t.group, rawStandings);
        const possibleOpps = buildOpponents(t.id, t.group, teamPath.r32?.opponentDesc ?? '', teamPath.r16?.opponentDesc ?? '', rawStandings);
        return {
          ...existingTeam,
          eliminated,
          currentStage: stage,
          advanceProbabilities: teamAdvP,
          path: teamPath,
          possibleOpponents: possibleOpps,
          groupResults: injectCards(
            injectScorers(
              buildGroupResults(t.id, t.group, espnMatches, existingTeam.groupResults || []),
              espnScorers[t.id]
            ),
            espnCards[t.id]
          ),
        };
      }
      return {
        ...existingTeam,
        eliminated,
        currentStage: stage,
        advanceProbabilities: teamAdvP,
        groupResults: injectCards(
          injectScorers(
            buildGroupResults(t.id, t.group, espnMatches, existingTeam.groupResults || []),
            espnScorers[t.id]
          ),
          espnCards[t.id]
        ),
      };
    }

    // Full recalculation
    const existingGroupResults = existingTeam?.groupResults || []
    const groupResults  = injectCards(
      injectScorers(
        buildGroupResults(t.id, t.group, espnMatches, existingGroupResults),
        espnScorers[t.id]
      ),
      espnCards[t.id]
    )

    // Preserve existing market-sourced probabilities when Poly is unavailable
    const existingHadMarket = existingTeam?.advanceProbabilities?.source === 'market';
    const hasFreshPoly = typeof polyData.r32?.[t.id] === 'number'
      || typeof polyData.r16?.[t.id] === 'number'
      || typeof polyData.qf?.[t.id] === 'number'
      || typeof polyData.sf?.[t.id] === 'number'
      || typeof polyData.final?.[t.id] === 'number'
      || typeof polyData.winner?.[t.id] === 'number';
    const teamAdvanceProbs = existingHadMarket && !hasFreshPoly
      ? existingTeam.advanceProbabilities
      : calcProbs(t.id, t.group, rawStandings, polyData, existingTeam?.advanceProbabilities);

    const teamPath      = buildPath(t.id, t.group, rawStandings);
    const possibleOpps  = buildOpponents(t.id, t.group, teamPath.r32?.opponentDesc ?? '', teamPath.r16?.opponentDesc ?? '', rawStandings);

    return {
      id: t.id, name: t.name, flag: t.flag,
      group: t.group, confederation: t.confederation, fifaRank: t.fifaRank,
      eliminated,
      currentStage: stage,
      groupResults,
      advanceProbabilities: teamAdvanceProbs,
      path: teamPath,
      possibleOpponents: possibleOpps,
    };
  }).filter(Boolean);

  log(`Built data for ${teams.length} teams (${hasActive ? activeIds.size + ' fully recalculated' : 'all carried forward'})`);

  // Build dailyMatches from espnMatches (enriched with team names/flags)
  const dailyMatches = {};
  for (const [key, match] of espnMatches) {
    const [homeId, awayId] = key.split(':');
    const homeTeam = ALL_TEAMS.find(t => t.id === homeId);
    const awayTeam = ALL_TEAMS.find(t => t.id === awayId);
    const date = match.date;
    if (!dailyMatches[date]) dailyMatches[date] = [];
    dailyMatches[date].push({
      homeTeam: homeTeam?.name || homeId,
      homeFlag: homeTeam?.flag || '🏳️',
      homeId: homeId,
      awayTeam: awayTeam?.name || awayId,
      awayFlag: awayTeam?.flag || '🏳️',
      awayId: awayId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      homeShootout: match.homeShootout ?? undefined,
      awayShootout: match.awayShootout ?? undefined,
      status: match.status,
      date: match.date,
      clock: match.clock || undefined,
      broadcasts: match.broadcasts?.length ? match.broadcasts : undefined,
      time: match.time || undefined,
      venue: match.venue || undefined,
    });
  }
  log(`Daily matches: ${Object.keys(dailyMatches).length} dates, ${Object.values(dailyMatches).reduce((s, a) => s + a.length, 0)} matches`);

  await attachMatchupOdds(dailyMatches, existing);

  // ── Overlay path + possibleOpponents from actualBracket ─────────────────
  // Once the tournament has produced real knockout matchups (which often
  // diverge from the static BRACKET_PATHS prediction), the per-team path
  // venue/date/opponent must come from observed ESPN data — not from the
  // static guess. See scripts/lib/livePath.js for full rationale.
  const actualBracket = buildActualBracket(dailyMatches, espnBracketEvents, espnBracketStructure, existing?.actualBracket);
  for (const t of teams) {
    if (!t) continue;
    t.path = deriveLivePath(t, actualBracket, t.path);
    t.possibleOpponents = derivePossibleOpponents(t, actualBracket);
    t.totalGoals = computeTotalGoals(t, actualBracket);
  }
  log(`Overlaid path + possibleOpponents from actualBracket (r32:${actualBracket.r32.length} r16:${actualBracket.r16.length} qf:${actualBracket.qf.length} sf:${actualBracket.sf.length} final:${actualBracket.final.length})`);

  // Assemble output
  const today = todayStr();
  const now   = new Date().toISOString();

  // Determine overall tournament stage from team data
  const tournamentStage = teams.some(t => t.currentStage === 'final')
    ? 'final'
    : teams.some(t => ['qf', 'sf', 'final'].includes(t.currentStage))
      ? teams.find(t => ['qf', 'sf', 'final'].includes(t.currentStage))?.currentStage ?? 'group_stage'
      : teams.some(t => t.currentStage === 'r16') ? 'r16'
        : teams.some(t => t.currentStage === 'r32') ? 'r32'
          : 'group_stage';

  const stageStatuses = {};
  for (const s of STAGE_ORDER) {
    const idx = STAGE_ORDER.indexOf(s);
    const tIdx = STAGE_ORDER.indexOf(tournamentStage);
    stageStatuses[s] = idx < tIdx ? 'done' : idx === tIdx ? 'active' : 'upcoming';
  }

  const output = {
    lastUpdated:  now,
    snapshotDate: today,
    isHistorical: false,
    sourceSummary: (() => {
      const s = { dataSource: 'ESPN', market: 0, calculated: 0 };
      for (const t of teams) {
        if (t.advanceProbabilities?.source === 'market') s.market++;
        else s.calculated++;
      }
      return s;
    })(),
    tournament: {
      name:         'FIFA World Cup 2026',
      currentStage: tournamentStage,
      stages: {
        group_stage: { status: stageStatuses.group_stage ?? 'active',   label:'Group Stage', date:'Jun 11–27' },
        r32:         { status: stageStatuses.r32         ?? 'upcoming', label:'Round of 32', date:'Jun 28–Jul 2' },
        r16:         { status: stageStatuses.r16         ?? 'future',   label:'Round of 16', date:'Jul 4–7' },
        qf:          { status: stageStatuses.qf          ?? 'future',   label:'Quarterfinal',date:'Jul 9–11' },
        sf:          { status: stageStatuses.sf          ?? 'future',   label:'Semifinal',   date:'Jul 14–15' },
        final:       { status: stageStatuses.final       ?? 'future',   label:'The Final',   date:'Jul 19' },
      },
    },
    groups: groupsData,
    teams,
    dailyMatches,
    actualBracket,
  };

  // Hard-fail BEFORE writing if the output drifted from the expected schema.
  // Cheap insurance against shipping a JSON shape the client can't parse.
  validateAppData(output);
  log('✅ Schema validation passed');

  // Write live file
  const liveJson = JSON.stringify(output, null, 2);
  fs.writeFileSync(LIVE_PATH, liveJson);
  log(`✅ Live data → ${LIVE_PATH}`);

  // ── Version sidecar ─────────────────────────────────────────────────────
  // A tiny file the client can poll cheaply (~80 bytes vs ~100KB) to decide
  // whether to refetch the heavy JSON. Lets the CDN cache the main file
  // normally and removes the cache-busting query string from useData.
  const contentHash = crypto.createHash('sha256').update(liveJson).digest('hex').slice(0, 16);
  fs.writeFileSync(VERSION_PATH, JSON.stringify({ lastUpdated: now, hash: contentHash }, null, 2));
  log(`✅ Version sidecar → ${VERSION_PATH} (hash=${contentHash})`);

  // ── Immutable end-of-Pacific-day snapshots ────────────────────────────────
  // Snapshot files are written once per past PT date (yesterday or earlier)
  // and never overwritten. This guarantees the historical view reflects the
  // actual end-of-day state, not an arbitrary mid-day GHA capture.
  const todayPT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const yesterdayPT = (() => {
    const d = new Date(todayPT + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const snapPath = path.join(SNAP_DIR, `${yesterdayPT}.json`);
  let snapshotWritten = false;
  if (!fs.existsSync(snapPath)) {
    fs.writeFileSync(snapPath, JSON.stringify({ ...output, snapshotDate: yesterdayPT, isHistorical: true }));
    log(`✅ Snapshot → ${snapPath} (first write, immutable)`);
    snapshotWritten = true;
  } else {
    log(`Snapshot for ${yesterdayPT} already exists, skipping (immutable end-of-day artifact)`);
  }

  // Update manifest only if we just added a new snapshot OR labels are stale
  if (snapshotWritten || !fs.existsSync(MF_PATH)) {
    const mf = fs.existsSync(MF_PATH)
      ? JSON.parse(fs.readFileSync(MF_PATH, 'utf8'))
      : { available: [], labels: {} };

    if (!mf.available.includes(yesterdayPT)) {
      mf.available.push(yesterdayPT);
      mf.available.sort();
    }

    // Build human-readable labels
    mf.available.forEach((d, i) => {
      const isLatest = i === mf.available.length - 1;
      const isEarliest = i === 0;
      mf.labels[d] = isLatest
        ? `${fmtLabel(d)} (Latest)`
        : isEarliest
          ? `${fmtLabel(d)} (Pre-tournament)`
          : fmtLabel(d);
    });

    mf.earliest  = mf.available[0];
    mf.latest    = mf.available[mf.available.length - 1];
    mf.generated = now;

    fs.writeFileSync(MF_PATH, JSON.stringify(mf, null, 2));
    log(`✅ Manifest → ${mf.available.length} snapshots`);
  }
  log('=== Done ===');
}

// Run as a script when invoked directly (skip when imported by tests).
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	main().catch(err => { console.error('Fatal:', err); process.exit(1) })
}

// Test back-compat: re-export the formerly inline pure functions so the
// existing scripts/update-data.test.js still imports them from here.
export {
	calcProbs,
	calcProbsFallback,
	diffRating,
	diffLabel,
	diffColor,
	buildOpponents,
	buildR16Opponents,
}
export { R32_MATCH_TO_POSITIONS } from './lib/tournament.js'
