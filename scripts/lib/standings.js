import { ID_TO_FLAG, ID_TO_NAME, getTeamById } from './teams.js'
import { GROUP_SCHEDULE, GROUP_LETTERS } from './tournament.js'

/**
 * Compute live group standings from finished ESPN matches.
 * Returns { A: StandingRow[], B: ..., ... } sorted by pts → gd → gf,
 * with `pos` assigned in finishing order.
 */
export function computeStandings(espnMatches) {
	const groups = {};

	for (const g of GROUP_LETTERS) {
		const sched = GROUP_SCHEDULE[g] || [];
		const teamIds = [...new Set([...sched.map(f => f.h), ...sched.map(f => f.a)])];
		groups[g] = {};
		for (const tid of teamIds) {
			groups[g][tid] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
		}
	}

	for (const [key, match] of espnMatches.entries()) {
		if (match.status !== 'FINISHED') continue;
		const [homeId, awayId] = key.split(':');
		const { homeScore, awayScore } = match;

		let group = null;
		for (const g of GROUP_LETTERS) {
			const sched = GROUP_SCHEDULE[g] || [];
			if (sched.find(f => (f.h === homeId && f.a === awayId) || (f.h === awayId && f.a === homeId))) {
				group = g; break;
			}
		}
		if (!group) continue;

		const homeStats = groups[group][homeId];
		if (homeStats) {
			homeStats.played++;
			homeStats.gf += homeScore;
			homeStats.ga += awayScore;
			if (homeScore > awayScore) { homeStats.w++; homeStats.pts += 3; }
			else if (homeScore < awayScore) { homeStats.l++; }
			else { homeStats.d++; homeStats.pts++; }
		}

		const awayStats = groups[group][awayId];
		if (awayStats) {
			awayStats.played++;
			awayStats.gf += awayScore;
			awayStats.ga += homeScore;
			if (awayScore > homeScore) { awayStats.w++; awayStats.pts += 3; }
			else if (awayScore < homeScore) { awayStats.l++; }
			else { awayStats.d++; awayStats.pts++; }
		}
	}

	const result = {};
	for (const g of GROUP_LETTERS) {
		const teamStats = Object.entries(groups[g]).map(([teamId, stats]) => ({
			teamId,
			team: ID_TO_NAME[teamId] || teamId,
			...stats,
			gd: stats.gf - stats.ga,
		}));
		teamStats.sort((a, b) => b.pts - a.pts || (b.gd - a.gd) || (b.gf - a.gf));
		result[g] = teamStats.map((s, i) => ({ ...s, pos: i + 1 }));
	}
	return result;
}

/**
 * Enrich raw standings with name + flag for the UI. Falls back to schedule
 * order pre-tournament (when rawStandings has no row for a group).
 */
export function buildGroupStandings(group, rawStandings) {
	if (rawStandings[group]) {
		return rawStandings[group].map(row => ({
			...row,
			flag: ID_TO_FLAG[row.teamId] || '🏳️',
			team: ID_TO_NAME[row.teamId] || row.team,
		}));
	}
	const sched = GROUP_SCHEDULE[group] || [];
	const ids = [...new Set([...sched.map(g => g.h), ...sched.map(g => g.a)])];
	return ids.map((id, i) => ({
		pos: i + 1,
		teamId: id,
		team: ID_TO_NAME[id] || id,
		flag: ID_TO_FLAG[id] || '🏳️',
		played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0,
	}));
}

/**
 * Build the per-matchday result row for one team. Preserves scorers/cards
 * from any existing row when the new fetch returns no detail data
 * (transient ESPN gaps shouldn't wipe previously-recorded scorers).
 */
export function buildGroupResults(teamId, group, matchIndex, existingGroupResults = []) {
	const sched = GROUP_SCHEDULE[group] || [];
	return sched
		.filter(g => g.h === teamId || g.a === teamId)
		.sort((a, b) => a.md - b.md)
		.map(g => {
			const isHome = g.h === teamId;
			const oppId = isHome ? g.a : g.h;
			const oppInfo = getTeamById(oppId) || {};

			// Try both directions — ESPN may assign home/away differently than the
			// official schedule for neutral-venue matches.
			let match = matchIndex.get(`${g.h}:${g.a}`);
			let matchReversed = false;
			if (!match) {
				match = matchIndex.get(`${g.a}:${g.h}`);
				matchReversed = true;
			}

			let result = null, score = null;
			if (match?.status === 'FINISHED') {
				const isMyTeamHome = isHome !== matchReversed;
				const myG = isMyTeamHome ? match.homeScore : match.awayScore;
				const opG = isMyTeamHome ? match.awayScore : match.homeScore;
				result = myG > opG ? 'W' : myG < opG ? 'L' : 'D';
				score  = `${myG}-${opG}`;
			} else if (match?.status === 'IN_PROGRESS') {
				const isMyTeamHome = isHome !== matchReversed;
				const myG = isMyTeamHome ? match.homeScore : match.awayScore;
				const opG = isMyTeamHome ? match.awayScore : match.homeScore;
				score = `${myG}-${opG}`;
			}

			const existingMatch = existingGroupResults.find(
				e => e.matchday === g.md && e.opponent === oppInfo.name
			);

			return {
				matchday: g.md,
				opponent: oppInfo.name || oppId,
				opponentFlag: oppInfo.flag || '🏳️',
				result, score, date: g.d, venue: g.v,
				scorers: existingMatch?.scorers?.length ? existingMatch.scorers : [],
				cards:   existingMatch?.cards?.length   ? existingMatch.cards   : [],
			};
		});
}

/**
 * Overlay ESPN-fetched scorers onto a team's groupResults. Match by date
 * first; fall back to the first finished match without scorers when the
 * ESPN payload has no date metadata.
 */
export function injectScorers(groupResults, espnScorers) {
	if (!espnScorers?.length) return groupResults;
	const labels = espnScorers.map(s => s.label);
	let assigned = false;
	return groupResults.map(gr => {
		if (gr.scorers?.length > 0) return gr;
		if (!gr.result) return gr;
		const matchScorers = espnScorers.filter(s => s.date === gr.date);
		if (matchScorers.length > 0) {
			assigned = true;
			return { ...gr, scorers: matchScorers.map(s => s.label) };
		}
		if (!assigned) {
			assigned = true;
			return { ...gr, scorers: labels };
		}
		return gr;
	});
}

export function injectCards(groupResults, espnCards) {
	if (!espnCards?.length) return groupResults;
	const entries = espnCards.map(c => ({ player: c.player, minute: c.minute, type: c.type }));
	let assigned = false;
	return groupResults.map(gr => {
		if (gr.cards?.length > 0) return gr;
		if (!gr.result) return gr;
		const matchCards = espnCards.filter(c => c.date === gr.date);
		if (matchCards.length > 0) {
			assigned = true;
			return { ...gr, cards: matchCards.map(c => ({ player: c.player, minute: c.minute, type: c.type })) };
		}
		if (!assigned) {
			assigned = true;
			return { ...gr, cards: entries };
		}
		return gr;
	});
}

