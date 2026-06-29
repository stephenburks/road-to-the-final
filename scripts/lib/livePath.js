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

/**
 * For a team in a known knockout match, return the feeder event ID of the
 * other side (when that side is still a placeholder). Used to predict the
 * opponent: the team that will win the feeder match.
 */
function getOpponentFeederEventId(teamId, match) {
	if (!match) return null
	if (match.homeId === teamId) return match.awayFeederEventId ?? null
	if (match.awayId === teamId) return match.homeFeederEventId ?? null
	return null
}

function findMatchByEventId(eventId, stage, actualBracket) {
	if (!eventId) return null
	const matches = actualBracket?.[stage] ?? []
	return matches.find(m => m.eventId === eventId) || null
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
			const { venue, city } = splitVenue(match.venue)
			let opponentDesc
			if (oppId) {
				opponentDesc = ID_TO_NAME[oppId] || oppId
			} else {
				// Opponent side is still a feeder placeholder — derive a
				// predicted description from the feeder match's two teams.
				const opponentFeederId = getOpponentFeederEventId(team.id, match)
				const feeder = opponentFeederId ? findMatchByEventId(opponentFeederId, prevStageOf(stage), actualBracket) : null
				if (feeder?.winnerId) {
					opponentDesc = ID_TO_NAME[feeder.winnerId] || feeder.winnerId
				} else if (feeder?.homeId && feeder?.awayId) {
					opponentDesc = `${ID_TO_NAME[feeder.homeId] ?? feeder.homeId} or ${ID_TO_NAME[feeder.awayId] ?? feeder.awayId}`
				} else {
					opponentDesc = 'Opponent TBD'
				}
			}
			out[stage] = {
				status: stageStatusForMatch(match, team.currentStage, stage),
				date: match.date,
				venue: venue || (oppId ? (staticPath?.[stage]?.venue || '') : 'TBD'),
				city:  city  || (oppId ? (staticPath?.[stage]?.city  || '') : 'TBD'),
				opponentDesc,
				conditional: !oppId,
				conditionNote: !oppId ? 'Venue confirmed once feeder match settles' : undefined,
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
			// display the stale static venue/opponent prediction. Show TBD
			// for venue, but if we can predict opponents from the previous
			// stage's actualBracket pairing, surface those in opponentDesc
			// so the team page isn't purely empty.
			const sp = staticPath?.[stage]
			const predictedOpps = stage === 'r16'
				? predictNextStageOpponents(team.id, 'r32', actualBracket)
				: []
			const predictedDesc = predictedOpps.length === 1
				? predictedOpps[0].likelyTeam
				: predictedOpps.length === 2
					? `${predictedOpps[0].likelyTeam} or ${predictedOpps[1].likelyTeam}`
					: 'Opponent TBD'
			out[stage] = sp ? {
				status: 'future',
				date: sp.date || '',
				venue: 'TBD',
				city: 'TBD',
				opponentDesc: predictedDesc,
				conditional: true,
				conditionNote: predictedOpps.length > 0
					? 'Predicted from bracket pairing — venue confirmed once previous match settles'
					: 'Venue + opponent confirmed once bracket is drawn',
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
 * Predict opponents for a team's NEXT stage using ESPN's actual bracket
 * structure (feeder event IDs encoded into actualBracket[nextStage]).
 *
 * Look-up flow:
 *   1. Find the team's NEXT-stage match (e.g. R16 match where home or away
 *      is the team — possible if team won R32 and ESPN resolved it).
 *   2. If found AND the OTHER side is a real team → confirmed opponent.
 *   3. If found AND the OTHER side is a feeder placeholder (R32 not yet
 *      finished) → look up the feeder R32 match, return both teams as
 *      candidates (or just the winner if it finished).
 *   4. If team's next-stage match isn't drawn at all (no R16 placeholder
 *      lists them yet) → return [] (TBD).
 *
 * Replaces the old by-date consecutive-pair heuristic which produced the
 * wrong pairings (e.g. BEL/SEN ↔ ENG/DRC instead of the real ESPN-published
 * BEL/SEN ↔ FRA/SWE pairing).
 */
function predictNextStageOpponents(teamId, currentStage, actualBracket) {
	const nextStage = NEXT_STAGE[currentStage]
	if (!nextStage) return []

	// 1. Find the team's next-stage slot via teamId or feeder reference back
	//    to their currentStage match.
	const currentStageMatch = findBracketMatch(teamId, currentStage, actualBracket)
	const nextStageMatches = actualBracket?.[nextStage] ?? []

	const directNextMatch = nextStageMatches.find(m => m.homeId === teamId || m.awayId === teamId)
	const feederNextMatch = currentStageMatch?.eventId
		? nextStageMatches.find(m =>
			m.homeFeederEventId === currentStageMatch.eventId ||
			m.awayFeederEventId === currentStageMatch.eventId
		)
		: null

	const slot = directNextMatch ?? feederNextMatch
	if (!slot) return []

	// 2. Determine the OTHER side of the next-stage slot.
	let otherTeamId, otherFeederEventId
	if (slot.homeId === teamId || slot.homeFeederEventId === currentStageMatch?.eventId) {
		otherTeamId = slot.awayId
		otherFeederEventId = slot.awayFeederEventId
	} else {
		otherTeamId = slot.homeId
		otherFeederEventId = slot.homeFeederEventId
	}

	// 3a. Other side is a confirmed team → single confirmed opponent.
	if (otherTeamId) {
		return [makeOpponentRecord(otherTeamId, 'Confirmed opponent', 100)]
	}

	// 3b. Other side is a feeder placeholder → look up the feeder match.
	if (otherFeederEventId) {
		const feeder = findMatchByEventId(otherFeederEventId, currentStage, actualBracket)
		if (!feeder) return []
		if (feeder.status === 'FINISHED' && feeder.winnerId) {
			return [makeOpponentRecord(feeder.winnerId, 'Predicted (winner of paired match)', 100)]
		}
		if (feeder.homeId && feeder.awayId) {
			return [
				makeOpponentRecord(feeder.homeId, 'Predicted (if they win their match)', 50),
				makeOpponentRecord(feeder.awayId, 'Predicted (if they win their match)', 50),
			]
		}
	}

	return []
}

const NEXT_STAGE = {
	r32: 'r16',
	r16: 'qf',
	qf:  'sf',
	sf:  'final',
}

const PREV_STAGE = {
	r16:   'r32',
	qf:    'r16',
	sf:    'qf',
	final: 'sf',
}

function prevStageOf(stage) { return PREV_STAGE[stage] }

/**
 * Possible-opponent lists for r32 + r16 derived from actualBracket.
 *
 * When a stage has a real match for the team, return a single-entry list
 * (the confirmed opponent at pct=100). When the match isn't drawn yet,
 * use the bracket-pairing heuristic on the previous stage (when available)
 * to predict the candidates. Returns [] only when neither real nor
 * predicted opponents can be derived (e.g. team eliminated, or no R32 yet).
 */
export function derivePossibleOpponents(team, actualBracket) {
	// Eliminated teams don't have future opponents to predict.
	if (team.eliminated) return { r32: [], r16: [] }

	const r32Match = findBracketMatch(team.id, 'r32', actualBracket)
	const r16Match = findBracketMatch(team.id, 'r16', actualBracket)

	const r32List = r32Match && r32Match.homeId && r32Match.awayId
		? [makeOpponentRecord(getOpponentId(team.id, r32Match), 'Confirmed opponent', 100)]
		: []

	let r16List
	if (r16Match && r16Match.homeId && r16Match.awayId) {
		r16List = [makeOpponentRecord(getOpponentId(team.id, r16Match), 'Confirmed opponent', 100)]
	} else {
		// Fall back to feeder-aware prediction (handles partial R16 placeholders
		// like 'Canada vs R32 #3 Winner' — predicts NED/MAR as candidates).
		r16List = predictNextStageOpponents(team.id, 'r32', actualBracket)
		// If the partial slot resolved a confirmed opponent via feeder, also try direct.
		if (r16List.length === 0 && r16Match) {
			const opponentFeederId = getOpponentFeederEventId(team.id, r16Match)
			if (opponentFeederId) {
				const feeder = findMatchByEventId(opponentFeederId, 'r32', actualBracket)
				if (feeder?.status === 'FINISHED' && feeder.winnerId) {
					r16List = [makeOpponentRecord(feeder.winnerId, 'Predicted (winner of paired match)', 100)]
				} else if (feeder?.homeId && feeder?.awayId) {
					r16List = [
						makeOpponentRecord(feeder.homeId, 'Predicted (if they win their match)', 50),
						makeOpponentRecord(feeder.awayId, 'Predicted (if they win their match)', 50),
					]
				}
			}
		}
	}

	return { r32: r32List, r16: r16List }
}
