import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { localDateStr } from '../utils'
import type { AppData, MatchupOdds } from '../types'
import type { LiveMatchPatch } from './useLiveScores'

const POLYMARKET_EVENT_URL = 'https://gamma-api.polymarket.com/events'

interface LiveMatch {
	homeId: string
	awayId: string
	eventSlug: string
}

async function fetchOddsForSlug(slug: string, signal: AbortSignal): Promise<MatchupOdds | null> {
	const res = await fetch(`${POLYMARKET_EVENT_URL}?slug=${slug}`, { signal })
	if (!res.ok) return null
	const data = await res.json()
	const event = Array.isArray(data) ? data[0] : null
	if (!event?.markets?.length) return null

	const parts = slug.split('-')
	const homeTla = parts[1]
	const awayTla = parts[2]

	let homeWinPct: number | null = null
	let awayWinPct: number | null = null
	let drawPct: number | null = null

	for (const m of event.markets as { slug?: string; outcomePrices?: string }[]) {
		const mSlug = m.slug || ''
		let prices: string[]
		try {
			prices = JSON.parse(m.outcomePrices || '[]')
		} catch {
			continue
		}
		const yes = parseFloat(prices[0])
		if (isNaN(yes)) continue
		const pct = Math.round(yes * 100)
		if (mSlug.endsWith('-draw')) drawPct = pct
		else if (mSlug.endsWith(`-${homeTla}`)) homeWinPct = pct
		else if (mSlug.endsWith(`-${awayTla}`)) awayWinPct = pct
	}

	if (homeWinPct == null && awayWinPct == null && drawPct == null) return null
	return {
		homeWinPct: homeWinPct ?? 0,
		awayWinPct: awayWinPct ?? 0,
		drawPct: drawPct ?? 0,
		eventSlug: slug,
		// homeId/awayId left undefined here — the consumer passes the static
		// match's polymarket field (which has them) and we only overlay pcts.
	}
}

async function fetchAllOdds(matches: LiveMatch[], signal: AbortSignal): Promise<Map<string, MatchupOdds>> {
	const next = new Map<string, MatchupOdds>()
	const results = await Promise.all(
		matches.map(m => fetchOddsForSlug(m.eventSlug, signal).then(o => ({ m, o })))
	)
	for (const { m, o } of results) {
		if (!o) continue
		// Attach the static match's IDs so frontend orientation logic stays robust.
		const withIds: MatchupOdds = { ...o, homeId: m.homeId, awayId: m.awayId }
		next.set(`${m.homeId}:${m.awayId}`, withIds)
		next.set(`${m.awayId}:${m.homeId}`, withIds)
	}
	return next
}

/**
 * Polls Polymarket matchup events at 75s cadence for any match that's
 * currently IN_PROGRESS (per static data or per live patches from
 * useLiveScores). Returns a Map keyed by both `homeId:awayId` directions.
 */
export function useLiveOdds(
	dailyMatches: AppData['dailyMatches'],
	livePatches: Map<string, LiveMatchPatch> | null,
	isHistorical: boolean
): Map<string, MatchupOdds> | null {
	const today = localDateStr()

	const liveMatches = useMemo<LiveMatch[]>(() => {
		const todayMatches = dailyMatches?.[today] ?? []
		const out: LiveMatch[] = []
		for (const m of todayMatches) {
			if (!m.polymarket?.eventSlug) continue
			const patch = livePatches?.get(`${m.homeId}:${m.awayId}`)
			const effectiveStatus = patch?.status ?? m.status
			if (effectiveStatus !== 'IN_PROGRESS') continue
			out.push({ homeId: m.homeId, awayId: m.awayId, eventSlug: m.polymarket.eventSlug })
		}
		return out
	}, [dailyMatches, today, livePatches])

	const shouldPoll = !isHistorical && liveMatches.length > 0

	const { data: odds = null } = useQuery({
		queryKey: ['liveOdds', liveMatches.map(m => m.eventSlug).sort().join(',')],
		queryFn: ({ signal }) => fetchAllOdds(liveMatches, signal),
		enabled: shouldPoll,
		refetchInterval: shouldPoll ? 75_000 : false,
		staleTime: 30_000,
	})

	return odds
}
