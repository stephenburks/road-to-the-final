import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ESPN_SCOREBOARD_URL } from '../constants'
import { localDateStr } from '../utils'
import { getTeamIdByTLA } from '../components/ui/teamLookup'
import { useActiveMatchWindow } from './useActiveMatchWindow'
import type { AppData, Card } from '../types'

interface LiveMatchPatch {
	homeId: string
	awayId: string
	homeScore: number
	awayScore: number
	clock: string
	status: 'IN_PROGRESS' | 'FINISHED' | 'SCHEDULED'
	homeScorers: string[]
	awayScorers: string[]
	homeCards: Card[]
	awayCards: Card[]
	broadcasts: string[]
}

export type { LiveMatchPatch }

function ymd(dateStr: string): string {
	return dateStr.replace(/-/g, '')
}

function nextDay(dateStr: string): string {
	const d = new Date(dateStr + 'T12:00:00Z')
	d.setUTCDate(d.getUTCDate() + 1)
	return d.toISOString().slice(0, 10)
}

function formatScorer(athlete: { displayName?: string } | undefined, type: string, minute: string): string {
	if (!athlete?.displayName) return ''
	if (type === 'Own Goal') return `${athlete.displayName} OG ${minute}`
	if (type.includes('Penalty')) return `${athlete.displayName} ${minute} (P)`
	return `${athlete.displayName} ${minute}`
}

async function fetchScoreboardPatches(
	today: string,
	tomorrow: string,
	todayPairKeys: Set<string>,
	teams: AppData['teams'],
	signal: AbortSignal
): Promise<Map<string, LiveMatchPatch> | null> {
	// Fetch both today and tomorrow — ESPN buckets late-night games (e.g. 04:00Z)
	// under the next UTC date even though they belong to today's local match day.
	const ts = Date.now()
	const [todayJson, tomorrowJson] = await Promise.all([
		fetch(`${ESPN_SCOREBOARD_URL}?dates=${ymd(today)}&_=${ts}`, { signal }).then(r => r.json()),
		fetch(`${ESPN_SCOREBOARD_URL}?dates=${ymd(tomorrow)}&_=${ts}`, { signal }).then(r => r.json()),
	])
	const events = [...(todayJson?.events ?? []), ...(tomorrowJson?.events ?? [])]

	const next = new Map<string, LiveMatchPatch>()

	for (const event of events) {
		const competition = event.competitions?.[0]
		const competitors = competition?.competitors ?? []

		const homeComp = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')
		const awayComp = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')

		if (!homeComp || !awayComp) continue

		// Match by FIFA TLA (ESPN's `abbreviation`) rather than displayName —
		// ESPN's display names (e.g. "Congo DR") don't always match ours ("DR Congo").
		const homeId = getTeamIdByTLA(homeComp.team?.abbreviation)
		const awayId = getTeamIdByTLA(awayComp.team?.abbreviation)
		const homeTeam = homeId ? teams.find(t => t.id === homeId) : undefined
		const awayTeam = awayId ? teams.find(t => t.id === awayId) : undefined

		if (!homeTeam || !awayTeam) continue

		if (!todayPairKeys.has(`${homeTeam.id}:${awayTeam.id}`)) continue

		const statusState = competition?.status?.type?.state
		const statusDetail = competition?.status?.type?.detail
		const matchStatus = statusState === 'post' ? 'FINISHED' : statusState === 'in' ? 'IN_PROGRESS' : 'SCHEDULED'
		const clock = statusState === 'in' ? (statusDetail || 'LIVE') : ''

		if (matchStatus === 'SCHEDULED') continue

		const homeScorers: string[] = []
		const awayScorers: string[] = []
		const homeCards: Card[] = []
		const awayCards: Card[] = []

		const details = competition?.details ?? []
		for (const d of details) {
			if (d.scoringPlay) {
				const athlete = d.athletesInvolved?.[0]
				const type = d.type?.text || 'Goal'
				const minute = d.clock?.displayValue || '?'
				const label = formatScorer(athlete, type, minute)
				if (!label) continue
				const teamId = String(d.team?.id)
				if (teamId === String(homeComp.team?.id)) homeScorers.push(label)
				else if (teamId === String(awayComp.team?.id)) awayScorers.push(label)
			} else if (d.yellowCard || d.redCard) {
				const athlete = d.athletesInvolved?.[0]
				if (!athlete?.displayName) continue
				const card: Card = {
					player: athlete.displayName,
					minute: d.clock?.displayValue || '?',
					type: d.redCard ? 'red' : 'yellow',
				}
				const teamId = String(d.team?.id)
				if (teamId === String(homeComp.team?.id)) homeCards.push(card)
				else if (teamId === String(awayComp.team?.id)) awayCards.push(card)
			}
		}

		const broadcasts: string[] = []
		for (const b of (competition?.geoBroadcasts ?? [])) {
			if (b.media?.shortName) broadcasts.push(b.media.shortName)
		}

		const patch: LiveMatchPatch = {
			homeId: homeTeam.id,
			awayId: awayTeam.id,
			homeScore: parseInt(homeComp.score, 10) || 0,
			awayScore: parseInt(awayComp.score, 10) || 0,
			clock,
			status: matchStatus,
			homeScorers,
			awayScorers,
			homeCards,
			awayCards,
			broadcasts,
		}

		next.set(`${homeTeam.id}:${awayTeam.id}`, patch)
		next.set(`${awayTeam.id}:${homeTeam.id}`, patch)
	}

	return next.size > 0 ? next : null
}

export function useLiveScores(
	dailyMatches: AppData['dailyMatches'],
	teams: AppData['teams'],
	isHistorical: boolean
): Map<string, LiveMatchPatch> | null {
	const today = localDateStr()
	const tomorrow = nextDay(today)
	const todayMatches = useMemo(() => dailyMatches?.[today] ?? [], [dailyMatches, today])

	// Build a lookup of expected team-pair keys from today's schedule.
	// We use this instead of an event-date string comparison because ESPN
	// returns UTC timestamps: late US evening games (e.g. 01:00Z) have a
	// UTC date of tomorrow even though they belong to today's match day.
	const todayPairKeys = useMemo(() => {
		const keys = new Set<string>()
		for (const m of todayMatches as { homeId?: string; awayId?: string }[]) {
			if (m.homeId && m.awayId) {
				keys.add(`${m.homeId}:${m.awayId}`)
				keys.add(`${m.awayId}:${m.homeId}`)
			}
		}
		return keys
	}, [todayMatches])

	const activeWindow = useActiveMatchWindow(dailyMatches, today)
	const shouldPoll = !isHistorical && activeWindow

	const { data: patches = null } = useQuery({
		queryKey: ['liveScores', today, [...todayPairKeys].sort().join(',')],
		queryFn: ({ signal }) => fetchScoreboardPatches(today, tomorrow, todayPairKeys, teams, signal),
		enabled: shouldPoll,
		refetchInterval: shouldPoll ? 75_000 : false,
	})

	return patches
}
