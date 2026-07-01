import { KNOCKOUT_STAGES } from './tournament.js'
import { stageForKnockoutDate } from './elimination.js'

const STAGE_COUNT = { r32: 16, r16: 8, qf: 4, sf: 2, final: 1 }

// Authoritative FIFA R16 pairings (matches the public ESPN bracket image).
// Indices are FIFA visual position 1-16 (the order R32 matches appear in
// the official bracket diagram, top to bottom). Each tuple is one R16 match.
const R16_FEEDER_PAIRS = [
	[1, 3],   // GER/PAR + RSA/CAN
	[2, 5],   // FRA/SWE + POR/CRO
	[4, 6],   // NED/MAR + ESP/AUT
	[7, 8],   // USA/BIH + BEL/SEN
	[9, 10],  // BRA/JPN + CIV/NOR
	[11, 12], // MEX/ECU + ENG/DRC
	[13, 15], // ARG/CPV + SUI/ALG
	[14, 16], // AUS/EGY + COL/GHA
]

// Standard knockout bracket convention: each next-round match takes winners
// of two adjacent matches from the previous round. Hardcoded to match
// FIFA's tournament structure.
const QF_FEEDER_PAIRS = [[1, 2], [3, 4], [5, 6], [7, 8]]
const SF_FEEDER_PAIRS = [[1, 2], [3, 4]]
const FINAL_FEEDER_PAIRS = [[1, 2]]

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
	const { r32Positions } = structure

	// Scoreboard view of which event IDs are actually R32.
	const scoreboardR32EventIds = new Set(
		scoreboardBracketEvents.filter(e => e.stage === 'r32' && e.eventId).map(e => e.eventId)
	)

	// Build FIFA visual position (1-16) → R32 event ID map.
	//
	// ESPN's bracketLocation field is offset by 1 from FIFA's visual position:
	// the page metadata leaves position 1 (GER/PAR in the 2026 bracket) out
	// of the bracketLocation sequence and adds it as an orphan with a stale
	// "bracketLocation 16" reference. Every other R32 event has
	// bracketLocation = visualPosition - 1. Reconcile by assigning the
	// orphan to visualPosition 1 and shifting the rest up.
	const fifaPositionToEventId = new Map()
	for (const [eventId, bracketLoc] of r32Positions) {
		if (scoreboardR32EventIds.has(eventId)) {
			fifaPositionToEventId.set(bracketLoc + 1, eventId)
		}
	}
	const assigned = new Set(fifaPositionToEventId.values())
	const orphans = [...scoreboardR32EventIds].filter(id => !assigned.has(id))
	for (let pos = 1; pos <= STAGE_COUNT.r32 && orphans.length > 0; pos++) {
		if (!fifaPositionToEventId.has(pos)) {
			fifaPositionToEventId.set(pos, orphans.shift())
		}
	}

	// Scoreboard event lookup for live scores/status.
	const scoreboardByEventId = new Map()
	for (const e of scoreboardBracketEvents) {
		if (e.eventId) scoreboardByEventId.set(e.eventId, e)
	}

	const out = {}
	for (const stage of KNOCKOUT_STAGES) out[stage] = []

	// R32 — emit one entry per FIFA visual position, ordered 1..16.
	for (let pos = 1; pos <= STAGE_COUNT.r32; pos++) {
		const eventId = fifaPositionToEventId.get(pos)
		const sb = eventId ? scoreboardByEventId.get(eventId) : null
		out.r32.push(buildR32Entry(pos, eventId, sb))
	}

	// R16/QF/SF/Final — derive from hardcoded FIFA pairings of previous-stage
	// visual positions. Each pair becomes one bracket entry with feeder
	// references pointing back to the previous stage's events.
	const prevEventIds = { r32: fifaPositionToEventId }
	const stageFeederPairs = { r16: R16_FEEDER_PAIRS, qf: QF_FEEDER_PAIRS, sf: SF_FEEDER_PAIRS, final: FINAL_FEEDER_PAIRS }
	const prevStageFor = { r16: 'r32', qf: 'r16', sf: 'qf', final: 'sf' }

	for (const stage of ['r16', 'qf', 'sf', 'final']) {
		const pairs = stageFeederPairs[stage]
		const prevStage = prevStageFor[stage]
		const prevMap = prevEventIds[prevStage]
		const stageMap = new Map()

		pairs.forEach(([a, b], i) => {
			const slot = i + 1
			const homeFeederEventId = prevMap.get(a)
			const awayFeederEventId = prevMap.get(b)
			// Match a scoreboard event for this slot by finding the event whose
			// resolved competitors include the feeder winners. Falls back to null
			// when the next-round event hasn't been scheduled / scraped yet.
			const sb = findScoreboardForFeeders(scoreboardBracketEvents, stage, homeFeederEventId, awayFeederEventId, out[prevStage])
			const entry = buildR16PlusEntry(slot, sb, homeFeederEventId, awayFeederEventId)
			out[stage].push(entry)
			if (sb?.eventId) stageMap.set(slot, sb.eventId)
		})

		prevEventIds[stage] = stageMap
	}

	return out
}

function findScoreboardForFeeders(scoreboardBracketEvents, stage, homeFeederEventId, awayFeederEventId, prevStageEntries) {
	// Only match scoreboard events when BOTH feeders have known winners AND
	// the scoreboard event contains both of those teams. ESPN's scoreboard
	// R16+ placeholder pairings don't always match the bracket image's
	// pairings, so partial matches lead to wrong slot assignments
	// (e.g. Canada-only matches against any R16 placeholder containing
	// Canada, regardless of whether the OTHER side belongs to that pair).
	const winnerFor = (feederEventId) => {
		const e = prevStageEntries.find(p => p.eventId === feederEventId)
		return e?.winnerId
	}
	const homeWinner = winnerFor(homeFeederEventId)
	const awayWinner = winnerFor(awayFeederEventId)
	if (!homeWinner || !awayWinner) return null

	return scoreboardBracketEvents.find(e => {
		if (e.stage !== stage) return false
		const teamIds = [e.home?.teamId, e.away?.teamId].filter(Boolean)
		return teamIds.includes(homeWinner) && teamIds.includes(awayWinner)
	}) || null
}

/**
 * Resolve the advancing team. Regulation/ET is decided on score; a level
 * score (a knockout draw) is decided by the penalty shootout. Returns
 * undefined when undecided — missing teams, or a draw with no shootout data
 * yet (e.g. ESPN hasn't posted the kicks).
 */
function decideWinnerId(homeId, awayId, homeScore, awayScore, homeShootout, awayShootout) {
	if (!homeId || !awayId) return undefined
	if (homeScore > awayScore) return homeId
	if (awayScore > homeScore) return awayId
	if (typeof homeShootout === 'number' && typeof awayShootout === 'number' && homeShootout !== awayShootout) {
		return homeShootout > awayShootout ? homeId : awayId
	}
	return undefined
}

/** Copy penalty-shootout kicks onto an entry when present. */
function applyShootout(entry, src) {
	if (typeof src?.homeShootout === 'number') entry.homeShootout = src.homeShootout
	if (typeof src?.awayShootout === 'number') entry.awayShootout = src.awayShootout
}

/** Set winnerId from the entry's current score + shootout, when FINISHED. */
function applyWinner(entry) {
	if (entry.status !== 'FINISHED') return
	const w = decideWinnerId(entry.homeId, entry.awayId, entry.homeScore, entry.awayScore, entry.homeShootout, entry.awayShootout)
	if (w) entry.winnerId = w
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
	applyShootout(entry, sb)
	applyWinner(entry)
	return entry
}

function buildR16PlusEntry(bracketLocation, sb, homeFeederEventId, awayFeederEventId) {
	const entry = {
		eventId: sb?.eventId ?? null,
		bracketLocation,
		date: sb?.date ?? null,
		venue: sb?.venue ?? null,
		status: sb?.status ?? 'SCHEDULED',
		homeScore: sb?.homeScore ?? 0,
		awayScore: sb?.awayScore ?? 0,
	}

	if (sb?.home?.teamId) entry.homeId = sb.home.teamId
	else if (homeFeederEventId) entry.homeFeederEventId = homeFeederEventId

	if (sb?.away?.teamId) entry.awayId = sb.away.teamId
	else if (awayFeederEventId) entry.awayFeederEventId = awayFeederEventId

	applyShootout(entry, sb)
	applyWinner(entry)

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
		applyShootout(entry, e)
		applyWinner(entry)
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
			applyShootout(entry, m)
			applyWinner(entry)
			out[stage].push(entry)
		}
	}

	for (const stage of KNOCKOUT_STAGES) {
		out[stage].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.homeId ?? '').localeCompare(b.homeId ?? ''))
	}
	return out
}

export { STAGE_COUNT }
