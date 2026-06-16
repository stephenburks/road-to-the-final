import type { GroupData } from '../../types'
import FlagIcon from './FlagIcon'
import styles from './GroupTable.module.css'

export function GroupTable({ groupKey, groupData, highlightTeamId, eliminatedTeamIds }: {
	groupKey: string
	groupData: GroupData
	highlightTeamId: string | null
	eliminatedTeamIds?: Set<string>
}) {
	const probs = groupData.winProbabilities ?? {}
	const standings = groupData.standings ?? []

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

						return (
							<tr
								key={row.teamId ?? row.team}
								className={isSelected ? styles.rowSelected : undefined}
								aria-current={isSelected ? 'true' : undefined}
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
