import type { GroupData } from '../../types'
import type { LiveMatchPatch } from '../../hooks/useLiveScores'
import FlagIcon from './FlagIcon'
import styles from './GroupTable.module.css'

export function GroupTable({ groupKey, groupData, highlightTeamId, eliminatedTeamIds, livePatches, onTeamPeek }: {
	groupKey: string
	groupData: GroupData
	highlightTeamId: string | null
	eliminatedTeamIds?: Set<string>
	livePatches?: Map<string, LiveMatchPatch> | null
	onTeamPeek?: (id: string) => void
}) {
	const probs = groupData.winProbabilities ?? {}
	const standings = groupData.standings ?? []

	// Find any in-progress match between teams in this group. Use the patch's
	// canonical homeId/awayId (the key direction is duplicated in both orders).
	const groupTeamIds = new Set(standings.map(r => r.teamId).filter(Boolean) as string[])
	const liveInGroup = (() => {
		if (!livePatches || groupTeamIds.size === 0) return null
		const seen = new Set<string>()
		for (const [, patch] of livePatches) {
			if (patch.status !== 'IN_PROGRESS') continue
			if (!groupTeamIds.has(patch.homeId) || !groupTeamIds.has(patch.awayId)) continue
			const dedupeKey = `${patch.homeId}:${patch.awayId}`
			if (seen.has(dedupeKey)) continue
			seen.add(dedupeKey)
			const home = standings.find(r => r.teamId === patch.homeId)
			const away = standings.find(r => r.teamId === patch.awayId)
			if (home && away) return { home, away, patch }
		}
		return null
	})()

	// Compute clinched: a team has mathematically secured top-2 if their
	// current points exceed the maximum possible points of the 3rd-place team.
	const thirdMaxPossible = standings.length >= 3
		? (standings[2].pts ?? 0) + 3 * (3 - (standings[2].played ?? 0))
		: 0

	function isClinched(row: typeof standings[number]): boolean {
		if (row.pos > 2) return false
		return row.pts > thirdMaxPossible
	}

	return (
		<div className={styles.table}>
			<div className={styles.tableHead}>
				<span className={styles.groupLetter}>Group {groupKey}</span>
				<span className={styles.tableTitle}>Standings</span>
			</div>

			{liveInGroup && (
				<div className={styles.liveMatch} role="status" aria-label={`Live match in progress`}>
					<span className={styles.liveDot} aria-hidden="true" />
					<span className={styles.liveLabel}>LIVE {liveInGroup.patch.clock || ''}</span>
					<span className={styles.liveScore}>
						{liveInGroup.home.team} {liveInGroup.patch.homeScore}–{liveInGroup.patch.awayScore} {liveInGroup.away.team}
					</span>
				</div>
			)}

			<table aria-label={`Group ${groupKey} standings`}>
				<thead>
					<tr>
						<th scope="col" aria-label="Position">#</th>
						<th scope="col">Team</th>
						<th scope="col" aria-label="Played">P</th>
						<th scope="col" aria-label="Won">W</th>
						<th scope="col" aria-label="Drawn">D</th>
						<th scope="col" aria-label="Lost">L</th>
						<th scope="col" aria-label="Goal difference">GD</th>
						<th scope="col" aria-label="Points">Pts</th>
						<th scope="col" aria-label="Win probability">Win %</th>
					</tr>
				</thead>
				<tbody>
					{standings.map((row) => {
						const isSelected = row.teamId === highlightTeamId
						const isElim = !!(row.teamId && eliminatedTeamIds?.has(row.teamId))
						const clinched = isClinched(row)
						const wp = row.teamId ? (probs[row.teamId] ?? 0) : 0
						const probBarClass = wp > 40 ? styles.probBarHigh : wp > 15 ? styles.probBarMid : styles.probBarLow
						const probLabelClass = wp > 40 ? styles.probLabelHigh : styles.probLabelLow

						const isClickable = !!(onTeamPeek && row.teamId && !isSelected)
						const handleRowClick = isClickable ? () => onTeamPeek!(row.teamId!) : undefined
						const handleRowKey = isClickable
							? (e: React.KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTeamPeek!(row.teamId!) }
							}
							: undefined

						return (
							<tr
								key={row.teamId ?? row.team}
								className={`${isSelected ? styles.rowSelected : ''} ${isClickable ? styles.rowClickable : ''}`}
								aria-current={isSelected ? 'true' : undefined}
								role={isClickable ? 'button' : undefined}
								tabIndex={isClickable ? 0 : undefined}
								aria-label={isClickable ? `View ${row.team}` : undefined}
								onClick={handleRowClick}
								onKeyDown={handleRowKey}
							>
								<td className={styles.colPos}>{row.pos}</td>
								<td>
								<div className={styles.teamCell}>
									<FlagIcon code={row.teamId ?? undefined} flag={row.flag} small />
									<span className={isSelected ? styles.teamNameSelected : styles.teamName}>
										{row.team}
									</span>
									{isSelected && (
										<span className={styles.youTag} aria-label="Your selected team">YOU</span>
									)}
									{clinched && (
										<span className={styles.badgeClinched} aria-label="Clinched advancement">CLNCH</span>
									)}
									{isElim && (
										<span className={styles.badgeEliminated} aria-label="Eliminated">ELIM</span>
									)}
								</div>
								</td>
								{[row.played, row.w, row.d, row.l, row.gd >= 0 ? `+${row.gd}` : row.gd, row.pts].map((val, j) => {
									const isPts = j === 5
									const cellClass = isPts
										? (isSelected ? styles.statCellPtsSelected : styles.statCellPts)
										: styles.statCell
									return (
										<td key={j} className={cellClass}>
											{val}
										</td>
									)
								})}
								<td>
									<div className={styles.probCell}>
										<div
											className={`${styles.probBar} ${probBarClass}`}
											style={{ width: `${Math.max(wp * 0.6, 3)}px` }}
											role="progressbar"
											aria-valuenow={wp}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`${wp}% chance to win group`}
										/>
										<span className={`${styles.probLabel} ${probLabelClass}`}>
											{wp}%
										</span>
									</div>
								</td>
							</tr>
						)
					})}
				</tbody>
			</table>
		</div>
	)
}
