import type { Team, GroupMatch } from '../../types'
import { formatDate } from '../../utils'
import FlagIcon from '../ui/FlagIcon'
import { BADGE_STYLES, RESULT_LABELS, CARD_BG, CARD_BORDER } from './groupStageConstants'
import styles from './MatchCard.module.css'

interface MatchCardProps {
	match: GroupMatch
	teamFlag: string
	teamId: string
	teams: Team[]
}

export default function MatchCard({ match, teamFlag, teamId, teams }: MatchCardProps) {
	const badgeStyle = match.result ? (BADGE_STYLES[match.result] ?? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }) : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }
	const isWin = match.result === 'W'
	const isDraw = match.result === 'D'
	const resultLabel = match.result ? (RESULT_LABELS[match.result] ?? 'To be played') : 'To be played'

	// Find opponent's match data for the same matchday
	const oppTeam = teams?.find(t => t.name === match.opponent)
	const oppMatch = oppTeam?.groupResults?.find(g => g.matchday === match.matchday)

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
										<span className={styles.cardIndicator} style={{ background: c.type === 'red' ? '#ef4444' : '#eab308' }} aria-hidden="true" />
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
											<span className={styles.cardIndicator} style={{ background: c.type === 'red' ? '#ef4444' : '#eab308' }} aria-hidden="true" />
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
