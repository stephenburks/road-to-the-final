import type { DailyMatch } from '../types'
import FlagIcon from './ui/FlagIcon'
import styles from './DailyMatchCard.module.css'

interface DailyMatchCardProps {
	match: DailyMatch
}

export default function DailyMatchCard({ match }: DailyMatchCardProps) {
	const isFinished = match.status === 'FINISHED'
	const cardClass = isFinished ? styles.cardFinished : styles.cardUpcoming

	return (
		<div className={`${styles.card} ${cardClass}`}>
			<div className={styles.meta}>
				<span className={styles.date}>
					{new Date(match.date + 'T12:00:00Z').toLocaleDateString('en-US', {
						weekday: 'short', month: 'short', day: 'numeric',
					})}
				</span>
				<span className={`${styles.badge} ${isFinished ? styles.badgeFinished : styles.badgeScheduled}`}>
					{isFinished ? 'FT' : 'Upcoming'}
				</span>
			</div>

			<div className={styles.matchup}>
				<div className={styles.team}>
					<FlagIcon code={match.homeId} flag={match.homeFlag} name={match.homeTeam} />
					<span className={styles.teamName}>{match.homeTeam}</span>
				</div>

				<div className={styles.scoreSection}>
					{isFinished ? (
						<span className={styles.score} aria-label={`Score: ${match.homeScore} to ${match.awayScore}`}>
							{match.homeScore} – {match.awayScore}
						</span>
					) : (
						<span className={styles.vs}>vs</span>
					)}
				</div>

				<div className={styles.team}>
					<FlagIcon code={match.awayId} flag={match.awayFlag} name={match.awayTeam} />
					<span className={styles.teamName}>{match.awayTeam}</span>
				</div>
			</div>
		</div>
	)
}