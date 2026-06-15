import type { GroupData, Team, AppData, GroupMatch } from '../types'
import { formatDate, getFeederGroup } from '../utils'
import SectionLabel from './ui/SectionLabel'
import FlagIcon from './ui/FlagIcon'
import styles from './GroupStage.module.css'

const BADGE_STYLES = {
	W: { background: '#052e16', color: '#22c55e' },
	D: { background: '#1c1917', color: '#a8a29e' },
	L: { background: '#2d0a0a', color: '#ef4444' },
}

const RESULT_LABELS = { W: 'Win', D: 'Draw', L: 'Loss' }

const CARD_BG = {
	W: 'rgba(34,197,94,0.06)',
	D: 'rgba(99,102,241,0.04)',
}

const CARD_BORDER = {
	W: 'rgba(34,197,94,0.2)',
	D: 'rgba(99,102,241,0.15)',
}

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
					{(groupData.standings ?? []).map((row, i) => {
						const isSelected = row.teamId === highlightTeamId
						const wp = row.teamId ? (probs[row.teamId] ?? 0) : 0

						return (
							<tr
								key={i}
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

function MatchCard({ match, teamFlag, teamId }: {
	match: GroupMatch
	teamFlag: string
	teamId: string
}) {
	const badgeStyle = match.result ? BADGE_STYLES[match.result as keyof typeof BADGE_STYLES] : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }
	const isWin = match.result === 'W'
	const isDraw = match.result === 'D'
	const resultLabel = match.result ? (RESULT_LABELS[match.result as keyof typeof RESULT_LABELS] ?? 'To be played') : 'To be played'

	return (
		<div
			className={styles.matchCard}
			style={{
				background: isWin ? CARD_BG.W : isDraw ? CARD_BG.D : 'rgba(255,255,255,0.03)',
				border: `1px solid ${isWin ? CARD_BORDER.W : isDraw ? CARD_BORDER.D : 'rgba(255,255,255,0.07)'}`,
			}}
		>
			<div className={styles.matchMeta}>
				<span>MD{match.matchday} · {formatDate(match.date)}</span>
				<span className={styles.badge} style={badgeStyle} aria-label={resultLabel}>
					{match.result ?? 'TBD'}
				</span>
			</div>

			<div className={styles.matchTeams}>
				<FlagIcon code={teamId} flag={teamFlag} />
				<span style={{ fontSize: 12, color: 'var(--text-lo)' }}>vs</span>
				<FlagIcon flag={match.opponentFlag} opponent={match.opponent} />
				<span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>{match.opponent}</span>
				{match.score && (
					<span className={styles.score} aria-label={`Score: ${match.score}`}>
						{match.score}
					</span>
				)}
			</div>

			{match.scorers?.length > 0 && (
				<ul className={styles.scorers} aria-label="Goal scorers">
					{match.scorers.map((s, j) => <li key={j}><span className="emoji" aria-hidden="true">⚽</span> {s}</li>)}
				</ul>
			)}

			{!match.result && <div className={styles.venue}>{match.venue}</div>}
		</div>
	)
}

export default function GroupStage({ team, data }: { team: Team; data: AppData }) {
	const myGroup = data?.groups?.[team.group]
	const feeder = getFeederGroup(team, 'r16', data)

	return (
		<section className="wrap section" id="groups" aria-labelledby="groups-heading">
			<SectionLabel text="Group Stage Tracker" />
			<h2 id="groups-heading" className="sr-only">Group stage standings and results</h2>

			<div className={styles.groupGrid}>
				{myGroup && <GroupTable groupKey={team.group} groupData={myGroup} highlightTeamId={team.id} />}
				{feeder && (
				<div>
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 9,
							color: 'var(--text-dim)',
							marginBottom: 6,
							lineHeight: 1.5,
						}}
					>
						The table shows Group {feeder.key} standings — if {team.name} wins Group {team.group}, the winner of Group {feeder.key} would be their Round of 16 opponent.
					</div>
					<GroupTable groupKey={feeder.key} groupData={feeder.group} highlightTeamId={null} />
				</div>
			)}
			{!feeder && (
				<div
					style={{
						fontFamily: 'var(--font-mono)',
						fontSize: 10,
						color: 'var(--text-dim)',
						textAlign: 'center',
						lineHeight: 1.5,
						alignSelf: 'center',
						padding: '0 16px',
					}}
				>
					The Round of 16 opponent isn&rsquo;t determined by a single group — depends on results from multiple R32 matches. Will update as the bracket fills in.
				</div>
			)}
			</div>

			<div
				role="note"
				style={{
					background: 'rgba(245,158,11,0.06)',
					border: '1px solid rgba(245,158,11,0.15)',
					color: '#fcd34d',
					fontSize: 11,
					padding: '10px 14px',
					borderRadius: 8,
					fontFamily: 'var(--font-mono)',
					marginTop: 12,
					marginBottom: 4,
					lineHeight: 1.5,
				}}
			>
				⚠️ Bracket path, opponent scenarios, and venues assume {team.name} finishes 1st in Group {team.group}. If they finish 2nd or 3rd, the Round of 16 opponent, subsequent knockout path, and venues will be different.
			</div>

			<div className={styles.matchGrid}>
				{(team.groupResults ?? []).map((match, i) => (
					<MatchCard key={i} match={match} teamFlag={team.flag} teamId={team.id} />
				))}
			</div>
		</section>
	)
}