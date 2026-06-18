import type { Opponent, Team, AppData } from '../../types'
import { getGroupTag } from '../../utils'
import FlagIcon from '../ui/FlagIcon'
import TeamFlagLink from '../ui/TeamFlagLink'
import { NAME_TO_ID } from '../ui/teamLookup'
import styles from './MatchupMatrix.module.css'

function MatchupRow({ opp, team, maxPct, data, onTeamPeek }: {
	opp: Opponent
	team: Team
	maxPct: number
	data: AppData
	onTeamPeek?: (id: string) => void
}) {
	const name = opp.opponent ?? opp.likelyTeam ?? 'TBD'
	const tag = getGroupTag(name, data)
	const oppId = NAME_TO_ID[name]
	return (
		<div className={styles.matchupRow}>
			<div className={styles.matchupTeams}>
				<TeamFlagLink teamId={oppId} teamName={name} onPeek={onTeamPeek ?? (() => {})} disabled={!onTeamPeek}>
					<FlagIcon flag={opp.flag} />
					<span className={styles.matchupName}>
						<FlagIcon code={team.id} flag={team.flag} name={team.name} /> {team.name} vs {name}
						{tag && (
							<span className={styles.groupTagBadge}>
								G{tag.group}#{tag.pos}
							</span>
						)}
					</span>
				</TeamFlagLink>
			</div>
			<div
				className={styles.matchupTrack}
				role="progressbar"
				aria-valuenow={opp.pct ?? 0}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={`${opp.pct}% probability`}
			>
				<div className={styles.matchupFill} style={{ width: `${((opp.pct ?? 0) / maxPct) * 100}%` }} />
			</div>
			<div className={styles.matchupPct}>{opp.pct}%</div>
		</div>
	)
}

export default function MatchupMatrix({ flatList, team, maxPct, data, onTeamPeek }: {
	flatList: Opponent[]
	team: Team
	maxPct: number
	data: AppData
	onTeamPeek?: (id: string) => void
}) {
	const sorted = [...flatList].filter(o => o.pct != null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
	const top4 = sorted.slice(0, 4)

	return (
		<div className={styles.matchupSection}>
			<div className={styles.matchupList}>
				{sorted.map((opp, i) => (
					<MatchupRow key={i} opp={opp} team={team} maxPct={maxPct} data={data} onTeamPeek={onTeamPeek} />
				))}
			</div>
			<div className={styles.calloutGrid}>
				{top4.map((opp, i) => {
					const calloutName = opp.opponent ?? opp.likelyTeam ?? 'TBD'
					const calloutId = NAME_TO_ID[calloutName]
					const isClickable = !!(onTeamPeek && calloutId)
					return (
						<div
							key={i}
							className={`${styles.calloutCard} ${i === 0 ? styles.calloutCardTop : ''} ${isClickable ? styles.calloutCardClickable : ''}`}
							role={isClickable ? 'button' : undefined}
							tabIndex={isClickable ? 0 : undefined}
							aria-label={isClickable ? `View ${calloutName}` : undefined}
							onClick={isClickable ? () => onTeamPeek!(calloutId) : undefined}
							onKeyDown={isClickable ? (e: React.KeyboardEvent) => {
								if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTeamPeek!(calloutId) }
							} : undefined}
						>
							<FlagIcon flag={opp.flag} />
							<div>
								<div className={styles.calloutVs}><FlagIcon code={team.id} flag={team.flag} name={team.name} /> vs {calloutName}</div>
								<div className={`${styles.calloutPct} ${i === 0 ? styles.calloutPctTop : ''}`}>
									{opp.pct}%
								</div>
								{opp.note && <div className={styles.calloutNote}>{opp.note}</div>}
							</div>
						</div>
					)
				})}
			</div>
		</div>
	)
}
