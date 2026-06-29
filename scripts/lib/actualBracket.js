import { KNOCKOUT_STAGES } from './tournament.js'
import { stageForKnockoutDate } from './elimination.js'

const STAGE_COUNT = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 }
const ROUND_ID_TO_STAGE = { 1: 'r32', 2: 'r16', 3: 'qf', 4: 'sf', 5: 'final' }

/**
 * Reconstruct the actual knockout bracket from ESPN data.
 *
 * Source priority:
 *   1. `bracketStructure` (from ESPN's bracket page) — authoritative for
 *      bracket-position metadata + R16+ feeder pairings. Without this we
 *      can't correctly resolve R16+ feeders because ESPN's scoreboard
 *      placeholder event names use unreliable numbering.
 *   2. `bracketEvents` (from ESPN's scoreboard endpoint) — used for the
 *      R16+ event scoring/status data once teams resolve.
 *   3. `dailyMatches` — fallback for legacy snapshots only.
 *
 * Output shape per stage:
 *   [{ date, eventId?, homeId?, awayId?,
 *      homeFeederEventId?, awayFeederEventId?,
 *      homeScore, awayScore, status, winnerId?, venue?, ... }]
 */
export function buildActualBracket(dailyMatches, scoreboardBracketEvents = null, bracketStructure = null) {
	if (bracketStructure && bracketStructure.r32Positions?.size > 0) {
		return buildFromStructure(scoreboardBracketEvents ?? [], bracketStructure)
	}
	if (scoreboardBracketEvents && scoreboardBracketEvents.length > 0) {
		return buildFromScoreboardOnly(scoreboardBracketEvents)
	}
	return buildFromDailyMatches(dailyMatches)
}

/**
 * Preferred path: combine ESPN bracket page (authoritative pairing) with
 * scoreboard data (live scores/status).
 */
function buildFromStructure(scoreboardBracketEvents, structure) {
	const { r32Positions, bracketEvents: pageEvents } = structure

	// Scoreboard view of which event IDs are actually R32. Used to detect &
	// reconcile bracket-page anomalies (ESPN's page occasionally mislabels
	// an R16 placeholder as an R32 — observed at loc 16 / GER/PAR).
	const scoreboardR32EventIds = new Set(
		scoreboardBracketEvents.filter(e => e.stage === 'r32' && e.eventId).map(e => e.eventId)
	)

	// bracketLocation → eventId (inverse of r32Positions for R32 lookups)
	const r32LocationToEventId = new Map()
	for (const [eventId, loc] of r32Positions) {
		if (scoreboardR32EventIds.has(eventId)) r32LocationToEventId.set(loc, eventId)
	}

	// Reconcile: any scoreboard R32 event not in the page positions gets
	// assigned to the next unfilled location (1..16). Without this, real
	// R32 matchups like GER vs PAR would render as TBD because the page
	// failed to place them.
	const assignedEventIds = new Set(r32LocationToEventId.values())
	const orphans = [...scoreboardR32EventIds].filter(id => !assignedEventIds.has(id))
	for (let loc = 1; loc <= STAGE_COUNT.r32 && orphans.length > 0; loc++) {
		if (!r32LocationToEventId.has(loc)) {
			r32LocationToEventId.set(loc, orphans.shift())
		}
	}

	// Build lookup tables for R16+ bracketLocation → eventId from page records.
	const stageLocationToEventId = { r32: r32LocationToEventId }
	for (const stage of ['r16', 'qf', 'sf', 'final']) {
		stageLocationToEventId[stage] = new Map()
		for (const e of pageEvents.filter(p => p.stage === stage && p.eventId)) {
			stageLocationToEventId[stage].set(e.bracketLocation, e.eventId)
		}
	}

	// Build scoreboard lookup by eventId for live data.
	const scoreboardByEventId = new Map()
	for (const e of scoreboardBracketEvents) {
		if (e.eventId) scoreboardByEventId.set(e.eventId, e)
	}

	const out = {}
	for (const stage of KNOCKOUT_STAGES) out[stage] = []

	// R32: emit one entry per bracketLocation (1-16), pulling team + score
	// data from scoreboard when the event has resolved.
	for (let loc = 1; loc <= STAGE_COUNT.r32; loc++) {
		const eventId = r32LocationToEventId.get(loc)
		const sb = eventId ? scoreboardByEventId.get(eventId) : null
		out.r32.push(buildR32Entry(loc, eventId, sb))
	}

	// R16+: walk each page event, resolve feeder references to event IDs
	// (via bracketLocation), and merge in scoreboard scoring data.
	for (const stage of ['r16', 'qf', 'sf', 'final']) {
		for (const pageEvent of pageEvents.filter(p => p.stage === stage)) {
			const sb = pageEvent.eventId ? scoreboardByEventId.get(pageEvent.eventId) : null
			out[stage].push(buildR16PlusEntry(pageEvent, sb, stageLocationToEventId))
		}
		out[stage].sort((a, b) => a.bracketLocation - b.bracketLocation)
	}

	return out
}

function buildR32Entry(loc, eventId, sb) {
	const entry = {
		eventId,
		bracketLocation: loc,
		date: sb?.date ?? null,
		venue: sb?.venue ?? null,
		status: sb?.status ?? 'SCHEDULED',
		homeScore: sb?.homeScore ?? 0,
		awayScore: sb?.awayScore ?? 0,
	}
	if (sb?.home?.teamId) entry.homeId = sb.home.teamId
	if (sb?.away?.teamId) entry.awayId = sb.away.teamId
	if (entry.status === 'FINISHED' && entry.homeId && entry.awayId && entry.homeScore !== entry.awayScore) {
		entry.winnerId = entry.homeScore > entry.awayScore ? entry.homeId : entry.awayId
	}
	return entry
}

function buildR16PlusEntry(pageEvent, sb, stageLocationToEventId) {
	const entry = {
		eventId: pageEvent.eventId,
		bracketLocation: pageEvent.bracketLocation,
		matchNumber: pageEvent.matchNumber,
		date: sb?.date ?? null,
		venue: sb?.venue ?? null,
		status: sb?.status ?? 'SCHEDULED',
		homeScore: sb?.homeScore ?? 0,
		awayScore: sb?.awayScore ?? 0,
	}

	// Resolve feeder references for each side. Home/away can be either a
	// concrete team (resolved scoreboard data) or a feeder pointer.
	if (sb?.home?.teamId) {
		entry.homeId = sb.home.teamId
	} else if (pageEvent.homeFeederLocation && pageEvent.homeFeederRoundId) {
		const feederStage = ROUND_ID_TO_STAGE[pageEvent.homeFeederRoundId]
		const feederEventId = stageLocationToEventId[feederStage]?.get(pageEvent.homeFeederLocation)
		if (feederEventId) entry.homeFeederEventId = feederEventId
	}

	if (sb?.away?.teamId) {
		entry.awayId = sb.away.teamId
	} else if (pageEvent.awayFeederLocation && pageEvent.awayFeederRoundId) {
		const feederStage = ROUND_ID_TO_STAGE[pageEvent.awayFeederRoundId]
		const feederEventId = stageLocationToEventId[feederStage]?.get(pageEvent.awayFeederLocation)
		if (feederEventId) entry.awayFeederEventId = feederEventId
	}

	if (entry.status === 'FINISHED' && entry.homeId && entry.awayId && entry.homeScore !== entry.awayScore) {
		entry.winnerId = entry.homeScore > entry.awayScore ? entry.homeId : entry.awayId
	}

	return entry
}

/**
 * Fallback when ESPN bracket page is unavailable: use scoreboard events
 * only. Less accurate (placeholder names may be unreliable) but
 * functional. The unreliable-name caveat is exactly the bug that
 * motivated the bracket-page fetch.
 */
function buildFromScoreboardOnly(bracketEvents) {
	const r32Events = bracketEvents.filter(e => e.stage === 'r32').slice().sort((a, b) => Number(a.eventId) - Number(b.eventId))
	const fifaNumberToR32EventId = {}
	r32Events.forEach((e, i) => { fifaNumberToR32EventId[i + 1] = e.eventId })

	const out = {}
	for (const stage of KNOCKOUT_STAGES) out[stage] = []

	for (const e of bracketEvents) {
		if (!KNOCKOUT_STAGES.includes(e.stage)) continue
		const entry = {
			eventId: e.eventId,
			date: e.date,
			venue: e.venue,
			status: e.status,
			homeScore: e.homeScore ?? 0,
			awayScore: e.awayScore ?? 0,
		}
		applySideFromScoreboard(entry, 'home', e.home, fifaNumberToR32EventId, bracketEvents)
		applySideFromScoreboard(entry, 'away', e.away, fifaNumberToR32EventId, bracketEvents)
		if (e.status === 'FINISHED' && entry.homeId && entry.awayId && entry.homeScore !== entry.awayScore) {
			entry.winnerId = entry.homeScore > entry.awayScore ? entry.homeId : entry.awayId
		}
		out[e.stage].push(entry)
	}

	for (const stage of KNOCKOUT_STAGES) {
		out[stage].sort((a, b) => Number(a.eventId) - Number(b.eventId))
	}
	return out
}

function applySideFromScoreboard(entry, sideKey, side, fifaNumberToR32EventId, bracketEvents) {
	if (!side) return
	if (side.teamId) { entry[sideKey + 'Id'] = side.teamId; return }
	if (side.feederStage && side.feederNumber) {
		if (side.feederStage === 'r32') {
			const fid = fifaNumberToR32EventId[side.feederNumber]
			if (fid) entry[sideKey + 'FeederEventId'] = fid
		} else {
			const events = bracketEvents.filter(e => e.stage === side.feederStage)
				.slice().sort((a, b) => Number(a.eventId) - Number(b.eventId))
			const fid = events[side.feederNumber - 1]?.eventId
			if (fid) entry[sideKey + 'FeederEventId'] = fid
		}
	}
}

/** Last-resort fallback for snapshots that predate bracketEvents. */
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

export { STAGE_COUNT }
