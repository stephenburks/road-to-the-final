import { KNOCKOUT_STAGES } from './tournament.js'
import { stageForKnockoutDate } from './elimination.js'

const STAGE_COUNT = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 }

/**
 * Reconstruct the actual knockout bracket from observed ESPN matches.
 *
 * The bracket reflects what FIFA / ESPN actually scheduled — not what our
 * static BRACKET_PATHS predicted. ESPN's R32 events arrive with concrete
 * team IDs; R16+ events arrive as placeholders (e.g. "Round of 32 8 Winner
 * at Round of 32 7 Winner") until R32 winners resolve.
 *
 * Output shape per stage:
 *   [{ date, eventId?, homeId?, awayId?,
 *      homeFeederEventId?, awayFeederEventId?,
 *      homeScore, awayScore, status, winnerId?, venue?, ... }]
 *
 * - homeId/awayId set when ESPN has resolved that side to a real team.
 * - homeFeederEventId/awayFeederEventId set when that side is still a
 *   feeder reference. The client uses these to render predicted opponents.
 *
 * dailyMatches arg: fallback for R32 entries when bracketEvents is missing
 * (older snapshots, tests). bracketEvents arg: ESPN-sourced knockout
 * events including placeholders.
 */
export function buildActualBracket(dailyMatches, bracketEvents = null) {
	if (bracketEvents && bracketEvents.length > 0) {
		return buildFromBracketEvents(bracketEvents)
	}
	// Legacy fallback: derive R32-only from dailyMatches (no feeder map).
	return buildFromDailyMatches(dailyMatches)
}

function buildFromBracketEvents(bracketEvents) {
	// 1. Sort R32 events by eventId (numeric ascending) → FIFA match # 1..16.
	const r32Events = bracketEvents
		.filter(e => e.stage === 'r32')
		.slice()
		.sort((a, b) => Number(a.eventId) - Number(b.eventId))

	const fifaNumberToR32EventId = {}
	r32Events.forEach((e, i) => { fifaNumberToR32EventId[i + 1] = e.eventId })

	// 2. Walk every knockout event; convert feeder references to event IDs.
	const out = {}
	for (const stage of KNOCKOUT_STAGES) out[stage] = []

	for (const e of bracketEvents) {
		if (!KNOCKOUT_STAGES.includes(e.stage)) continue
		const entry = {
			eventId:   e.eventId,
			date:      e.date,
			venue:     e.venue,
			status:    e.status,
			homeScore: e.homeScore ?? 0,
			awayScore: e.awayScore ?? 0,
		}
		applySide(entry, 'home', e.home, fifaNumberToR32EventId, bracketEvents)
		applySide(entry, 'away', e.away, fifaNumberToR32EventId, bracketEvents)

		if (e.status === 'FINISHED' && entry.homeId && entry.awayId && entry.homeScore !== entry.awayScore) {
			entry.winnerId = entry.homeScore > entry.awayScore ? entry.homeId : entry.awayId
		}
		out[e.stage].push(entry)
	}

	// Stable order per stage: sort by eventId ascending so bracketModel can
	// rely on a consistent slot order across builds.
	for (const stage of KNOCKOUT_STAGES) {
		out[stage].sort((a, b) => Number(a.eventId) - Number(b.eventId))
	}

	return out
}

function applySide(entry, sideKey, side, fifaNumberToR32EventId, bracketEvents) {
	if (!side) return
	if (side.teamId) {
		entry[sideKey + 'Id'] = side.teamId
		return
	}
	if (side.feederStage && side.feederNumber) {
		// Currently we only have FIFA numbering for R32 (1-16 in event ID order).
		// QF/SF feeders would need their own numbering when those rounds appear.
		if (side.feederStage === 'r32') {
			const feederId = fifaNumberToR32EventId[side.feederNumber]
			if (feederId) entry[sideKey + 'FeederEventId'] = feederId
		} else {
			// R16+ feeders: look up by stage + Nth event in that stage (by eventId order)
			const feederId = nthEventIdInStage(bracketEvents, side.feederStage, side.feederNumber)
			if (feederId) entry[sideKey + 'FeederEventId'] = feederId
		}
	}
}

function nthEventIdInStage(bracketEvents, stage, n) {
	const events = bracketEvents.filter(e => e.stage === stage)
		.slice().sort((a, b) => Number(a.eventId) - Number(b.eventId))
	return events[n - 1]?.eventId
}

// Legacy fallback for snapshots that predate bracketEvents — derives a
// minimal bracket from dailyMatches only. Loses feeder structure but
// preserves the R32 matches the UI needs to render.
function buildFromDailyMatches(dailyMatches) {
	const out = {}
	for (const stage of KNOCKOUT_STAGES) out[stage] = []

	for (const matches of Object.values(dailyMatches ?? {})) {
		for (const m of matches) {
			const stage = stageForKnockoutDate(m.date)
			if (!stage) continue
			const entry = {
				date: m.date, homeId: m.homeId, awayId: m.awayId,
				homeScore: m.homeScore, awayScore: m.awayScore,
				status: m.status, clock: m.clock, venue: m.venue, broadcasts: m.broadcasts,
			}
			if (m.status === 'FINISHED' && m.homeScore !== m.awayScore) {
				entry.winnerId = m.homeScore > m.awayScore ? m.homeId : m.awayId
			}
			out[stage].push(entry)
		}
	}

	for (const stage of KNOCKOUT_STAGES) {
		out[stage].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.homeId ?? '').localeCompare(b.homeId ?? ''))
	}
	return out
}

// Exported for legacy callers that may still need the count info.
export { STAGE_COUNT }
