// Live-derived AppData: replaces the script's frozen standings/stage/elimination
// fields with values recomputed from dailyMatches overlaid with live patches.
//
// Why this exists: the script writes groups[].standings and team.currentStage
// into world-cup-2026.json. Between script runs (GHA cron, often delayed by
// hours), live ESPN scores update the score cards but the standings table stays
// frozen. By recomputing client-side from the same dailyMatches the script
// would see, the table reorders the moment a goal happens.

import type { AppData, Team, StandingRow, Stage } from '../types'
import type { LiveMatchPatch } from '../hooks/useLiveScores'
import { computeStandings, buildGroupStandings } from '../../scripts/lib/standings.js'
import { canStillFinishTop3, determineCurrentStage } from '../../scripts/lib/elimination.js'

interface MergedMatch {
	homeId: string
	awayId: string
	homeScore: number
	awayScore: number
	status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED'
	date: string
}

/**
 * Build the `espnMatches` Map shape the script's helpers expect: one entry
 * per match keyed by `homeId:awayId`, with live patches' scores/status taking
 * precedence over the script's baked-in values.
 */
function buildMatchIndex(data: AppData, patches: Map<string, LiveMatchPatch> | null): Map<string, MergedMatch> {
	const out = new Map<string, MergedMatch>()
	const daily = data.dailyMatches ?? {}
	for (const matches of Object.values(daily)) {
		for (const m of matches) {
			if (!m.homeId || !m.awayId) continue
			const patch = patches?.get(`${m.homeId}:${m.awayId}`)
			out.set(`${m.homeId}:${m.awayId}`, {
				homeId: m.homeId,
				awayId: m.awayId,
				homeScore: patch?.homeScore ?? m.homeScore,
				awayScore: patch?.awayScore ?? m.awayScore,
				status: patch?.status ?? m.status,
				date: m.date,
			})
		}
	}
	return out
}

/**
 * Recompute groups[].standings, team.currentStage, and team.eliminated from
 * the current dailyMatches + live patches. Other AppData fields (winProbabilities,
 * advanceProbabilities, paths, opponents, etc.) carry forward unchanged from
 * the static input — those are still authoritative from the script/Polymarket.
 *
 * Returns the same reference when no patches are present, so React equality
 * checks downstream don't see needless invalidation.
 */
export function deriveLiveAppData(
	staticData: AppData,
	patches: Map<string, LiveMatchPatch> | null
): AppData {
	if (staticData.isHistorical) return staticData
	if (!patches || patches.size === 0) return staticData

	const matchIndex = buildMatchIndex(staticData, patches)
	const rawStandings = computeStandings(matchIndex) as Record<string, StandingRow[]>

	// Replace groups[].standings (preserving winProbabilities) with the enriched,
	// live-derived rows from buildGroupStandings.
	const groups: AppData['groups'] = {}
	for (const [letter, group] of Object.entries(staticData.groups)) {
		const enriched = buildGroupStandings(letter, rawStandings) as StandingRow[]
		groups[letter] = {
			standings: enriched,
			winProbabilities: group.winProbabilities,
		}
	}

	// Recompute per-team currentStage + eliminated from the same live data.
	const teams: Team[] = staticData.teams.map(t => {
		const stageResult = determineCurrentStage(t.id, t.group, rawStandings, matchIndex) as
			| Stage
			| { stage: Stage; eliminated: boolean }
		const stage: Stage = typeof stageResult === 'string' ? stageResult : stageResult.stage
		let eliminated = t.eliminated
		// Group-stage elimination via brute-force scenario search.
		if (rawStandings[t.group]) {
			eliminated = !canStillFinishTop3(t.id, t.group, rawStandings, matchIndex)
		}
		// Knockout-stage elimination via determineCurrentStage's eliminated flag.
		if (typeof stageResult === 'object' && stageResult.eliminated) {
			eliminated = true
		}
		// Polymarket 0% (preserved from static data) still wins as a hard signal.
		if ((t.advanceProbabilities?.r32 ?? 1) === 0) {
			eliminated = true
		}
		if (stage === t.currentStage && eliminated === t.eliminated) return t
		return { ...t, currentStage: stage, eliminated }
	})

	return { ...staticData, groups, teams }
}
