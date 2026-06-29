import { KNOCKOUT_STAGES } from './tournament.js'

const EXPECTED_COUNT = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 }
const STAGE_LABELS  = { r32: 'Round of 32', r16: 'Round of 16', qf: 'Quarterfinals', sf: 'Semifinals', final: 'Final' }
const STAGE_BEFORE  = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf' }

// Predictions beyond this candidate count collapse to a generic TBD slot —
// listing 8+ teams as "possibly here" is more noise than signal.
const MAX_CANDIDATE_LIST = 4

/**
 * A side of a bracket slot. Either a confirmed team (homeId/awayId resolved
 * via actualBracket data) or a set of candidates (predicted via consecutive-
 * pair heuristic on the previous stage).
 *
 * @typedef {{ teamId: string } | { candidates: string[] } | { tbd: true }} Side
 */

/**
 * Full bracket model rendered by the bracket view.
 *
 * Each stage has the exact expected count of slots (16/8/4/2/1). Slots
 * are sourced from actualBracket where the stage is fully populated;
 * otherwise we predict via consecutive-pair pairing of the previous
 * stage's slots (winners advance; ties show both as candidates).
 *
 * Returns:
 *   { stages: [{ key, label, slots: Slot[] }, ...] }
 *
 * Slot:
 *   { status, source, home, away, homeScore?, awayScore?, winnerId?,
 *     date?, venue? }
 *   status: actualBracket status ('SCHEDULED' | 'IN_PROGRESS' | 'FINISHED')
 *           or 'PREDICTED' (both sides at least partially predicted) or
 *           'TBD' (no prior info to predict from).
 *   source: 'actual' | 'predicted' | 'tbd'
 */
export function buildBracketModel(actualBracket) {
	const stages = KNOCKOUT_STAGES.map(key => ({
		key,
		label: STAGE_LABELS[key],
		slots: buildSlotsForStage(key, actualBracket),
	}))
	return { stages }
}

function buildSlotsForStage(stage, actualBracket) {
	const expected = EXPECTED_COUNT[stage]
	const actual = actualBracket?.[stage] ?? []

	// Real matches with both teams resolved → use as-is.
	if (actual.length === expected && actual.every(m => m.homeId && m.awayId)) {
		return actual.map(actualToSlot)
	}

	// Stage has SOME data — either fully populated with placeholders or
	// partially populated. Each entry in `actual` represents a real bracket
	// slot from ESPN, so we use it (resolving feeder refs where present).
	if (actual.length > 0) {
		const slots = actual.map(m => buildSlotFromActual(m, actualBracket, stage))
		while (slots.length < expected) slots.push(tbdSlot())
		return slots
	}

	// Stage has no ESPN data → predict from previous stage if possible.
	const prevStage = STAGE_BEFORE[stage]
	if (!prevStage) {
		// R32 with no actual data — show as TBD shadow slots.
		return Array.from({ length: expected }, () => tbdSlot())
	}

	const prevSlots = buildSlotsForStage(prevStage, actualBracket)
	const slots = []
	for (let i = 0; i < prevSlots.length; i += 2) {
		const s1 = prevSlots[i]
		const s2 = prevSlots[i + 1]
		const home = deriveSideFromFeeder(s1)
		const away = deriveSideFromFeeder(s2)
		const isTbd = isSideTbd(home) && isSideTbd(away)
		slots.push(isTbd ? tbdSlot() : {
			status: 'PREDICTED',
			source: 'predicted',
			home,
			away,
		})
	}
	return slots
}

/**
 * Build a single slot from an actualBracket entry. If a side has a feeder
 * reference (placeholder), resolve it to candidate teams from the feeder's
 * R32/R16 match.
 */
function buildSlotFromActual(m, actualBracket, stage) {
	const prevStage = STAGE_BEFORE[stage]
	const prevMatches = prevStage ? (actualBracket?.[prevStage] ?? []) : []

	const resolveSide = (teamId, feederEventId) => {
		if (teamId) return { teamId }
		if (feederEventId && prevMatches.length > 0) {
			const feeder = prevMatches.find(p => p.eventId === feederEventId)
			if (feeder?.winnerId) return { teamId: feeder.winnerId }
			if (feeder?.homeId && feeder?.awayId) {
				return { candidates: [feeder.homeId, feeder.awayId] }
			}
		}
		return { tbd: true }
	}

	const home = resolveSide(m.homeId, m.homeFeederEventId)
	const away = resolveSide(m.awayId, m.awayFeederEventId)

	return {
		status: m.status,
		source: m.homeId && m.awayId ? 'actual' : 'predicted',
		home,
		away,
		homeScore: m.homeScore,
		awayScore: m.awayScore,
		winnerId: m.winnerId,
		date: m.date,
		venue: m.venue,
	}
}

function isSideTbd(side) {
	return !!(side && side.tbd)
}

/**
 * Given a feeder slot from the previous stage, derive the resulting side
 * of the next-stage slot:
 *   - Feeder finished with a known winner → { teamId: <winner> }
 *   - Feeder in progress / scheduled with both teams known → both as candidates
 *   - Feeder predicted with candidates → flatten candidates upward
 *   - Too many candidates → collapse to TBD
 */
function deriveSideFromFeeder(feeder) {
	if (!feeder) return tbdSide()

	if (feeder.winnerId) return { teamId: feeder.winnerId }

	const cands = new Set()
	addSideToSet(feeder.home, cands)
	addSideToSet(feeder.away, cands)
	if (cands.size === 0) return tbdSide()
	if (cands.size > MAX_CANDIDATE_LIST) return tbdSide()
	return { candidates: [...cands] }
}

function addSideToSet(side, set) {
	if (!side) return
	if (side.teamId) set.add(side.teamId)
	else if (Array.isArray(side.candidates)) for (const id of side.candidates) set.add(id)
}

function tbdSide() {
	return { tbd: true }
}

function tbdSlot() {
	return {
		status: 'TBD',
		source: 'tbd',
		home: tbdSide(),
		away: tbdSide(),
	}
}

function actualToSlot(m) {
	return {
		status: m.status,
		source: 'actual',
		home: { teamId: m.homeId },
		away: { teamId: m.awayId },
		homeScore: m.homeScore,
		awayScore: m.awayScore,
		winnerId: m.winnerId,
		date: m.date,
		venue: m.venue,
	}
}
