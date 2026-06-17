import { useState, useEffect, useRef } from 'react'
import type { AppData, Card } from '../types'

interface LiveMatchPatch {
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

const ESPN_SCOREBOARD = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard'

function localDateStr(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function ymd(dateStr: string): string {
	return dateStr.replace(/-/g, '')
}

function formatScorer(athlete: { displayName?: string } | undefined, type: string, minute: string): string {
	if (!athlete?.displayName) return ''
	if (type === 'Own Goal') return `${athlete.displayName} OG ${minute}`
	if (type.includes('Penalty')) return `${athlete.displayName} ${minute} (P)`
	return `${athlete.displayName} ${minute}`
}

export function useLiveScores(
	dailyMatches: AppData['dailyMatches'],
	teams: AppData['teams'],
	isHistorical: boolean
): Map<string, LiveMatchPatch> | null {
	const [patches, setPatches] = useState<Map<string, LiveMatchPatch> | null>(null)
	const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
	const teamsRef = useRef(teams)

	useEffect(() => {
		teamsRef.current = teams
	}, [teams])

	useEffect(() => {
		if (isHistorical) {
			setPatches(null) // eslint-disable-line react-hooks/set-state-in-effect
			return
		}

		const today = localDateStr()
		const todayMatches = dailyMatches?.[today] ?? []

		if (todayMatches.length === 0) {
			setPatches(null)
			return
		}

		let cancelled = false

		async function poll() {
			try {
				const res = await fetch(`${ESPN_SCOREBOARD}?dates=${ymd(today)}&_=${Date.now()}`)
				const json = await res.json()
				const events = json?.events ?? []

				if (cancelled) return

				const next = new Map<string, LiveMatchPatch>()
				const currentTeams = teamsRef.current

				for (const event of events) {
					const eventDate = event.date?.split('T')[0]
					if (eventDate !== today) continue

					const competition = event.competitions?.[0]
					const competitors = competition?.competitors ?? []

					const homeComp = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')
					const awayComp = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')

					if (!homeComp || !awayComp) continue

					const homeTeam = currentTeams.find(t => t.name === homeComp.team?.displayName)
					const awayTeam = currentTeams.find(t => t.name === awayComp.team?.displayName)

					if (!homeTeam || !awayTeam) continue

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

				if (cancelled) return

				setPatches(next.size > 0 ? next : null)
			} catch (err) {
				if (!cancelled) console.error('Live scores poll failed:', err)
			}
		}

		poll()
		intervalRef.current = setInterval(poll, 75000)

		return () => {
			cancelled = true
			if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null }
		}
	}, [dailyMatches, isHistorical])

	return patches
}
