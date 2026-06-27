'use strict';

const { getTeamById } = require('./teams');
const { GROUP_SCHEDULE, BRACKET_PATHS, R32_MATCH_TO_POSITIONS, GROUP_LETTERS } = require('./tournament');
const { diffRating, diffLabel, diffColor } = require('./probabilities');

/**
 * Build a team's full knockout path from group through final. Includes the
 * group_stage "stamp" (cities + points) used by RoadBracket on the client.
 * Falls back to the GROUP-1 path when standings put the team out of the top
 * two — the consumer should ignore the path entirely for eliminated teams.
 */
function buildPath(teamId, group, standings) {
	const rows = standings[group] || [];
	const teamRow = rows.find(r => r.teamId === teamId);
	const pos = Math.min(teamRow?.pos ?? 1, 2);
	const key = `${group}-${pos}`;
	const bp = BRACKET_PATHS[key] || BRACKET_PATHS[`${group}-1`] || {};

	const sched = GROUP_SCHEDULE[group] || [];
	const teamGames = sched.filter(g => g.h === teamId || g.a === teamId);
	const dates = teamGames.map(g => g.d).sort();
	const first = dates[0] || '';
	const last  = dates[dates.length - 1] || '';
	const cities = [...new Set(teamGames.map(g => g.v.split(',').pop().trim()))].slice(0, 3).join(' · ');
	const pts = teamRow
		? `${teamRow.pts}pt${teamRow.pts !== 1 ? 's' : ''} after MD${teamRow.played}`
		: `Group ${group}`;

	return {
		group_stage: { status: 'active', city: cities, venue: 'Various venues', date: `Jun ${first.slice(8)}–${last.slice(8)}`, detail: pts },
		r32:   bp.r32   ? { status: 'upcoming', ...bp.r32 }   : null,
		r16:   bp.r16   ? { status: 'future',   ...bp.r16 }   : null,
		qf:    bp.qf    ? { status: 'future',   ...bp.qf }    : null,
		sf:    bp.sf    ? { status: 'future',   ...bp.sf }    : null,
		final: bp.final ? { status: 'future',   ...bp.final } : null,
	};
}

function makeOpponent({ group, info, note }) {
	const rating = diffRating(info?.fifaRank);
	return {
		group,
		likelyTeam: info?.name || 'TBD',
		flag:       info?.flag || '🏳️',
		fifaRank:   info?.fifaRank || 50,
		difficulty: rating,
		label:      diffLabel(rating),
		color:      diffColor(rating),
		note,
		pct:        null,
	};
}

/**
 * Parse opponentDesc strings produced by the bracket data ("Winner Group X",
 * "Best 3rd from A/B/C", etc.) into concrete possible-opponent records. Used
 * by the Opponent Watchlist UI.
 */
function buildOpponents(teamId, group, r32Desc, r16Desc, standings) {
	const desc = r32Desc ?? '';

	const directMatch = desc.match(/Winner\s+Group\s+([A-L])|Runner-up\s+Group\s+([A-L])/i);
	if (directMatch) {
		const oppGroup = (directMatch[1] ?? directMatch[2]).toUpperCase();
		const isWinner = !!directMatch[1];
		const gRows = standings[oppGroup] || [];
		const target = isWinner ? gRows[0] : gRows[1];
		const info = getTeamById(target?.teamId);
		const note = isWinner ? `Winner of Group ${oppGroup}` : `Runner-up of Group ${oppGroup}`;
		return {
			r32: [makeOpponent({ group: oppGroup, info, note })],
			r16: buildR16Opponents(teamId, r16Desc, standings),
		};
	}

	const poolMatch = desc.match(/Best\s+3rd\s+from\s+(.+)/i);
	if (poolMatch) {
		const groups = poolMatch[1].split('/').map(g => g.trim());
		const r32Opps = groups.map(g => {
			const third = (standings[g] || [])[2];
			return makeOpponent({ group: g, info: getTeamById(third?.teamId), note: `3rd-place team from Group ${g}` });
		});
		return { r32: r32Opps, r16: buildR16Opponents(teamId, r16Desc, standings) };
	}

	return { r32: [], r16: buildR16Opponents(teamId, r16Desc, standings) };
}

function buildR16Opponents(teamId, r16Desc, standings) {
	const desc = r16Desc ?? '';

	const matchRef = desc.match(/\(Match\s+(\d+)\)|Winner\s+Match\s+(\d+)/i);
	if (matchRef) {
		const matchNum = parseInt(matchRef[1] ?? matchRef[2], 10);
		const posKeys = R32_MATCH_TO_POSITIONS[matchNum] || [];
		return posKeys
			.filter(key => {
				// Skip the team's own bracket slot — they can't face themselves.
				const [grp, pos] = key.split('-');
				const target = pos === '1' ? (standings[grp] || [])[0] : (standings[grp] || [])[1];
				return target?.teamId !== teamId;
			})
			.map(key => {
				const [grp, pos] = key.split('-');
				const target = pos === '1' ? (standings[grp] || [])[0] : (standings[grp] || [])[1];
				return makeOpponent({
					group: grp,
					info: getTeamById(target?.teamId),
					note: `${pos === '1' ? 'Winner' : 'Runner-up'} of Group ${grp}`,
				});
			});
	}

	const groupRef = desc.match(/Winner\s+Group\s+([A-L])|Runner-up\s+Group\s+([A-L])/i);
	if (groupRef) {
		const oppGroup = (groupRef[1] ?? groupRef[2]).toUpperCase();
		const isWinner = !!groupRef[1];
		const target = isWinner ? (standings[oppGroup] || [])[0] : (standings[oppGroup] || [])[1];
		const note = isWinner ? `Winner of Group ${oppGroup}` : `Runner-up of Group ${oppGroup}`;
		return [makeOpponent({ group: oppGroup, info: getTeamById(target?.teamId), note })];
	}

	return [];
}

/**
 * Validate that BRACKET_PATHS covers every group/position permutation with
 * all required fields. Throws if a critical entry is missing — wired into
 * update-data.js startup so structural drift breaks the build immediately.
 */
function validateBracketPaths({ log = console.log } = {}) {
	const positions = [1, 2];
	const requiredKeys = ['r32', 'r16', 'qf', 'sf', 'final'];
	const requiredFields = ['match', 'date', 'city', 'venue', 'opponentDesc'];
	const datePattern = /^\d{4}-\d{2}-\d{2}$/;

	const missing = [];
	const badDates = [];
	let hasCritical = false;

	for (const g of GROUP_LETTERS) {
		for (const p of positions) {
			const key = `${g}-${p}`;
			const entry = BRACKET_PATHS[key];
			if (!entry) { missing.push(key); hasCritical = true; continue; }

			for (const stage of requiredKeys) {
				const stageEntry = entry[stage];
				if (!stageEntry) { missing.push(`${key}.${stage}`); hasCritical = true; continue; }
				for (const field of requiredFields) {
					if (stageEntry[field] === undefined || stageEntry[field] === null) {
						missing.push(`${key}.${stage}.${field}`);
						hasCritical = true;
					}
				}
				if (stageEntry.date && !datePattern.test(stageEntry.date)) {
					badDates.push(`${key}.${stage}.date = "${stageEntry.date}"`);
				}
			}
		}
	}

	if (badDates.length) log(`⚠  Bracket date format issues: ${badDates.join(', ')}`);
	if (missing.length)  log(`⚠  Bracket missing entries: ${missing.join(', ')}`);
	if (hasCritical) throw new Error('Critical bracket path data missing — cannot proceed');
}

module.exports = {
	buildPath,
	buildOpponents,
	buildR16Opponents,
	validateBracketPaths,
};
