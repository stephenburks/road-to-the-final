import { KNOCKOUT_STAGES } from './tournament.js'

/**
 * Total goals scored by a team across the entire tournament — group stage
 * (read from team.groupResults score strings) plus every FINISHED knockout
 * match they appear in (read from actualBracket).
 *
 * Replaces the old reliance on ESPN's team-API record.stats.pointsFor,
 * which lags and sometimes resets between rounds. Computing it from the
 * canonical match data we already have gives a stable, up-to-the-second
 * total that matches what's on the screen.
 */
export function computeTotalGoals(team, actualBracket) {
	let total = 0

	for (const gr of team.groupResults ?? []) {
		if (!gr.score) continue
		const my = parseInt(String(gr.score).split('-')[0], 10)
		if (Number.isFinite(my)) total += my
	}

	for (const stage of KNOCKOUT_STAGES) {
		const matches = actualBracket?.[stage] ?? []
		for (const m of matches) {
			if (m.status !== 'FINISHED') continue
			if (m.homeId === team.id) total += m.homeScore ?? 0
			else if (m.awayId === team.id) total += m.awayScore ?? 0
		}
	}

	return total
}

/**
 * Whether the team's group is fully played (all four teams reached 3 matches).
 * Used by the UI to decide "show win-group probability" vs "show finishing
 * position" — after the group is settled, the probability is meaningless.
 */
export function isGroupComplete(team, data) {
	const standings = data?.groups?.[team.group]?.standings ?? []
	if (standings.length === 0) return false
	return standings.every(r => (r.played ?? 0) >= 3)
}

/**
 * Returns the team's final position (1-4) in its group, or null if the group
 * isn't fully played.
 */
export function getGroupPosition(team, data) {
	const standings = data?.groups?.[team.group]?.standings ?? []
	const row = standings.find(r => r.teamId === team.id)
	return row?.pos ?? null
}
