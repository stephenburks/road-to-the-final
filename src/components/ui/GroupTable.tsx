import type { GroupData } from '../../types'
import FlagIcon from './FlagIcon'
import styles from './GroupTable.module.css'

export function GroupTable({ groupKey, groupData, highlightTeamId }: {
	groupKey: string
	groupData: GroupData
	highlightTeamId: string | null
}) {
	const probs = groupData.winProbabilities ?? {}

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
					{(groupData.standings ?? []).map((row) => {
						const isSelected = row.teamId === highlightTeamId
						const wp = row.teamId ? (probs[row.teamId] ?? 0) : 0

						return (
							<tr
								key={row.teamId ?? row.team}
								style={{ background: isSelected ? 'rgba(99,102,241,0.07)' : undefined }}
								aria-current={isSelected ? 'true' : undefined}
							>
								<td style={{ color: 'var(--text-dim)', width: 22 }}>{row.pos}</td>
								<td>
								<div className={styles.teamCell}>
									<FlagIcon code={row.teamId ?? undefined} flag={row.flag} small />
										<span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#c7d2fe' : '#d1d5db' }}>
											{row.team}
										</span>
										{isSelected && (
											<span className={styles.youTag} aria-label="Your selected team">YOU</span>
										)}
									</div>
								</td>
								{[row.played, row.w, row.d, row.l, row.gd >= 0 ? `+${row.gd}` : row.gd, row.pts].map((val, j) => (
									<td
										key={j}
										style={{
											textAlign: 'center',
											color: j === 5 ? (isSelected ? '#c7d2fe' : '#e2e0ff') : 'var(--text-dim)',
											fontWeight: j === 5 ? 700 : 400,
										}}
									>
										{val}
									</td>
								))}
								<td>
									<div className={styles.probCell}>
										<div
											className={styles.probBar}
											style={{
												width: `${Math.max(wp * 0.6, 3)}px`,
												background: wp > 40 ? 'var(--purple)' : wp > 15 ? 'var(--amber)' : '#374151',
											}}
											role="progressbar"
											aria-valuenow={wp}
											aria-valuemin={0}
											aria-valuemax={100}
											aria-label={`${wp}% chance to win group`}
										/>
										<span style={{ color: wp > 40 ? '#a5b4fc' : 'var(--text-dim)', minWidth: 28 }}>
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
