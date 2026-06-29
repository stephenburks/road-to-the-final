import { NAME_TO_ID } from './teams.js'
import { GROUP_SCHEDULE } from './tournament.js'
import { tryFetch, log } from './fetchUtil.js'

const ESPN_SCOREBOARD_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

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
