import { useMemo } from 'react'
import type { Team } from '../types'

interface GroupedTeams {
	[key: string]: Team[]
}

interface UseTeamSearchReturn {
	grouped: GroupedTeams
	flatItems: Team[]
}

export function useTeamSearch(teams: Team[], query: string, confederations: readonly string[]): UseTeamSearchReturn {
	const grouped = useMemo((): GroupedTeams => {
		const q = query.toLowerCase()
		const byConf: GroupedTeams = {}
		confederations.forEach(c => { byConf[c] = [] })
		byConf['Eliminated'] = []

		teams.forEach(t => {
			if (q && !t.name.toLowerCase().includes(q) && !(t.confederation ?? '').toLowerCase().includes(q))
				return
			if (t.eliminated) {
				byConf['Eliminated'].push(t)
			} else {
				const key = t.confederation ?? 'Other'
				if (!byConf[key]) byConf[key] = []
				byConf[key].push(t)
			}
		})

		Object.values(byConf).forEach(arr => {
			arr.sort((a, b) => (b.advanceProbabilities?.winner ?? 0) - (a.advanceProbabilities?.winner ?? 0))
		})

		return byConf
	}, [teams, query, confederations])

	const flatItems = useMemo(() => {
		const items: Team[] = []
		for (const conf of [...confederations, 'Eliminated']) {
			const group = grouped[conf] ?? []
			for (const t of group) {
				items.push(t)
			}
		}
		return items
	}, [grouped, confederations])

	return { grouped, flatItems }
}