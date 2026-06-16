#!/usr/bin/env node
/**
 * repair-historical-snapshots.js — Backfill dailyMatches + fix standings
 * ───────────────────────────────────────────────────────────────────────────
 * Problem: Jun 10-15 snapshots are missing `dailyMatches` and have stale/inaccurate
 * standings (all identical, showing future match results). This script repairs them
 * using the Jun 16 snapshot (real ESPN data) as the source of truth for match scores.
 *
 * For each snapshot (Jun 10-15):
 *   1. Builds dailyMatches from GROUP_SCHEDULE template
 *   2. Fills in real scores from Jun 16 snapshot for matches already played
 *   3. Rebuilds group standings counting only matches played by snapshot date
 *   4. Rebuilds team groupResults showing only results from played matches
 *   5. Preserves existing advanceProbabilities, path, and other data
 *   6. Idempotent — safe to run multiple times
 *
 * Usage: node scripts/repair-historical-snapshots.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const SNAP_DIR = path.join(ROOT, 'public', 'data', 'snapshots');
const LIVE_PATH = path.join(ROOT, 'public', 'data', 'world-cup-2026.json');

// ─── All 48 teams (must match update-data.js ALL_TEAMS) ────────────────────
const ALL_TEAMS = [
  { id:'mexico',      name:'Mexico',         flag:'🇲🇽', group:'A' },
  { id:'southafrica', name:'South Africa',   flag:'🇿🇦', group:'A' },
  { id:'southkorea',  name:'South Korea',    flag:'🇰🇷', group:'A' },
  { id:'czechia',     name:'Czechia',        flag:'🇨🇿', group:'A' },
  { id:'canada',      name:'Canada',         flag:'🇨🇦', group:'B' },
  { id:'bosnia',      name:'Bosnia & Herz.', flag:'🇧🇦', group:'B' },
  { id:'qatar',       name:'Qatar',          flag:'🇶🇦', group:'B' },
  { id:'switzerland', name:'Switzerland',    flag:'🇨🇭', group:'B' },
  { id:'brazil',      name:'Brazil',         flag:'🇧🇷', group:'C' },
  { id:'morocco',     name:'Morocco',        flag:'🇲🇦', group:'C' },
  { id:'haiti',       name:'Haiti',          flag:'🇭🇹', group:'C' },
  { id:'scotland',    name:'Scotland',       flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', group:'C' },
  { id:'usa',         name:'USA',            flag:'🇺🇸', group:'D' },
  { id:'paraguay',    name:'Paraguay',       flag:'🇵🇾', group:'D' },
  { id:'australia',   name:'Australia',      flag:'🇦🇺', group:'D' },
  { id:'turkey',      name:'Türkiye',        flag:'🇹🇷', group:'D' },
  { id:'germany',     name:'Germany',        flag:'🇩🇪', group:'E' },
  { id:'curacao',     name:'Curaçao',        flag:'🇨🇼', group:'E' },
  { id:'ivorycoast',  name:'Ivory Coast',    flag:'🇨🇮', group:'E' },
  { id:'ecuador',     name:'Ecuador',        flag:'🇪🇨', group:'E' },
  { id:'netherlands', name:'Netherlands',    flag:'🇳🇱', group:'F' },
  { id:'japan',       name:'Japan',          flag:'🇯🇵', group:'F' },
  { id:'sweden',      name:'Sweden',         flag:'🇸🇪', group:'F' },
  { id:'tunisia',     name:'Tunisia',        flag:'🇹🇳', group:'F' },
  { id:'belgium',     name:'Belgium',        flag:'🇧🇪', group:'G' },
  { id:'egypt',       name:'Egypt',          flag:'🇪🇬', group:'G' },
  { id:'iran',        name:'Iran',           flag:'🇮🇷', group:'G' },
  { id:'newzealand',  name:'New Zealand',    flag:'🇳🇿', group:'G' },
  { id:'spain',       name:'Spain',          flag:'🇪🇸', group:'H' },
  { id:'capeverde',   name:'Cape Verde',     flag:'🇨🇻', group:'H' },
  { id:'saudiarabia', name:'Saudi Arabia',   flag:'🇸🇦', group:'H' },
  { id:'uruguay',     name:'Uruguay',        flag:'🇺🇾', group:'H' },
  { id:'france',      name:'France',         flag:'🇫🇷', group:'I' },
  { id:'senegal',     name:'Senegal',        flag:'🇸🇳', group:'I' },
  { id:'iraq',        name:'Iraq',           flag:'🇮🇶', group:'I' },
  { id:'norway',      name:'Norway',         flag:'🇳🇴', group:'I' },
  { id:'argentina',   name:'Argentina',      flag:'🇦🇷', group:'J' },
  { id:'algeria',     name:'Algeria',        flag:'🇩🇿', group:'J' },
  { id:'austria',     name:'Austria',        flag:'🇦🇹', group:'J' },
  { id:'jordan',      name:'Jordan',         flag:'🇯🇴', group:'J' },
  { id:'portugal',    name:'Portugal',       flag:'🇵🇹', group:'K' },
  { id:'drcongo',     name:'DR Congo',       flag:'🇨🇩', group:'K' },
  { id:'uzbekistan',  name:'Uzbekistan',     flag:'🇺🇿', group:'K' },
  { id:'colombia',    name:'Colombia',       flag:'🇨🇴', group:'K' },
  { id:'england',     name:'England',        flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', group:'L' },
  { id:'croatia',     name:'Croatia',        flag:'🇭🇷', group:'L' },
  { id:'ghana',       name:'Ghana',          flag:'🇬🇭', group:'L' },
  { id:'panama',      name:'Panama',         flag:'🇵🇦', group:'L' },
];

// Build lookup maps
const TEAM_BY_ID = Object.fromEntries(ALL_TEAMS.map(t => [t.id, t]));
const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');

// ─── Full group stage schedule (must match update-data.js GROUP_SCHEDULE) ──
const GROUP_SCHEDULE = {
   A:[{md:1,h:'mexico',     a:'southafrica',d:'2026-06-11',v:'Estadio Azteca, Mexico City'},
      {md:1,h:'southkorea', a:'czechia',    d:'2026-06-11',v:'Estadio Akron, Zapopan'},
      {md:2,h:'czechia',    a:'southafrica',d:'2026-06-18',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:2,h:'mexico',     a:'southkorea', d:'2026-06-18',v:'Estadio Akron, Zapopan'},
      {md:3,h:'czechia',    a:'mexico',     d:'2026-06-24',v:'Estadio Akron, Zapopan'},
      {md:3,h:'southafrica',a:'southkorea', d:'2026-06-24',v:'Estadio Akron, Zapopan'}],
   B:[{md:1,h:'canada',     a:'bosnia',     d:'2026-06-12',v:'BMO Field, Toronto'},
      {md:1,h:'qatar',      a:'switzerland',d:'2026-06-13',v:"Levi's Stadium, San Francisco"},
      {md:2,h:'switzerland',a:'bosnia',     d:'2026-06-18',v:"Levi's Stadium, San Francisco"},
      {md:2,h:'canada',     a:'qatar',      d:'2026-06-18',v:'BC Place, Vancouver'},
      {md:3,h:'switzerland',a:'canada',     d:'2026-06-24',v:'BC Place, Vancouver'},
      {md:3,h:'bosnia',     a:'qatar',      d:'2026-06-24',v:'Lumen Field, Seattle'}],
   C:[{md:1,h:'brazil',     a:'morocco',    d:'2026-06-13',v:'MetLife Stadium, New Jersey'},
      {md:1,h:'haiti',      a:'scotland',   d:'2026-06-13',v:'Gillette Stadium, Boston'},
      {md:2,h:'scotland',   a:'morocco',    d:'2026-06-19',v:'Gillette Stadium, Boston'},
      {md:2,h:'brazil',     a:'haiti',      d:'2026-06-19',v:'Lincoln Financial Field, Philadelphia'},
      {md:3,h:'scotland',   a:'brazil',     d:'2026-06-24',v:'Hard Rock Stadium, Miami'},
      {md:3,h:'morocco',    a:'haiti',      d:'2026-06-24',v:'Mercedes-Benz Stadium, Atlanta'}],
   D:[{md:1,h:'usa',        a:'paraguay',   d:'2026-06-12',v:'SoFi Stadium, Los Angeles'},
      {md:1,h:'australia',  a:'turkey',     d:'2026-06-13',v:'BC Place, Vancouver'},
      {md:2,h:'usa',        a:'australia',  d:'2026-06-19',v:'Lumen Field, Seattle'},
      {md:2,h:'turkey',     a:'paraguay',   d:'2026-06-19',v:"Levi's Stadium, San Francisco"},
      {md:3,h:'turkey',     a:'usa',        d:'2026-06-25',v:'SoFi Stadium, Los Angeles'},
      {md:3,h:'paraguay',   a:'australia',  d:'2026-06-25',v:"Levi's Stadium, San Francisco"}],
   E:[{md:1,h:'germany',    a:'curacao',    d:'2026-06-14',v:'NRG Stadium, Houston'},
      {md:1,h:'ivorycoast', a:'ecuador',    d:'2026-06-14',v:'Lincoln Financial Field, Philadelphia'},
      {md:2,h:'germany',    a:'ivorycoast', d:'2026-06-20',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:2,h:'ecuador',    a:'curacao',    d:'2026-06-20',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'ecuador',    a:'germany',    d:'2026-06-25',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'curacao',    a:'ivorycoast', d:'2026-06-25',v:'Lincoln Financial Field, Philadelphia'}],
   F:[{md:1,h:'netherlands',a:'japan',      d:'2026-06-14',v:'Arrowhead Stadium, Kansas City'},
      {md:1,h:'sweden',     a:'tunisia',    d:'2026-06-14',v:'Arrowhead Stadium, Kansas City'},
      {md:2,h:'netherlands',a:'sweden',     d:'2026-06-20',v:'Arrowhead Stadium, Kansas City'},
      {md:2,h:'tunisia',    a:'japan',      d:'2026-06-20',v:'Arrowhead Stadium, Kansas City'},
      {md:3,h:'japan',      a:'sweden',     d:'2026-06-25',v:'AT&T Stadium, Dallas'},
      {md:3,h:'tunisia',    a:'netherlands',d:'2026-06-25',v:'Arrowhead Stadium, Kansas City'}],
   G:[{md:1,h:'belgium',    a:'egypt',      d:'2026-06-15',v:'Lumen Field, Seattle'},
      {md:1,h:'iran',       a:'newzealand', d:'2026-06-15',v:'SoFi Stadium, Los Angeles'},
      {md:2,h:'belgium',    a:'iran',       d:'2026-06-21',v:'SoFi Stadium, Los Angeles'},
      {md:2,h:'newzealand', a:'egypt',      d:'2026-06-21',v:'BC Place, Vancouver'},
      {md:3,h:'egypt',      a:'iran',       d:'2026-06-26',v:'Lumen Field, Seattle'},
      {md:3,h:'newzealand', a:'belgium',    d:'2026-06-26',v:'BC Place, Vancouver'}],
   H:[{md:1,h:'spain',      a:'capeverde',  d:'2026-06-15',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:1,h:'saudiarabia',a:'uruguay',    d:'2026-06-15',v:'Hard Rock Stadium, Miami'},
      {md:2,h:'spain',      a:'saudiarabia',d:'2026-06-21',v:'Mercedes-Benz Stadium, Atlanta'},
      {md:2,h:'uruguay',    a:'capeverde',  d:'2026-06-21',v:'Hard Rock Stadium, Miami'},
      {md:3,h:'capeverde',  a:'saudiarabia',d:'2026-06-26',v:'NRG Stadium, Houston'},
      {md:3,h:'uruguay',    a:'spain',      d:'2026-06-26',v:'Estadio Guadalajara, Guadalajara'}],
   I:[{md:1,h:'france',     a:'senegal',    d:'2026-06-16',v:'MetLife Stadium, New Jersey'},
      {md:1,h:'iraq',       a:'norway',     d:'2026-06-16',v:'Gillette Stadium, Boston'},
      {md:2,h:'france',     a:'iraq',       d:'2026-06-22',v:'Lincoln Financial Field, Philadelphia'},
      {md:2,h:'norway',     a:'senegal',    d:'2026-06-22',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'norway',     a:'france',     d:'2026-06-26',v:'Gillette Stadium, Boston'},
      {md:3,h:'senegal',    a:'iraq',       d:'2026-06-26',v:'BMO Field, Toronto'}],
   J:[{md:1,h:'argentina',  a:'algeria',    d:'2026-06-16',v:'Arrowhead Stadium, Kansas City'},
      {md:1,h:'austria',    a:'jordan',     d:'2026-06-16',v:"Levi's Stadium, San Francisco"},
      {md:2,h:'argentina',  a:'austria',    d:'2026-06-22',v:'SoFi Stadium, Los Angeles'},
      {md:2,h:'jordan',     a:'algeria',    d:'2026-06-22',v:'Arrowhead Stadium, Kansas City'},
      {md:3,h:'algeria',    a:'austria',    d:'2026-06-27',v:'Arrowhead Stadium, Kansas City'},
      {md:3,h:'jordan',     a:'argentina',  d:'2026-06-27',v:'AT&T Stadium, Dallas'}],
   K:[{md:1,h:'portugal',   a:'drcongo',    d:'2026-06-17',v:'NRG Stadium, Houston'},
      {md:1,h:'uzbekistan', a:'colombia',   d:'2026-06-17',v:'Estadio Azteca, Mexico City'},
      {md:2,h:'portugal',   a:'uzbekistan', d:'2026-06-23',v:'NRG Stadium, Houston'},
      {md:2,h:'colombia',   a:'drcongo',    d:'2026-06-23',v:'Estadio Azteca, Mexico City'},
      {md:3,h:'colombia',   a:'portugal',   d:'2026-06-27',v:'Hard Rock Stadium, Miami'},
      {md:3,h:'drcongo',    a:'uzbekistan', d:'2026-06-27',v:'Mercedes-Benz Stadium, Atlanta'}],
   L:[{md:1,h:'england',    a:'croatia',    d:'2026-06-17',v:'AT&T Stadium, Dallas'},
      {md:1,h:'ghana',      a:'panama',     d:'2026-06-17',v:'BMO Field, Toronto'},
      {md:2,h:'england',    a:'ghana',      d:'2026-06-23',v:'Lincoln Financial Field, Philadelphia'},
      {md:2,h:'panama',     a:'croatia',    d:'2026-06-23',v:'BMO Field, Toronto'},
      {md:3,h:'panama',     a:'england',    d:'2026-06-27',v:'MetLife Stadium, New Jersey'},
      {md:3,h:'croatia',    a:'ghana',      d:'2026-06-27',v:'Lincoln Financial Field, Philadelphia'}],
};

// ─── Match result extraction from Jun 16 snapshot ─────────────────────────

/**
 * Load the Jun 16 snapshot (or live data) as the source of truth.
 * Returns a Map keyed by `${homeId}:${awayId}` with match result data.
 */
function loadTruthMatches() {
	let truth;
	// Prefer Jun 16 snapshot, fall back to live data
	const jun16Path = path.join(SNAP_DIR, '2026-06-16.json');
	if (fs.existsSync(jun16Path)) {
		truth = JSON.parse(fs.readFileSync(jun16Path, 'utf8'));
	} else {
		truth = JSON.parse(fs.readFileSync(LIVE_PATH, 'utf8'));
	}

	const dm = truth.dailyMatches || {};
	const resultMap = new Map();

	for (const [, matches] of Object.entries(dm)) {
		for (const m of matches) {
			const key = `${m.homeId}:${m.awayId}`;
			// Also store the reverse key for lookups
			const revKey = `${m.awayId}:${m.homeId}`;
			const entry = {
				homeScore: m.homeScore,
				awayScore: m.awayScore,
				status: m.status,
				date: m.date,
				clock: m.clock,
				broadcasts: m.broadcasts,
				time: m.time,
			};
			resultMap.set(key, entry);
			resultMap.set(revKey, entry);
		}
	}

	// Also extract scorers/cards from team groupResults in the truth data
	const teamDetails = new Map();
	for (const t of (truth.teams || [])) {
		for (const gr of (t.groupResults || [])) {
			if (!gr.opponent) continue;
			const opp = ALL_TEAMS.find(ot => ot.name === gr.opponent);
			if (!opp) continue;
			const key = `${t.id}:${opp.id}`;
			teamDetails.set(key, {
				scorers: gr.scorers || [],
				cards: gr.cards || [],
				result: gr.result,
				score: gr.score,
			});
		}
	}

	return { resultMap, teamDetails, truthTeams: truth.teams || [] };
}

// ─── Build dailyMatches for a specific snapshot date ──────────────────────

function buildDailyMatches(snapshotDate, truthResultMap) {
	const dailyMatches = {};

	for (const [, fixtures] of Object.entries(GROUP_SCHEDULE)) {
		for (const fix of fixtures) {
			const date = fix.d;
			const homeId = fix.h;
			const awayId = fix.a;
			const key = `${homeId}:${awayId}`;
			const truth = truthResultMap.get(key);

			const homeTeam = TEAM_BY_ID[homeId];
			const awayTeam = TEAM_BY_ID[awayId];

			// Determine status based on match date vs snapshot date
			const matchDatePassed = date <= snapshotDate;
			let status, homeScore, awayScore;

			if (truth && truth.status === 'FINISHED' && matchDatePassed) {
				// Match was played and date is <= snapshot — use real data
				status = 'FINISHED';
				homeScore = truth.homeScore;
				awayScore = truth.awayScore;
			} else if (truth && truth.status === 'IN_PROGRESS' && matchDatePassed) {
				status = 'IN_PROGRESS';
				homeScore = truth.homeScore;
				awayScore = truth.awayScore;
			} else {
				// Not yet played as of snapshot date
				status = 'SCHEDULED';
				homeScore = 0;
				awayScore = 0;
			}

			if (!dailyMatches[date]) dailyMatches[date] = [];
			dailyMatches[date].push({
				homeTeam: homeTeam?.name || homeId,
				homeFlag: homeTeam?.flag || '🏳️',
				homeId,
				awayTeam: awayTeam?.name || awayId,
				awayFlag: awayTeam?.flag || '🏳️',
				awayId,
				homeScore,
				awayScore,
				status,
				date,
				clock: truth?.clock || undefined,
				broadcasts: truth?.broadcasts,
				time: truth?.time || undefined,
			});
		}
	}

	// Sort matches within each date by time
	for (const date of Object.keys(dailyMatches)) {
		dailyMatches[date].sort((a, b) => (a.time || '').localeCompare(b.time || ''));
	}

	return dailyMatches;
}

// ─── Build standings from matches played by snapshot date ─────────────────

function computeStandings(snapshotDate, truthResultMap) {
	const standings = {};

	for (const g of GROUP_LETTERS) {
		// Initialize team stats
		const stats = {};
		const sched = GROUP_SCHEDULE[g] || [];
		for (const fix of sched) {
			if (!stats[fix.h]) stats[fix.h] = { p:0, w:0, d:0, l:0, gf:0, ga:0 };
			if (!stats[fix.a]) stats[fix.a] = { p:0, w:0, d:0, l:0, gf:0, ga:0 };
		}

		// Count only matches played by snapshot date
		for (const fix of sched) {
			if (fix.d > snapshotDate) continue;

			const key = `${fix.h}:${fix.a}`;
			const truth = truthResultMap.get(key);

			if (!truth || truth.status !== 'FINISHED') continue;

			const hScore = truth.homeScore;
			const aScore = truth.awayScore;

			stats[fix.h].p++;
			stats[fix.a].p++;
			stats[fix.h].gf += hScore;
			stats[fix.h].ga += aScore;
			stats[fix.a].gf += aScore;
			stats[fix.a].ga += hScore;

			if (hScore > aScore) {
				stats[fix.h].w++;
				stats[fix.a].l++;
			} else if (aScore > hScore) {
				stats[fix.a].w++;
				stats[fix.h].l++;
			} else {
				stats[fix.h].d++;
				stats[fix.a].d++;
			}
		}

		// Build sorted standings array
		const rows = Object.entries(stats).map(([teamId, s]) => {
			const team = TEAM_BY_ID[teamId];
			return {
				pos: 0, // filled after sort
				teamId,
				team: team?.name || teamId,
				flag: team?.flag || '🏳️',
				played: s.p,
				w: s.w,
				d: s.d,
				l: s.l,
				gf: s.gf,
				ga: s.ga,
				gd: s.gf - s.ga,
				pts: s.w * 3 + s.d,
			};
		});

		// Sort: pts desc, gd desc, gf desc
		rows.sort((a, b) => b.pts - a.pts || b.gd - a.gd || b.gf - a.gf);
		rows.forEach((r, i) => { r.pos = i + 1; });

		standings[g] = rows;
	}

	return standings;
}

// ─── Build groupResults for a team at snapshot date ───────────────────────

function buildGroupResults(teamId, snapshotDate, truthResultMap, truthTeamDetails) {
	const team = TEAM_BY_ID[teamId];
	const group = team.group;
	const sched = GROUP_SCHEDULE[group] || [];

	const results = [];
	for (const fix of sched) {
		if (fix.h !== teamId && fix.a !== teamId) continue;

		const isHome = fix.h === teamId;
		const oppId = isHome ? fix.a : fix.h;
		const opp = TEAM_BY_ID[oppId];
		const key = `${fix.h}:${fix.a}`;
		const truth = truthResultMap.get(key);

		let result = null;
		let score = null;
		let scorers = [];
		let cards = [];

		if (fix.d <= snapshotDate && truth && truth.status === 'FINISHED') {
			const hScore = truth.homeScore;
			const aScore = truth.awayScore;

			if (isHome) {
				score = `${hScore}-${aScore}`;
				result = hScore > aScore ? 'W' : hScore < aScore ? 'L' : 'D';
			} else {
				score = `${aScore}-${hScore}`;
				result = aScore > hScore ? 'W' : aScore < hScore ? 'L' : 'D';
			}

			// Try to get scorers/cards from team details
			const detKey = `${teamId}:${oppId}`;
			const details = truthTeamDetails.get(detKey);
			if (details) {
				scorers = details.scorers;
				cards = details.cards;
			}
		}

		results.push({
			matchday: fix.md,
			opponent: opp ? opp.name : oppId,
			opponentFlag: opp ? opp.flag : '🏳️',
			result,
			score,
			date: fix.d,
			venue: fix.v,
			scorers,
			cards,
		});
	}

	// Sort by matchday
	results.sort((a, b) => a.matchday - b.matchday);
	return results;
}

// ─── Repair a single snapshot ─────────────────────────────────────────────

function repairSnapshot(snapshotDate, truthResultMap, truthTeamDetails, truthTeams) {
	const snapPath = path.join(SNAP_DIR, `${snapshotDate}.json`);
	if (!fs.existsSync(snapPath)) {
		console.log(`  ⚠  Snapshot not found: ${snapshotDate}.json — skipping`);
		return false;
	}

	const snap = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
	let changes = 0;

	// 1. Build and inject dailyMatches
	const dailyMatches = buildDailyMatches(snapshotDate, truthResultMap);
	const dmDates = Object.keys(dailyMatches).length;
	const dmCount = Object.values(dailyMatches).reduce((s, a) => s + a.length, 0);

	if (!snap.dailyMatches || JSON.stringify(snap.dailyMatches) !== JSON.stringify(dailyMatches)) {
		snap.dailyMatches = dailyMatches;
		changes++;
	}

	// 2. Rebuild standings
	const newStandings = computeStandings(snapshotDate, truthResultMap);
	for (const g of GROUP_LETTERS) {
		const existing = snap.groups?.[g]?.standings || [];
		const updated = newStandings[g] || [];
		// Compare ignoring pos (which may change after sort)
		const eq = existing.length === updated.length &&
			existing.every((r, i) =>
				r.teamId === updated[i].teamId &&
				r.played === updated[i].played &&
				r.w === updated[i].w &&
				r.d === updated[i].d &&
				r.l === updated[i].l &&
				r.gf === updated[i].gf &&
				r.ga === updated[i].ga &&
				r.pts === updated[i].pts
			);

		if (!eq) {
			if (!snap.groups) snap.groups = {};
			if (!snap.groups[g]) snap.groups[g] = { standings: [], winProbabilities: {} };
			snap.groups[g].standings = updated;
			changes++;
		}
	}

	// 3. Rebuild team groupResults
	if (snap.teams) {
		for (const team of snap.teams) {
			const freshResults = buildGroupResults(team.id, snapshotDate, truthResultMap, truthTeamDetails);
			const existingResults = team.groupResults || [];

			// Only update if changed (compare key fields)
			const changed = freshResults.length !== existingResults.length ||
				freshResults.some((fr, i) => {
					const er = existingResults[i];
					return !er || fr.result !== er.result || fr.score !== er.score ||
						JSON.stringify(fr.scorers) !== JSON.stringify(er.scorers) ||
						JSON.stringify(fr.cards) !== JSON.stringify(er.cards);
				});

			if (changed) {
				team.groupResults = freshResults;
				changes++;
			}
		}
	}

	// 4. Write back if changed
	if (changes > 0) {
		fs.writeFileSync(snapPath, JSON.stringify(snap, null, 2));
		console.log(`  ✅ ${snapshotDate}: ${changes} field(s) updated (${dmDates} match dates, ${dmCount} matches in dailyMatches)`);
	} else {
		console.log(`  ✓  ${snapshotDate}: already up to date`);
	}
	return true;
}

// ─── Main ─────────────────────────────────────────────────────────────────

function main() {
	console.log('=== Repair Historical Snapshots ===\n');

	// Load source of truth
	console.log('Loading truth data from Jun 16 snapshot...');
	const { resultMap, teamDetails } = loadTruthMatches();
	console.log(`  ${resultMap.size / 2} unique matches in truth data\n`);

	// Repair each historical snapshot (Jun 10-15)
	const dates = ['2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13', '2026-06-14', '2026-06-15'];

	for (const date of dates) {
		repairSnapshot(date, resultMap, teamDetails);
	}

	console.log('\n=== Done ===');
	console.log('Run this script again anytime — it is idempotent.');
}

main();
