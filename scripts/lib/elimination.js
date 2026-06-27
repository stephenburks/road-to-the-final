'use strict';

const { BRACKET_PATHS, KNOCKOUT_STAGES } = require('./tournament');

/**
 * Brute-force search: across every combination of outcomes for remaining
 * group matches, does at least one have this team finishing top 3?
 *
 * 2026 World Cup has 48 teams in 12 groups of 4: top 2 + 8 best 3rd-place
 * teams advance to the R32. So a team is only mathematically out when no
 * scenario lands them at or above 3rd. The "can finish 3rd but won't beat
 * the wildcard 8" case is handled separately via Polymarket=0%.
 */
function canStillFinishTop3(teamId, group, rawStandings, espnMatches) {
	const rows = rawStandings?.[group] ?? [];
	if (rows.length === 0) return true;
	const teamIds = new Set(rows.map(r => r.teamId).filter(Boolean));

	const remaining = [];
	for (const [key, match] of espnMatches.entries()) {
		if (match.status === 'FINISHED') continue;
		const [h, a] = key.split(':');
		if (teamIds.has(h) && teamIds.has(a)) remaining.push([h, a]);
	}

	if (remaining.length === 0) {
		const row = rows.find(r => r.teamId === teamId);
		return !!row && row.pos <= 3;
	}

	const outcomes = [
		{ hPts: 3, aPts: 0, hGd:  1, aGd: -1 },
		{ hPts: 0, aPts: 3, hGd: -1, aGd:  1 },
		{ hPts: 1, aPts: 1, hGd:  0, aGd:  0 },
	];

	function dfs(i, sim) {
		if (i === remaining.length) {
			const sorted = [...sim].sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || ((b.gf || 0) - (a.gf || 0)));
			const pos = sorted.findIndex(r => r.teamId === teamId) + 1;
			return pos > 0 && pos <= 3;
		}
		const [h, a] = remaining[i];
		for (const o of outcomes) {
			const next = sim.map(r => ({ ...r }));
			const hRow = next.find(r => r.teamId === h);
			const aRow = next.find(r => r.teamId === a);
			if (hRow) { hRow.pts += o.hPts; hRow.gd += o.hGd; }
			if (aRow) { aRow.pts += o.aPts; aRow.gd += o.aGd; }
			if (dfs(i + 1, next)) return true;
		}
		return false;
	}

	return dfs(0, rows.map(r => ({ ...r })));
}

/**
 * Resolve a team's current stage from group standings + finished knockout
 * matches. Returns a string for the simple group_stage case, otherwise
 * { stage, eliminated, eliminatedIn? }.
 *
 * Bug history: an earlier version fell through to 'final' when no knockout
 * match was found (which then triggered Clinched on every prior stage —
 * `6a96202`). The current logic clamps to lastWonStage + 1.
 */
function determineCurrentStage(teamId, group, rawStandings, espnMatches) {
	const groupRows = rawStandings?.[group];
	if (!groupRows?.length) return 'group_stage';

	const teamRow = groupRows.find(r => r.teamId === teamId);
	if (!teamRow) return 'group_stage';

	const played = teamRow.played ?? 0;
	if (played < 3) return 'group_stage';

	const pos = teamRow.pos ?? 4;
	if (pos > 2) return 'group_stage';

	const groupFinished = groupRows.every(r => (r.played ?? 0) >= 3);
	if (!groupFinished) return 'group_stage';

	let lastWonStage = null;
	for (const stage of KNOCKOUT_STAGES) {
		const match = findKnockoutMatch(teamId, group, pos, stage, espnMatches);
		if (!match) continue;

		const isTeamHome = match.homeId === teamId;
		const isTeamAway = match.awayId === teamId;

		if (match.status === 'FINISHED') {
			if (isTeamHome || isTeamAway) {
				const myGoals  = isTeamHome ? match.homeScore : match.awayScore;
				const oppGoals = isTeamHome ? match.awayScore : match.homeScore;
				if (myGoals < oppGoals) return { stage, eliminated: true, eliminatedIn: stage };
				lastWonStage = stage;
			}
			continue;
		}

		// Unfinished knockout match → that's the team's current stage.
		return { stage, eliminated: false };
	}

	// No unfinished match found. Current = the stage AFTER the last knockout
	// the team won. If they won the final they stay at 'final' (champion).
	// If no knockouts found at all, they're heading into R32.
	const lastIdx = lastWonStage ? KNOCKOUT_STAGES.indexOf(lastWonStage) : -1;
	const nextIdx = Math.min(lastIdx + 1, KNOCKOUT_STAGES.length - 1);
	return { stage: KNOCKOUT_STAGES[nextIdx], eliminated: false };
}

function findKnockoutMatch(teamId, group, pos, stage, espnMatches) {
	const bp = BRACKET_PATHS[`${group}-${pos}`];
	if (!bp?.[stage]?.date) return null;
	const matchDate = bp[stage].date;

	for (const [key, match] of espnMatches.entries()) {
		if (match.date !== matchDate) continue;
		const [hId, aId] = key.split(':');
		if (hId === teamId || aId === teamId) return match;
	}
	return null;
}

module.exports = {
	canStillFinishTop3,
	determineCurrentStage,
	findKnockoutMatch,
};
