import type { Team, GroupMatch } from '../../types'
import { formatDate } from '../../utils'
import FlagIcon from '../ui/FlagIcon'
import { RESULT_LABELS } from './groupStageConstants'
import styles from './MatchCard.module.css'

interface MatchCardProps {
	match: GroupMatch
	teamFlag: string
	teamId: string
	teams: Team[]
}

export default function MatchCard({ match, teamFlag, teamId, teams }: MatchCardProps) {
	const isWin = match.result === 'W'
	const isDraw = match.result === 'D'
	const resultLabel = match.result ? (RESULT_LABELS[match.result] ?? 'To be played') : 'To be played'
	const badgeClass = match.result
		? (match.result === 'W' ? styles.badgeW : match.result === 'D' ? styles.badgeD : styles.badgeL)
		: styles.badgeUpcoming
	const cardClass = isWin ? styles.cardW : isDraw ? styles.cardD : styles.cardUpcoming

	// Find opponent's match data for the same matchday
	const oppTeam = teams?.find(t => t.name === match.opponent)
	const oppMatch = oppTeam?.groupResults?.find(g => g.matchday === match.matchday)

	return (
		<div className={`${styles.matchCard} ${cardClass}`}>
			<div className={styles.matchMeta}>
				<span>MD{match.matchday} · {formatDate(match.date)}</span>
				<span className={`${styles.badge} ${badgeClass}`} aria-label={resultLabel}>
					{match.result ?? 'TBD'}
				</span>
			</div>

			<div className={styles.matchTeams}>
				<FlagIcon code={teamId} flag={teamFlag} />
				<span className={styles.vsLabel}>vs</span>
				<FlagIcon flag={match.opponentFlag} opponent={match.opponent} />
				<span className={styles.opponentName}>{match.opponent}</span>
				{match.score && (
					<span className={styles.score} aria-label={`Score: ${match.score}`}>
						{match.score}
					</span>
				)}
			</div>

			{match.result && (
				<div className={styles.matchEvents}>
					<div className={styles.eventSide}>
						<div className={styles.eventTeam}>
							<FlagIcon code={teamId} flag={teamFlag} small />
						</div>
						{match.scorers?.length > 0 && (
							<ul className={styles.scorers} aria-label={`${teamId} goal scorers`}>
								{match.scorers.map((s, j) => <li key={j}><span className="emoji" aria-hidden="true">⚽</span> {s}</li>)}
							</ul>
						)}
						{match.cards?.length > 0 && (
							<ul className={styles.cards} aria-label={`${teamId} cards`}>
								{match.cards.map((c, j) => (
									<li key={j}>
										<span className={`${styles.cardIndicator} ${c.type === 'red' ? styles.cardRed : styles.cardYellow}`} aria-hidden="true" />
										<span className="sr-only">{c.type === 'red' ? 'Red' : 'Yellow'} card: </span>
										{c.player} {c.minute}
									</li>
								))}
							</ul>
						)}
					</div>
					{oppMatch && (
						<div className={styles.eventSide}>
							<div className={styles.eventTeam}>
								<FlagIcon code={oppTeam?.id} flag={match.opponentFlag} small />
							</div>
							{oppMatch.scorers?.length > 0 && (
								<ul className={styles.scorers} aria-label={`${match.opponent} goal scorers`}>
									{oppMatch.scorers.map((s, j) => <li key={j}><span className="emoji" aria-hidden="true">⚽</span> {s}</li>)}
								</ul>
							)}
							{oppMatch.cards?.length > 0 && (
								<ul className={styles.cards} aria-label={`${match.opponent} cards`}>
									{oppMatch.cards.map((c, j) => (
										<li key={j}>
											<span className={`${styles.cardIndicator} ${c.type === 'red' ? styles.cardRed : styles.cardYellow}`} aria-hidden="true" />
											<span className="sr-only">{c.type === 'red' ? 'Red' : 'Yellow'} card: </span>
											{c.player} {c.minute}
										</li>
									))}
								</ul>
							)}
						</div>
					)}
				</div>
			)}

			{!match.result && <div className={styles.venue}>{match.venue}</div>}
		</div>
	)
}
