import { KNOCKOUT_STAGES, STAGE_ORDER } from './tournament.js'
import { ID_TO_NAME, getTeamById } from './teams.js'
import { diffRating, diffLabel, diffColor } from './probabilities.js'

/**
 * Override a team's path and possibleOpponents using actualBracket as the
 * source of truth.
 *
 * Why this exists: the script's buildPath() uses static BRACKET_PATHS which
 * encodes "if A finishes 1st, their R32 is match 79 in Mexico City." But
 * once the actual tournament starts, FIFA / ESPN can publish a different
 * pairing (e.g. the 2026-06-28 South Africa vs Canada matchup which the
 * static bracket didn't predict). After that, the static venue/date/opponent
 * for that team is wrong. This module reads the truth from actualBracket
 * and falls back to "TBD" rather than displaying wrong predictions.
 */

function findBracketMatch(teamId, stage, actualBracket) {
	const matches = actualBracket?.[stage] ?? []
	return matches.find(m => m.homeId === teamId || m.awayId === teamId) || null
}

function getOpponentId(teamId, match) {
	return match.homeId === teamId ? match.awayId : match.homeId
}

function splitVenue(venueStr) {
	if (!venueStr) return { venue: '', city: '' }
	const parts = venueStr.split(',').map(s => s.trim())
	return { venue: parts[0] || '', city: parts.slice(1).join(', ') || '' }
}

function stageStatusForMatch(match, teamCurrentStage, stage) {
	if (match.status === 'FINISHED')    return 'done'
	if (match.status === 'IN_PROGRESS') return 'active'
	return stage === teamCurrentStage ? 'upcoming' : 'future'
}

/**
 * Replace knockout stages of a team's path with actualBracket-sourced data.
 * - Stage with a real match in actualBracket → use that match's venue/date/opponent.
 * - Reachable future stage with no match yet → TBD placeholder.
 * - Stage past the team's current → mark 'done' (won) or keep null (eliminated).
 *
 * The group_stage entry is passed through unchanged.
 */
export function deriveLivePath(team, actualBracket, staticPath) {
	const out = { group_stage: staticPath?.group_stage ?? null }
	const teamStageIdx = STAGE_ORDER.indexOf(team.currentStage)

	for (const stage of KNOCKOUT_STAGES) {
		const stageIdx = STAGE_ORDER.indexOf(stage)
		const match = findBracketMatch(team.id, stage, actualBracket)

		if (match) {
			const oppId = getOpponentId(team.id, match)
			const oppName = ID_TO_NAME[oppId] || oppId
			const { venue, city } = splitVenue(match.venue)
			out[stage] = {
				status: stageStatusForMatch(match, team.currentStage, stage),
				date: match.date,
				venue: venue || staticPath?.[stage]?.venue || '',
				city:  city  || staticPath?.[stage]?.city  || '',
				opponentDesc: oppName,
			}
			continue
		}

		if (team.eliminated && stageIdx > teamStageIdx) {
			// Team eliminated earlier — no point in showing this stage at all.
			out[stage] = null
			continue
		}

		if (stageIdx >= teamStageIdx) {
			// Reachable future stage but bracket not yet drawn — refuse to
			// display the stale static venue/opponent prediction. Show TBD so
			// the UI conveys "we don't know yet" rather than misinforming.
			const sp = staticPath?.[stage]
			out[stage] = sp ? {
				status: 'future',
				date: sp.date || '',
				venue: 'TBD',
				city: 'TBD',
				opponentDesc: 'Opponent TBD',
				conditional: true,
				conditionNote: 'Venue + opponent confirmed once bracket is drawn',
			} : null
			continue
		}

		// Past stage that we don't have data for — preserve static info
		// (this generally shouldn't happen since actualBracket covers all
		// knockouts, but be defensive).
		out[stage] = staticPath?.[stage] ? { ...staticPath[stage], status: 'done' } : null
	}

	return out
}

function makeOpponentRecord(id, note, pct) {
	const info = getTeamById(id) || {}
	const rating = diffRating(info.fifaRank)
	return {
		likelyTeam: info.name || id,
		flag:       info.flag || '🏳️',
		fifaRank:   info.fifaRank || 50,
		difficulty: rating,
		label:      diffLabel(rating),
		color:      diffColor(rating),
		note,
		pct,
	}
}

/**
 * Possible-opponent lists for r32 + r16 derived from actualBracket.
 *
 * When a stage has a real match for the team, return a single-entry list
 * (the confirmed opponent at pct=100). When the match isn't drawn yet,
 * return [] — the UI will render this as "to be determined."
 *
 * Note: future R16 prediction (before R16 matchups are published) is hard
 * because the static bracket diverged from reality on R32. We intentionally
 * don't fabricate a guess — better to show TBD than the wrong team.
 */
export function derivePossibleOpponents(team, actualBracket) {
	const r32Match = findBracketMatch(team.id, 'r32', actualBracket)
	const r16Match = findBracketMatch(team.id, 'r16', actualBracket)
	return {
		r32: r32Match ? [makeOpponentRecord(getOpponentId(team.id, r32Match), 'Confirmed opponent', 100)] : [],
		r16: r16Match ? [makeOpponentRecord(getOpponentId(team.id, r16Match), 'Confirmed opponent', 100)] : [],
	}
}
