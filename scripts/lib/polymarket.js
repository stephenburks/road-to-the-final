import { nameToId, ID_TO_PM_TLAS } from './teams.js'
import { tryFetch, FETCH_ERROR, log } from './fetchUtil.js'

const POLYMARKET_EVENT_URL = 'https://gamma-api.polymarket.com/events'

const GROUP_SLUGS = 'abcdefghijkl'.split('').map(l => `world-cup-group-${l}-winner`)

const TOURNAMENT_SLUGS = {
	r32:    'world-cup-team-to-advance-to-knockout-stages',
	r16:    'world-cup-nation-to-reach-round-of-16',
	qf:     'world-cup-nation-to-reach-quarterfinals',
	sf:     'world-cup-nation-to-reach-semifinals',
	final:  'world-cup-nation-to-reach-final',
	winner: 'world-cup-winner',
}

function validatePolymarketResponse(data) {
	if (!Array.isArray(data)) throw new Error('Invalid polymarket response: expected array')
	return data
}

function parseEvent(data, target) {
	validatePolymarketResponse(data)
	const markets = data[0]?.markets || []
	for (const m of markets) {
		const name = m.groupItemTitle || ''
		const id = nameToId(name)
		if (!id) {
			// Surface unmapped names that aren't known non-team entries.
			if (name && name !== 'Other' && !name.startsWith('Team ') && name !== 'Field') {
				log(`⚠  Polymarket unmapped: "${name}"`)
			}
			continue
		}
		let prices
		try { prices = JSON.parse(m.outcomePrices || '[]') } catch { continue }
		const yesPct = parseFloat(prices[0])
		if (isNaN(yesPct)) continue
		target[id] = Math.round(yesPct * 100)
	}
}

/**
 * Fetch all 18 Polymarket stage + group-winner events (12 group winners + 6
 * tournament stages). Returns { group, r32, r16, qf, sf, final, winner } —
 * each entry is { teamId → integer percent }.
 */
export async function fetchPolymarketAll() {
	const result = { group: {}, r32: {}, r16: {}, qf: {}, sf: {}, final: {}, winner: {} }

	for (const slug of GROUP_SLUGS) {
		const data = await tryFetch(`${POLYMARKET_EVENT_URL}?slug=${slug}&limit=1`)
		if (data === FETCH_ERROR || !data?.length) {
			log(`⚠  Polymarket event not found: ${slug}`)
			continue
		}
		parseEvent(data, result.group)
	}
	log(`Polymarket group winners: ${Object.keys(result.group).length} teams`)

	for (const [stage, slug] of Object.entries(TOURNAMENT_SLUGS)) {
		const data = await tryFetch(`${POLYMARKET_EVENT_URL}?slug=${slug}&limit=1`)
		if (data === FETCH_ERROR || !data?.length) {
			log(`⚠  Polymarket event not found: ${slug}`)
			continue
		}
		parseEvent(data, result[stage])
		log(`Polymarket ${stage}: ${Object.keys(result[stage]).length} teams`)
	}

	const allIds = [...new Set(Object.values(result).flatMap(Object.keys))]
	log(`Polymarket combined: ${allIds.length} unique teams across all stages`)
	return result
}

/**
 * Per-matchup odds from the `fifwc-{home}-{away}-{date}` event slug. Returns
 * { homeId, awayId, homeWinPct, awayWinPct, drawPct, eventSlug } or null.
 *
 * Polymarket uses ISO 3166-1 alpha-3 codes for matchup slugs (not FIFA TLAs);
 * the team registry's polymarketTlas field captures the alt codes per team.
 * We try every {primary, alt} TLA × {home-first, away-first} × {match-date,
 * UTC-date} combination — handles late-night kickoffs that roll to next UTC
 * day, and Polymarket's inconsistent use of 'kor' vs 'kr' for South Korea.
 */
export async function fetchMatchupOdds(homeId, awayId, date, time) {
	const homeTlas = ID_TO_PM_TLAS[homeId]
	const awayTlas = ID_TO_PM_TLAS[awayId]
	if (!homeTlas?.length || !awayTlas?.length) return null

	const trySlug = async (slug) => {
		const data = await tryFetch(`${POLYMARKET_EVENT_URL}?slug=${slug}`)
		if (data === FETCH_ERROR || !Array.isArray(data) || data.length === 0) return null
		return data[0]
	}

	const dates = [date]
	if (time) {
		const utcDate = new Date(time).toISOString().slice(0, 10)
		if (utcDate && utcDate !== date) dates.push(utcDate)
	}

	let event = null, matchedHomeTla = null, matchedAwayTla = null
	outer: for (const d of dates) {
		for (const h of homeTlas) {
			for (const a of awayTlas) {
				const fwd = await trySlug(`fifwc-${h}-${a}-${d}`)
				if (fwd) { event = fwd; matchedHomeTla = h; matchedAwayTla = a; break outer }
				const rev = await trySlug(`fifwc-${a}-${h}-${d}`)
				if (rev) { event = rev; matchedHomeTla = h; matchedAwayTla = a; break outer }
			}
		}
	}
	if (!event?.markets?.length) return null

	const pricePct = (priceStr) => {
		try {
			const parsed = JSON.parse(priceStr || '[]')
			const yes = parseFloat(parsed[0])
			return isNaN(yes) ? null : Math.round(yes * 100)
		} catch { return null }
	}

	let homeWinPct = null, awayWinPct = null, drawPct = null
	for (const m of event.markets) {
		const slug = m.slug || ''
		const pct = pricePct(m.outcomePrices)
		if (pct == null) continue
		if (slug.endsWith('-draw')) drawPct = pct
		else if (slug.endsWith(`-${matchedHomeTla}`)) homeWinPct = pct
		else if (slug.endsWith(`-${matchedAwayTla}`)) awayWinPct = pct
	}

	if (homeWinPct == null && awayWinPct == null && drawPct == null) return null
	return {
		homeId, awayId,
		homeWinPct: homeWinPct ?? 0,
		awayWinPct: awayWinPct ?? 0,
		drawPct:    drawPct    ?? 0,
		eventSlug:  event.slug,
	}
}

/**
 * Mutates dailyMatches in place: attaches polymarket odds to every active
 * (SCHEDULED or IN_PROGRESS) match. On transient Polymarket failures, falls
 * back to the previously-persisted odds from `existing.dailyMatches` rather
 * than dropping the field entirely.
 */
export async function attachMatchupOdds(dailyMatches, existing) {
	const all = Object.values(dailyMatches).flat()
	const pending = all.filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS')

	const prevOdds = new Map()
	const prevDaily = existing?.dailyMatches || {}
	for (const arr of Object.values(prevDaily)) {
		for (const m of arr) {
			if (m.polymarket) prevOdds.set(`${m.homeId}:${m.awayId}:${m.date}`, m.polymarket)
		}
	}

	const BATCH = 8
	let hits = 0, carried = 0
	for (let i = 0; i < pending.length; i += BATCH) {
		const slice = pending.slice(i, i + BATCH)
		await Promise.all(slice.map(async (m) => {
			const odds = await fetchMatchupOdds(m.homeId, m.awayId, m.date, m.time)
			if (odds) {
				m.polymarket = odds
				hits++
			} else {
				const prev = prevOdds.get(`${m.homeId}:${m.awayId}:${m.date}`)
				if (prev) { m.polymarket = prev; carried++ }
			}
		}))
	}
	log(`Polymarket matchup odds: ${hits} fresh + ${carried} carried-forward / ${pending.length} active matches`)
}
