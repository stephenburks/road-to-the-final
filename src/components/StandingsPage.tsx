import { useMemo } from 'react'
import type { AppData } from '../types'
import { GroupTable } from './ui/GroupTable'
import styles from './StandingsPage.module.css'

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')

interface StandingsPageProps {
	data: AppData
	selectedTeamId: string
	onTeamPeek?: (id: string) => void
}

export default function StandingsPage({ data, selectedTeamId, onTeamPeek }: StandingsPageProps) {
	const groups = data.groups ?? {}

	const eliminatedTeamIds = useMemo(() => {
		const set = new Set<string>()
		for (const t of (data.teams ?? [])) {
			if (t.eliminated) set.add(t.id)
		}
		return set
	}, [data.teams])

	return (
		<div className={styles.page}>
			<div className={`wrap ${styles.header}`}>
				<h1 className={styles.title}>Group Standings</h1>
				<p className={styles.subtitle}>FIFA World Cup 2026</p>
			</div>

			<div className={`wrap ${styles.grid}`}>
				{GROUP_LETTERS.map(letter => {
					const group = groups[letter]
					if (!group) return null
					return (
						<div key={letter} className={styles.groupCell}>
							<GroupTable
								groupKey={letter}
								groupData={group}
								highlightTeamId={selectedTeamId}
								eliminatedTeamIds={eliminatedTeamIds}
								onTeamPeek={onTeamPeek}
							/>
						</div>
					)
				})}
			</div>
		</div>
	)
}