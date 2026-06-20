import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { localDateStr } from '../utils'
import { NAME_TO_ID } from '../components/ui/teamLookup'
import type { AppData } from '../types'
import type { LiveMatchPatch } from './useLiveScores'

const POLYMARKET_EVENT_URL = 'https://gamma-api.polymarket.com/events'

// Same slugs the build script fetches — see scripts/update-data.js.
const STAGE_SLUGS: Record<string, string> = {
	r32:    'world-cup-team-to-advance-to-knockout-stages',
	r16:    'world-cup-nation-to-reach-round-of-16',
	qf:     'world-cup-nation-to-reach-quarterfinals',
	sf:     'world-cup-nation-to-reach-semifinals',
	final:  'world-cup-nation-to-reach-final',
	winner: 'world-cup-winner',
}

const GROUP_LETTERS = 'abcdefghijkl'.split('')

const PM_ALIAS: Record<string, string> = {
	'Bosnia-Herzegovina': 'bosnia',
	'Turkiye': 'turkey',
}

function pmNameToId(name: string | undefined): string | null {
	if (!name) return null
	if (PM_ALIAS[name]) return PM_ALIAS[name]
	return NAME_TO_ID[name] || null
}

export interface LiveTournamentProbs {
	winner: Record<string, number>
	r32: Record<string, number>
	r16: Record<string, number>
	qf: Record<string, number>
	sf: Record<string, number>
	final: Record<string, number>
	group: Record<string, number>
}

async function fetchEvent(slug: string, signal: AbortSignal): Promise<{ [teamId: string]: number }> {
	const res = await fetch(`${POLYMARKET_EVENT_URL}?slug=${slug}`, { signal })
	if (!res.ok) return {}
	const data = await res.json()
	const event = Array.isArray(data) ? data[0] : null
	if (!event?.markets?.length) return {}

	const out: Record<string, number> = {}
	for (const m of event.markets as { groupItemTitle?: string; outcomePrices?: string }[]) {
		const id = pmNameToId(m.groupItemTitle)
		if (!id) continue
		let prices: string[]
		try {
			prices = JSON.parse(m.outcomePrices || '[]')
		} catch {
			continue
		}
		const yes = parseFloat(prices[0])
		if (isNaN(yes)) continue
		out[id] = Math.round(yes * 100)
	}
	return out
}

async function fetchAll(signal: AbortSignal): Promise<LiveTournamentProbs> {
	const stageEntries = Object.entries(STAGE_SLUGS)
	const groupSlugs = GROUP_LETTERS.map(l => `world-cup-group-${l}-winner`)

	const [stageResults, groupResults] = await Promise.all([
		Promise.all(stageEntries.map(([, slug]) => fetchEvent(slug, signal))),
		Promise.all(groupSlugs.map(slug => fetchEvent(slug, signal))),
	])

	const stages: Record<string, Record<string, number>> = {}
	stageEntries.forEach(([key], i) => { stages[key] = stageResults[i] })

	const group: Record<string, number> = {}
	for (const partial of groupResults) Object.assign(group, partial)

	return {
		winner: stages.winner ?? {},
		r32: stages.r32 ?? {},
		r16: stages.r16 ?? {},
		qf: stages.qf ?? {},
		sf: stages.sf ?? {},
		final: stages.final ?? {},
		group,
	}
}

/**
 * Polls the 18 Polymarket stage + group-winner events at 75s when any of
 * today's matches is IN_PROGRESS (per static data or per live patch).
 */
export function useLiveTournamentProbs(
	dailyMatches: AppData['dailyMatches'],
	livePatches: Map<string, LiveMatchPatch> | null,
	isHistorical: boolean
): LiveTournamentProbs | null {
	const today = localDateStr()

	const anyLive = useMemo(() => {
		const todayMatches = dailyMatches?.[today] ?? []
		for (const m of todayMatches) {
			const patch = livePatches?.get(`${m.homeId}:${m.awayId}`)
			const effectiveStatus = patch?.status ?? m.status
			if (effectiveStatus === 'IN_PROGRESS') return true
		}
		return false
	}, [dailyMatches, today, livePatches])

	const shouldPoll = !isHistorical && anyLive

	const { data = null } = useQuery({
		queryKey: ['liveTournamentProbs'],
		queryFn: ({ signal }) => fetchAll(signal),
		enabled: shouldPoll,
		refetchInterval: shouldPoll ? 75_000 : false,
		staleTime: 30_000,
	})

	return data
}
