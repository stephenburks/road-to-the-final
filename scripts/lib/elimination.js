import { BRACKET_PATHS, KNOCKOUT_STAGES } from './tournament.js'

// ─── Knockout date windows ──────────────────────────────────────────────────
// Derived from BRACKET_PATHS so they stay correct if the bracket data
// changes, with ±1 day padding to absorb minor schedule shifts published by
// ESPN (broadcast/venue/weather adjustments). Anything past STAGE_END.final
// is treated as still-in-final (champion or runner-up).
const STAGE_END = (() => {
	const maxByStage = {}
	for (const path of Object.values(BRACKET_PATHS)) {
		for (const stage of KNOCKOUT_STAGES) {
			const d = path[stage]?.date
			if (!d) continue
			if (!maxByStage[stage] || d > maxByStage[stage]) maxByStage[stage] = d
		}
	}
	const padDays = (iso, n) => {
		const d = new Date(iso + 'T12:00:00Z')
		d.setUTCDate(d.getUTCDate() + n)
		return d.toISOString().slice(0, 10)
	}
	const out = {}
	for (const stage of KNOCKOUT_STAGES) {
		if (maxByStage[stage]) out[stage] = padDays(maxByStage[stage], 1)
	}
	return out
})()

const KNOCKOUT_START = (() => {
	let earliest = null
	for (const path of Object.values(BRACKET_PATHS)) {
		const d = path.r32?.date
		if (d && (!earliest || d < earliest)) earliest = d
	}
	return earliest // e.g. '2026-06-28'
})()

/**
 * Map a YYYY-MM-DD match date to its knockout stage based on which stage's
 * date window the match falls into. Returns null for group-stage dates.
 */
export function stageForKnockoutDate(date) {
	if (!date || !KNOCKOUT_START || date < KNOCKOUT_START) return null
	for (const stage of KNOCKOUT_STAGES) {
		if (date <= STAGE_END[stage]) return stage
	}
	return KNOCKOUT_STAGES[KNOCKOUT_STAGES.length - 1] // post-final ≈ 'final'
}

/**
 * Brute-force search: across every combination of outcomes for remaining
 * group matches, does at least one have this team finishing top 3?
 *
 * 2026 World Cup has 48 teams in 12 groups of 4: top 2 + 8 best 3rd-place
 * teams advance to the R32. A team is only mathematically out when no
 * scenario lands them at or above 3rd. The "can finish 3rd but won't beat
 * the wildcard 8" case is handled separately via Polymarket=0%.
 */
export function canStillFinishTop3(teamId, group, rawStandings, espnMatches) {
	const rows = rawStandings?.[group] ?? []
	if (rows.length === 0) return true
	const teamIds = new Set(rows.map(r => r.teamId).filter(Boolean))

	const remaining = []
	for (const [key, match] of espnMatches.entries()) {
		if (match.status === 'FINISHED') continue
		const [h, a] = key.split(':')
		if (teamIds.has(h) && teamIds.has(a)) remaining.push([h, a])
	}

	if (remaining.length === 0) {
		const row = rows.find(r => r.teamId === teamId)
		return !!row && row.pos <= 3
	}

	const outcomes = [
		{ hPts: 3, aPts: 0, hGd:  1, aGd: -1 },
		{ hPts: 0, aPts: 3, hGd: -1, aGd:  1 },
		{ hPts: 1, aPts: 1, hGd:  0, aGd:  0 },
	]

	function dfs(i, sim) {
		if (i === remaining.length) {
			const sorted = [...sim].sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || ((b.gf || 0) - (a.gf || 0)))
			const pos = sorted.findIndex(r => r.teamId === teamId) + 1
			return pos > 0 && pos <= 3
		}
		const [h, a] = remaining[i]
		for (const o of outcomes) {
			const next = sim.map(r => ({ ...r }))
			const hRow = next.find(r => r.teamId === h)
			const aRow = next.find(r => r.teamId === a)
			if (hRow) { hRow.pts += o.hPts; hRow.gd += o.hGd }
			if (aRow) { aRow.pts += o.aPts; aRow.gd += o.aGd }
			if (dfs(i + 1, next)) return true
		}
		return false
	}

	return dfs(0, rows.map(r => ({ ...r })))
}

/**
 * Find every match in espnMatches involving a given team, sorted by date.
 */
function teamMatchesByDate(teamId, espnMatches) {
	const out = []
	for (const [key, match] of espnMatches.entries()) {
		const [h, a] = key.split(':')
		if (h === teamId || a === teamId) out.push(match)
	}
	out.sort((a, b) => (a.date ?? '').localeCompare(b.date ?? ''))
	return out
}

/**
 * Resolve a team's current stage from group standings + knockout matches.
 * Returns a string for the simple group_stage case, otherwise
 * { stage, eliminated, eliminatedIn? }.
 *
 * Knockout detection is data-driven: every FINISHED match involving the team
 * after group stage is classified by its date into the appropriate stage,
 * then walked chronologically. The previous schedule-driven version missed
 * matches whose date didn't match the static BRACKET_PATHS prediction (e.g.
 * an A-2 team playing R32 on 06-28 instead of the predicted 06-29 — the
 * South Africa 0-1 Canada bug, 2026-06-28).
 */
export function determineCurrentStage(teamId, group, rawStandings, espnMatches) {
	const groupRows = rawStandings?.[group]
	if (!groupRows?.length) return 'group_stage'

	const teamRow = groupRows.find(r => r.teamId === teamId)
	if (!teamRow) return 'group_stage'

	const played = teamRow.played ?? 0
	if (played < 3) return 'group_stage'

	const pos = teamRow.pos ?? 4
	if (pos > 3) return 'group_stage'

	const groupFinished = groupRows.every(r => (r.played ?? 0) >= 3)
	if (!groupFinished) return 'group_stage'

	// Find every knockout match this team has been in, in date order.
	const matches = teamMatchesByDate(teamId, espnMatches)
		.filter(m => m.date && KNOCKOUT_START && m.date >= KNOCKOUT_START)

	// 3rd-place teams advance to R32 only if selected as one of the wildcard 8.
	// Without an actual knockout match they never advanced — stay in group_stage
	// (the caller's Polymarket=0% check will mark them eliminated).
	if (pos === 3 && matches.length === 0) return 'group_stage'

	let lastWonStage = null
	let nextScheduled = null
	for (const match of matches) {
		const stage = stageForKnockoutDate(match.date)
		if (!stage) continue

		if (match.status === 'FINISHED') {
			const isHome   = match.homeId === teamId
			const myGoals  = isHome ? match.homeScore : match.awayScore
			const oppGoals = isHome ? match.awayScore : match.homeScore
			if (myGoals < oppGoals) {
				return { stage, eliminated: true, eliminatedIn: stage }
			}
			lastWonStage = stage
			continue
		}

		// First non-finished knockout match → that's the team's current stage.
		nextScheduled = stage
		break
	}

	if (nextScheduled) return { stage: nextScheduled, eliminated: false }

	// No unfinished knockout match. Stage = the one after lastWonStage. If
	// the team has won the final, they stay at 'final' (champion).
	const lastIdx = lastWonStage ? KNOCKOUT_STAGES.indexOf(lastWonStage) : -1
	const nextIdx = Math.min(lastIdx + 1, KNOCKOUT_STAGES.length - 1)
	return { stage: KNOCKOUT_STAGES[nextIdx], eliminated: false }
}

/**
 * Find the team's match at a given knockout stage, if any. Used by callers
 * that need the actual match record (scores, status) for the current stage.
 * Data-driven — walks the team's matches and classifies by date window.
 */
export function findKnockoutMatch(teamId, _group, _pos, stage, espnMatches) {
	const matches = teamMatchesByDate(teamId, espnMatches)
	for (const m of matches) {
		if (stageForKnockoutDate(m.date) === stage) return m
	}
	return null
}

// Exported for tests + the actualBracket builder.
export { STAGE_END, KNOCKOUT_START }
