import { useState, useEffect } from 'react'
import { ESPN_SLUG_MAP } from '../data/tournamentSchedule'
import type { RosterPlayer } from '../types'

const ESPN_ROSTER_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams'

function parseStats(athlete: Record<string, unknown>): RosterPlayer['statistics'] {
	const stats: RosterPlayer['statistics'] = {
		appearances: 0, goals: 0, assists: 0,
		shots: 0, shotsOnTarget: 0, foulsCommitted: 0, foulsSuffered: 0,
		yellowCards: 0, redCards: 0, saves: 0, goalsConceded: 0,
	}
	const categories = (athlete.statistics as Record<string, unknown>)?.splits?.categories ?? []
	for (const cat of categories as Array<Record<string, unknown>>) {
		for (const s of (cat.stats as Array<Record<string, unknown>>) ?? []) {
			const name = s.name as string
			const value = s.value as number
			if (name === 'totalGoals') stats.goals = value ?? 0
			else if (name === 'goalAssists') stats.assists = value ?? 0
			else if (name === 'totalShots') stats.shots = value ?? 0
			else if (name === 'shotsOnTarget') stats.shotsOnTarget = value ?? 0
			else if (name === 'foulsCommitted') stats.foulsCommitted = value ?? 0
			else if (name === 'foulsSuffered') stats.foulsSuffered = value ?? 0
			else if (name === 'yellowCards') stats.yellowCards = value ?? 0
			else if (name === 'redCards') stats.redCards = value ?? 0
			else if (name === 'saves') stats.saves = value ?? 0
			else if (name === 'goalsConceded') stats.goalsConceded = value ?? 0
			else if (name === 'appearances') stats.appearances = value ?? 0
		}
	}
	return stats
}

function parseAthlete(raw: Record<string, unknown>): RosterPlayer {
	const position = raw.position as Record<string, string> | undefined
	return {
		id: String(raw.id ?? ''),
		displayName: String(raw.displayName ?? ''),
		shortName: String(raw.shortName ?? ''),
		jersey: String(raw.jersey ?? ''),
		position: {
			abbreviation: position?.abbreviation ?? '',
			name: position?.name ?? '',
		},
		age: Number(raw.age) || 0,
		headshot: raw.headshot ? { href: String((raw.headshot as Record<string, string>).href ?? '') } : undefined,
		statistics: parseStats(raw),
	}
}

const POSITION_ORDER: Record<string, number> = { G: 0, D: 1, M: 2, F: 3 }

export function sortByPosition(players: RosterPlayer[]): RosterPlayer[] {
	return [...players].sort((a, b) => {
		const pa = POSITION_ORDER[a.position.abbreviation] ?? 99
		const pb = POSITION_ORDER[b.position.abbreviation] ?? 99
		if (pa !== pb) return pa - pb
		return parseInt(a.jersey, 10) - parseInt(b.jersey, 10) || 0
	})
}

export function useRoster(teamId: string, isHistorical: boolean): {
	players: RosterPlayer[] | null
	loading: boolean
} {
	const [players, setPlayers] = useState<RosterPlayer[] | null>(null)
	const [loading, setLoading] = useState(true)

	const slug = isHistorical ? null : (ESPN_SLUG_MAP[teamId] ?? null)

	useEffect(() => {
		if (!slug) {
			setPlayers(null) // eslint-disable-line react-hooks/set-state-in-effect
			setLoading(false)
			return
		}

		let cancelled = false
		setLoading(true)

		fetch(`${ESPN_ROSTER_URL}/${slug}/roster?season=2026`)
			.then(res => res.json())
			.then(json => {
				if (cancelled) return
				const athletes = json?.athletes
				if (!Array.isArray(athletes) || athletes.length === 0) {
					setPlayers(null)
					setLoading(false)
					return
				}
				const parsed = sortByPosition(athletes.map((a: Record<string, unknown>) => parseAthlete(a)))
				setPlayers(parsed)
				setLoading(false)
			})
			.catch(() => {
				if (!cancelled) { setPlayers(null); setLoading(false) }
			})

		return () => { cancelled = true }
	}, [slug])

	return { players, loading }
}
