import { NAME_TO_ID } from './teams.js'
import { GROUP_SCHEDULE } from './tournament.js'
import { tryFetch, log } from './fetchUtil.js'

const ESPN_SCOREBOARD_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'
const ESPN_BRACKET_PAGE    = 'https://www.espn.com/soccer/bracket/_/tournamentId/fifa.world'

// Map ESPN's season.slug to our stage key.
const SLUG_TO_STAGE = {
	'round-of-32':      'r32',
	'round-of-16':      'r16',
	'quarterfinals':    'qf',
	'semifinals':       'sf',
	'3rd-place':        '3p',
	'final':            'final',
}

// Parse ESPN placeholder competitor names (e.g. "Round of 32 8 Winner",
// "Quarterfinals 2 Winner") into a feeder reference. Returns null when the
// string isn't a placeholder — i.e. it's a real team name we can resolve via
// NAME_TO_ID.
const PLACEHOLDER_RE = /^(?:Round of (\d+)|Quarterfinals|Semifinals)\s+(\d+)\s+Winner$/i
function parsePlaceholder(name) {
	if (!name) return null
	const m = name.match(PLACEHOLDER_RE)
	if (!m) return null
	const round = m[1] ? `r${m[1]}` : (name.toLowerCase().startsWith('quarterfinals') ? 'qf' : 'sf')
	return { feederStage: round, feederNumber: parseInt(m[2], 10) }
}

function todayUTC()     { return new Date().toISOString().split('T')[0] }
function yesterdayUTC() {
	const d = new Date()
	d.setUTCDate(d.getUTCDate() - 1)
	return d.toISOString().split('T')[0]
}

/**
 * Fetch every match (with live scores, scorers, cards, broadcasts, venue) from
 * ESPN's free scoreboard across a date range. Also flags which teams played
 * today or yesterday — the script uses that to decide which teams need full
 * recalculation vs. carry-forward.
 *
 * Returns { matches, scorers, cards, activeTeams }:
 *   matches      Map<"homeId:awayId", MergedMatch>
 *   scorers      Record<teamId, ScorerEntry[]>
 *   cards        Record<teamId, CardEntry[]>
 *   activeTeams  Set<teamId>
 */
export async function fetchESPNEventDetails(dateFrom, dateTo) {
	const scorers = {}
	const cards = {}
	const matches = new Map()
	const activeTeams = new Set()
	// All knockout events (including ones where one or both sides are still
	// placeholders like "Round of 32 8 Winner"). Used to build the bracket
	// feeder map so we don't have to guess R16+ pairings.
	const bracketEvents = []

	const start = new Date(dateFrom + 'T00:00:00Z')
	const end   = new Date(dateTo   + 'T00:00:00Z')
	const dates = []
	for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
		dates.push(d.toISOString().split('T')[0].replace(/-/g, ''))
	}

	const today     = todayUTC()
	const yesterday = yesterdayUTC()

	let fetched = 0
	for (const date of dates) {
		const data = await tryFetch(`${ESPN_SCOREBOARD_BASE}?dates=${date}`)
		if (!data?.events?.length) continue
		fetched++

		for (const event of data.events) {
			const eventId   = String(event.id)
			const eventDate = event.date?.split('T')[0]
			const eventTime = event.date || ''
			const stageKey  = SLUG_TO_STAGE[event.season?.slug] || null
			const competition = event.competitions?.[0]
			const competitors = competition?.competitors || []
			const homeComp = competitors.find(c => c.homeAway === 'home')
			const awayComp = competitors.find(c => c.homeAway === 'away')
			const matchStr = `${homeComp?.team?.displayName || '?'} vs ${awayComp?.team?.displayName || '?'}`

			const homeName = homeComp?.team?.displayName
			const awayName = awayComp?.team?.displayName
			const homeId = NAME_TO_ID[homeName] || null
			const awayId = NAME_TO_ID[awayName] || null
			const homePlaceholder = homeId ? null : parsePlaceholder(homeName)
			const awayPlaceholder = awayId ? null : parsePlaceholder(awayName)

			// ── Match result extraction ──────────────────────────────────
			const statusType   = competition?.status?.type
			const statusState  = statusType?.state         // 'pre' | 'in' | 'post'
			const statusDetail = statusType?.detail
			const isFinished   = statusState === 'post'
			const isInProgress = statusState === 'in'
			const matchStatus  = isFinished ? 'FINISHED' : isInProgress ? 'IN_PROGRESS' : 'SCHEDULED'
			const matchClock   = isInProgress ? (statusDetail || 'LIVE') : ''

			const broadcasts = (competition?.geoBroadcasts ?? [])
				.map(b => b.media?.shortName)
				.filter(Boolean)
				.filter((v, i, a) => a.indexOf(v) === i)

			const venueName = competition?.venue?.fullName || ''
			const venueCity = competition?.venue?.address?.city || ''
			const venue = venueName && venueCity ? `${venueName}, ${venueCity}` : (venueName || venueCity || '')

			const hScore = parseInt(homeComp?.score, 10) || 0
			const aScore = parseInt(awayComp?.score, 10) || 0

			if (homeId && awayId) {
				const key = `${homeId}:${awayId}`
				if (!matches.has(key)) {
					matches.set(key, {
						eventId,
						homeId, awayId, homeScore: hScore, awayScore: aScore,
						status: matchStatus, date: eventDate, clock: matchClock,
						broadcasts, time: eventTime, venue,
					})
				}
			}

			// Knockout event (whether fully populated or still a placeholder).
			// Keeps the feeder structure intact for the bracket-pairing logic.
			if (stageKey && stageKey !== '3p') {
				bracketEvents.push({
					eventId, stage: stageKey, date: eventDate, time: eventTime,
					status: matchStatus,
					venue,
					home: homeId ? { teamId: homeId } : (homePlaceholder ?? { tbd: true }),
					away: awayId ? { teamId: awayId } : (awayPlaceholder ?? { tbd: true }),
					homeScore: hScore, awayScore: aScore,
				})
			}

			// Active = team played today or yesterday → full recalc needed.
			if ((eventDate === today || eventDate === yesterday) && homeId && awayId) {
				activeTeams.add(homeId)
				activeTeams.add(awayId)
			}

			// ── Scorer / card extraction ─────────────────────────────────
			const teamIdByEspn = {}
			for (const c of competitors) {
				const ourId = NAME_TO_ID[c.team?.displayName]
				if (ourId) teamIdByEspn[String(c.team?.id)] = ourId
			}

			const details = competition?.details || []
			for (const d of details) {
				if (d.scoringPlay) {
					const ourId = teamIdByEspn[String(d.team?.id)]
					if (!ourId) continue
					const athlete = d.athletesInvolved?.[0]
					if (!athlete?.displayName) continue
					const type = d.type?.text || 'Goal'
					const minute = d.clock?.displayValue || '?'
					const label = type === 'Own Goal'
						? `${athlete.displayName} OG ${minute}`
						: type.includes('Penalty')
							? `${athlete.displayName} ${minute} (P)`
							: `${athlete.displayName} ${minute}`
					if (!scorers[ourId]) scorers[ourId] = []
					scorers[ourId].push({ name: athlete.displayName, minute, type, matchStr, label, date: eventDate })
				} else if (d.yellowCard || d.redCard) {
					const ourId = teamIdByEspn[String(d.team?.id)]
					if (!ourId) continue
					const athlete = d.athletesInvolved?.[0]
					if (!athlete?.displayName) continue
					const cardType = d.redCard ? 'red' : 'yellow'
					const minute = d.clock?.displayValue || '?'
					if (!cards[ourId]) cards[ourId] = []
					cards[ourId].push({ player: athlete.displayName, minute, type: cardType, date: eventDate })
				}
			}
		}
	}

	if (fetched > 0) {
		const totalS = Object.values(scorers).reduce((s, arr) => s + arr.length, 0)
		const totalC = Object.values(cards).reduce((s, arr) => s + arr.length, 0)
		log(`ESPN: ${totalS} scorer + ${totalC} card entries across ${Object.keys(scorers).length}/${Object.keys(cards).length} teams (${fetched} dates)`)
	}
	log(`ESPN matches: ${matches.size} extracted, ${activeTeams.size} active teams (${bracketEvents.length} knockout events incl. placeholders)`)
	return { matches, scorers, cards, activeTeams, bracketEvents }
}

/**
 * Fetch ESPN's bracket page and extract the authoritative bracket structure.
 *
 * Why this exists: the scoreboard endpoint we use for match data does NOT
 * expose FIFA's bracket position, and its R16+ placeholder event names
 * use a different (less reliable) numbering than the bracket page. ESPN's
 * bracket page encodes the canonical structure via `bracketLocation`
 * (1-16 for R32, etc.) and references feeder rounds by that same number.
 * Without this mapping the feeder graph collapses to wrong pairings
 * (e.g. the 2026-06-29 bug where BEL/SEN got paired with FRA/SWE instead
 * of the correct USA/BIH).
 *
 * Returns {
 *   r32Positions: Map<eventId, bracketLocation>,   // 16 entries when complete
 *   bracketEvents: Array<{                          // R16/QF/SF/Final
 *     eventId, matchupId, bracketLocation, roundId, matchNumber, stage,
 *     homeFeederLocation?, awayFeederLocation?,    // feeder bracketLocation in PREV stage
 *     homeFeederRoundId?, awayFeederRoundId?,      // round of the feeder
 *     homeId?, awayId?,                            // resolved when ESPN updates
 *   }>
 * }
 *
 * On fetch error returns empty results — caller falls back to scoreboard-
 * derived placeholder parsing.
 */
const ROUND_ID_TO_STAGE = { 1: 'r32', 2: 'r16', 3: 'qf', 4: 'sf', 5: 'final' }

export async function fetchESPNBracketStructure() {
	const empty = { r32Positions: new Map(), bracketEvents: [] }
	try {
		const res = await fetch(ESPN_BRACKET_PAGE, {
			headers: { 'User-Agent': 'Mozilla/5.0 road-to-the-final' },
		})
		if (!res.ok) {
			log(`⚠  Bracket page fetch failed: HTTP ${res.status}`)
			return empty
		}
		const html = await res.text()
		return parseBracketPage(html)
	} catch (e) {
		log(`⚠  Bracket page fetch error: ${e.message}`)
		return empty
	}
}

function parseBracketPage(html) {
	const r32Positions = new Map()
	const bracketEvents = []

	// Find every matchup metadata block; record its starting offset to slice
	// each record cleanly without greedy regex bleed.
	const meta = []
	const metaRe = /"matchNumber":"(Match \d+)","bracketLocation":(\d+),"matchupId":"(\d+)","roundId":(\d+)\}/g
	let m
	while ((m = metaRe.exec(html)) !== null) {
		meta.push({
			matchNumber: m[1],
			bracketLocation: parseInt(m[2], 10),
			matchupId: m[3],
			roundId: parseInt(m[4], 10),
			start: m.index,
			end: m.index + m[0].length,
		})
	}

	for (let i = 0; i < meta.length; i++) {
		const rec = meta[i]
		const nextStart = i + 1 < meta.length ? meta[i + 1].start : rec.end + 5000
		const chunk = html.slice(rec.end, nextStart)
		// Event ID appears as: "date":"...","id":"760XXX","link":"/soccer/match
		const eventIdMatch = chunk.match(/"id":"(\d+)","link":"\/soccer\/match/)
		const eventId = eventIdMatch?.[1]
		// Competitor sides
		const c1 = chunk.match(/"competitorOne":\{[^{}]*?"location":"([^"]+)"/)
		const c2 = chunk.match(/"competitorTwo":\{[^{}]*?"location":"([^"]+)"/)

		const stage = ROUND_ID_TO_STAGE[rec.roundId]
		if (!stage) continue

		if (rec.roundId === 1) {
			// R32: record bracketLocation → eventId
			if (eventId && !r32Positions.has(eventId)) r32Positions.set(eventId, rec.bracketLocation)
		} else {
			// R16+: capture feeder bracketLocations from competitor labels
			const homeFeeder = parsePageFeederLocation(c1?.[1])
			const awayFeeder = parsePageFeederLocation(c2?.[1])
			bracketEvents.push({
				eventId,
				matchupId: rec.matchupId,
				bracketLocation: rec.bracketLocation,
				matchNumber: rec.matchNumber,
				roundId: rec.roundId,
				stage,
				homeFeederLocation: homeFeeder?.location,
				homeFeederRoundId: homeFeeder?.roundId,
				awayFeederLocation: awayFeeder?.location,
				awayFeederRoundId: awayFeeder?.roundId,
			})
		}
	}

	log(`ESPN bracket page: ${r32Positions.size} R32 positions + ${bracketEvents.length} R16+ records`)
	return { r32Positions, bracketEvents }
}

// Bracket-page competitor location strings:
//   "Round of 32 7 Winner" → { location: 7, roundId: 1 }
//   "Round of 16 5 Winner" → { location: 5, roundId: 2 }
//   "Quarterfinals 2 Winner" → { location: 2, roundId: 3 }
function parsePageFeederLocation(label) {
	if (!label) return null
	let m = label.match(/^Round of 32\s+(\d+)\s+Winner$/i)
	if (m) return { location: parseInt(m[1], 10), roundId: 1 }
	m = label.match(/^Round of 16\s+(\d+)\s+Winner$/i)
	if (m) return { location: parseInt(m[1], 10), roundId: 2 }
	m = label.match(/^Quarterfinals?\s+(\d+)\s+Winner$/i)
	if (m) return { location: parseInt(m[1], 10), roundId: 3 }
	m = label.match(/^Semifinals?\s+(\d+)\s+Winner$/i)
	if (m) return { location: parseInt(m[1], 10), roundId: 4 }
	return null
}

// Back-compat alias: callers that only need the position map can use this.
export async function fetchESPNBracketPositions() {
	const { r32Positions } = await fetchESPNBracketStructure()
	return r32Positions
}

/**
 * Replace ESPN's UTC kickoff dates with the GROUP_SCHEDULE local venue dates.
 * Without this, late-night Pacific games (kickoff 7pm PT = 02:00Z next day)
 * end up in the next day's bucket and the UI shows them on the wrong day.
 */
export function normalizeESPNCalendarDates(espnMatches, espnScorers, espnCards) {
	const sched = new Map()
	for (const games of Object.values(GROUP_SCHEDULE)) {
		for (const g of games) {
			sched.set(`${g.h}:${g.a}`, g.d)
			sched.set(`${g.a}:${g.h}`, g.d)
		}
	}

	let normalized = 0
	for (const [key, match] of espnMatches) {
		const localDate = sched.get(key)
		if (!localDate || localDate === match.date) continue

		const oldDate = match.date
		match.date = localDate
		normalized++

		const [homeId, awayId] = key.split(':')
		for (const teamId of [homeId, awayId]) {
			const scorers = espnScorers[teamId]
			if (scorers) for (const s of scorers) if (s.date === oldDate) s.date = localDate
			const cards = espnCards[teamId]
			if (cards) for (const c of cards) if (c.date === oldDate) c.date = localDate
		}
	}

	if (normalized > 0) log(`Normalized ${normalized} match dates from UTC → local venue time`)
}
