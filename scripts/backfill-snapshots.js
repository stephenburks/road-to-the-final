#!/usr/bin/env node
/**
 * One-shot backfill: rewrite all snapshot files so each one represents the
 * accurate end-of-day state for its date, derived from the current (fresh)
 * world-cup-2026.json.
 *
 * For each snapshot date D:
 *  - dailyMatches[d] where d <= D: kept as-is (final results from current data)
 *  - dailyMatches[d] where d > D:  reset to SCHEDULED, 0-0, empty scorers/cards
 *  - teams[].groupResults:         each match reset if its date > D
 *  - groups[X].standings:          recomputed from finished matches with date <= D
 *  - teams[].eliminated:           recomputed via brute-force canStillFinishTop3
 *  - Polymarket-derived fields (advanceProbabilities, winProbabilities) left as-is
 *    (historical odds aren't available; current values are kept for visualization)
 *
 * Usage: node scripts/backfill-snapshots.js
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const LIVE_PATH = path.join(ROOT, 'public', 'data', 'world-cup-2026.json');
const SNAP_DIR = path.join(ROOT, 'public', 'data', 'snapshots');

const live = JSON.parse(fs.readFileSync(LIVE_PATH, 'utf8'));

/** Recompute group standings using only matches with status FINISHED and date <= cutoff. */
function recomputeStandings(snapshot, cutoffDate) {
	const groups = {};
	// Seed with all teams at zero
	for (const t of snapshot.teams) {
		if (!groups[t.group]) groups[t.group] = {};
		groups[t.group][t.id] = {
			teamId: t.id, team: t.name, flag: t.flag,
			played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
		};
	}
	// Aggregate finished matches with date <= cutoff
	for (const [date, arr] of Object.entries(snapshot.dailyMatches)) {
		if (date > cutoffDate) continue;
		for (const m of arr) {
			if (m.status !== 'FINISHED') continue;
			const hTeam = snapshot.teams.find(t => t.id === m.homeId);
			const aTeam = snapshot.teams.find(t => t.id === m.awayId);
			if (!hTeam || !aTeam || hTeam.group !== aTeam.group) continue;
			const g = hTeam.group;
			const h = groups[g][m.homeId];
			const a = groups[g][m.awayId];
			h.played++; a.played++;
			h.gf += m.homeScore; h.ga += m.awayScore; h.gd = h.gf - h.ga;
			a.gf += m.awayScore; a.ga += m.homeScore; a.gd = a.gf - a.ga;
			if (m.homeScore > m.awayScore)      { h.w++; a.l++; h.pts += 3; }
			else if (m.homeScore < m.awayScore) { a.w++; h.l++; a.pts += 3; }
			else                                 { h.d++; a.d++; h.pts++; a.pts++; }
		}
	}
	// Sort + assign positions per group
	const out = {};
	for (const [letter, teams] of Object.entries(groups)) {
		const arr = Object.values(teams).sort((a, b) =>
			(b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf) || a.team.localeCompare(b.team)
		);
		out[letter] = arr.map((r, i) => ({ ...r, pos: i + 1 }));
	}
	return out;
}

/** Brute-force: can this team still finish top 3 given the remaining matches?
 * Top 2 + 8 best 3rd-place teams advance (48-team format), so we mark
 * eliminated only when guaranteed 4th. Polymarket=0% handles the 3rd-place
 * wildcard nuance separately (not used in backfill — historical odds unknown). */
function canStillFinishTop3(teamId, groupLetter, standings, snapshot, cutoffDate) {
	const rows = standings[groupLetter] ?? [];
	if (rows.length === 0) return true;
	const teamIds = new Set(rows.map(r => r.teamId));

	const remaining = [];
	for (const [date, arr] of Object.entries(snapshot.dailyMatches)) {
		if (date > cutoffDate) {
			// All matches > cutoff are "unplayed" in this historical view
			for (const m of arr) {
				if (teamIds.has(m.homeId) && teamIds.has(m.awayId)) {
					remaining.push([m.homeId, m.awayId]);
				}
			}
		} else {
			// At <= cutoff, only count not-yet-FINISHED as remaining
			for (const m of arr) {
				if (m.status === 'FINISHED') continue;
				if (teamIds.has(m.homeId) && teamIds.has(m.awayId)) {
					remaining.push([m.homeId, m.awayId]);
				}
			}
		}
	}

	if (remaining.length === 0) {
		const r = rows.find(x => x.teamId === teamId);
		return !!r && r.pos <= 3;
	}

	const outcomes = [
		{ hPts: 3, aPts: 0, hGd: 1, aGd: -1 },
		{ hPts: 0, aPts: 3, hGd: -1, aGd: 1 },
		{ hPts: 1, aPts: 1, hGd: 0, aGd: 0 },
	];
	function dfs(i, sim) {
		if (i === remaining.length) {
			const sorted = [...sim].sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd));
			return (sorted.findIndex(r => r.teamId === teamId) + 1) <= 3;
		}
		const [h, a] = remaining[i];
		for (const o of outcomes) {
			const next = sim.map(r => ({ ...r }));
			const hR = next.find(r => r.teamId === h);
			const aR = next.find(r => r.teamId === a);
			if (hR) { hR.pts += o.hPts; hR.gd += o.hGd; }
			if (aR) { aR.pts += o.aPts; aR.gd += o.aGd; }
			if (dfs(i + 1, next)) return true;
		}
		return false;
	}
	return dfs(0, rows.map(r => ({ ...r })));
}

// Skip today/future PT dates — those snapshots should be written by the live
// script ONLY after the day is fully complete, not by this one-shot backfill.
const todayPT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });

const snapFiles = fs.readdirSync(SNAP_DIR)
	.filter(f => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
	.filter(f => f.replace('.json', '') < todayPT)
	.sort();

for (const file of snapFiles) {
	const date = file.replace('.json', '');
	const snap = JSON.parse(JSON.stringify(live));

	// 1. Reset future-dated dailyMatches
	let resetCount = 0;
	for (const [d, arr] of Object.entries(snap.dailyMatches)) {
		if (d > date) {
			for (const m of arr) {
				m.status = 'SCHEDULED';
				m.homeScore = 0;
				m.awayScore = 0;
				if ('clock' in m) m.clock = '';
				resetCount++;
			}
		}
	}

	// 2. Reset future-dated entries in each team's groupResults
	for (const t of snap.teams) {
		for (const gr of (t.groupResults ?? [])) {
			if (gr.date > date) {
				gr.result = null;
				gr.score = null;
				gr.scorers = [];
				gr.cards = [];
			}
		}
	}

	// 3. Recompute group standings from filtered match set
	const standings = recomputeStandings(snap, date);
	for (const [letter, rows] of Object.entries(standings)) {
		if (snap.groups[letter]) {
			snap.groups[letter].standings = rows;
		}
	}

	// 4. Recompute eliminations
	let elimCount = 0;
	for (const t of snap.teams) {
		const isEliminated = !canStillFinishTop3(t.id, t.group, standings, snap, date);
		if (isEliminated !== t.eliminated) {
			t.eliminated = isEliminated;
		}
		if (t.eliminated) elimCount++;
	}

	// 5. Stamp the snapshot
	snap.snapshotDate = date;
	snap.isHistorical = true;

	const outPath = path.join(SNAP_DIR, file);
	fs.writeFileSync(outPath, JSON.stringify(snap));

	const finishedToday = (snap.dailyMatches[date] ?? []).filter(m => m.status === 'FINISHED').length;
	const todayCount = (snap.dailyMatches[date] ?? []).length;
	console.log(`✓ ${date}: ${finishedToday}/${todayCount} matches finished, ${elimCount} eliminated, ${resetCount} future-dated reset`);
}

console.log(`\nBackfilled ${snapFiles.length} snapshots from ${LIVE_PATH}`);
