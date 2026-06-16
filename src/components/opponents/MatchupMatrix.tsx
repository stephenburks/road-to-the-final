import type { Opponent, Team, AppData } from '../../types'
import { getGroupTag } from '../../utils'
import FlagIcon from '../ui/FlagIcon'
import styles from './MatchupMatrix.module.css'

function MatchupRow({ opp, team, maxPct, data }: {
	opp: Opponent
	team: Team
	maxPct: number
	data: AppData
}) {
	const name = opp.opponent ?? opp.likelyTeam ?? 'TBD'
	const tag = getGroupTag(name, data)
	return (
		<div className={styles.matchupRow}>
			<div className={styles.matchupTeams}>
				<FlagIcon flag={opp.flag} />
				<span className={styles.matchupName}>
					<FlagIcon code={team.id} flag={team.flag} name={team.name} /> {team.name} vs {name}
					{tag && (
						<span className={styles.groupTagBadge}>
							G{tag.group}#{tag.pos}
						</span>
					)}
				</span>
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

export default function MatchupMatrix({ flatList, team, maxPct, data }: {
	flatList: Opponent[]
	team: Team
	maxPct: number
	data: AppData
}) {
	const sorted = [...flatList].filter(o => o.pct != null).sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))
	const top4 = sorted.slice(0, 4)

	return (
		<div className={styles.matchupSection}>
			<div className={styles.matchupList}>
				{sorted.map((opp, i) => (
					<MatchupRow key={i} opp={opp} team={team} maxPct={maxPct} data={data} />
				))}
			</div>
			<div className={styles.calloutGrid}>
				{top4.map((opp, i) => (
					<div
						key={i}
						className={`${styles.calloutCard} ${i === 0 ? styles.calloutCardTop : ''}`}
					>
						<FlagIcon flag={opp.flag} />
						<div>
							<div className={styles.calloutVs}><FlagIcon code={team.id} flag={team.flag} name={team.name} /> vs {opp.opponent ?? opp.likelyTeam}</div>
							<div className={`${styles.calloutPct} ${i === 0 ? styles.calloutPctTop : ''}`}>
								{opp.pct}%
							</div>
							{opp.note && <div className={styles.calloutNote}>{opp.note}</div>}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}
