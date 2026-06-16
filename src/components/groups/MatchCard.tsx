import type { Team, GroupMatch, Card } from '../../types'
import { formatDate } from '../../utils'
import FlagIcon from '../ui/FlagIcon'
import { RESULT_LABELS } from './groupStageConstants'
import styles from './MatchCard.module.css'

// ── Team mode (existing contract, used by GroupStage) ──
interface TeamMatchCardProps {
	mode: 'team'
	match: GroupMatch
	teamFlag: string
	teamId: string
	teams: Team[]
	liveData?: {
		score: string
		clock: string
		status: 'IN_PROGRESS' | 'FINISHED'
		homeScorers?: string[]
		awayScorers?: string[]
		homeCards?: Card[]
		awayCards?: Card[]
		broadcasts?: string[]
	}
}

// ── Neutral mode (used by HomePage) ──
interface NeutralMatchCardProps {
	mode: 'neutral'
	homeTeam: string
	homeFlag: string
	homeId: string
	awayTeam: string
	awayFlag: string
	awayId: string
	score: string | null
	status: 'finished' | 'in_progress' | 'upcoming'
	date: string
	clock?: string
	venue?: string
	broadcasts?: string[]
	homeScorers: string[]
	awayScorers: string[]
	homeCards: Card[]
	awayCards: Card[]
}

type MatchCardProps = TeamMatchCardProps | NeutralMatchCardProps

function ScorerList({ scorers, label }: { scorers: string[]; label: string }) {
	if (!scorers.length) return null
	return (
		<ul className={styles.scorers} aria-label={label}>
			{scorers.map((s, j) => <li key={j}>{s}</li>)}
		</ul>
	)
}

function CardList({ cards, label }: { cards: Card[]; label: string }) {
	if (!cards.length) return null
	return (
		<ul className={styles.cards} aria-label={label}>
			{cards.map((c, j) => (
				<li key={j}>
					<span className={`${styles.cardIndicator} ${c.type === 'red' ? styles.cardRed : styles.cardYellow}`} aria-hidden="true" />
					<span className="sr-only">{c.type === 'red' ? 'Red' : 'Yellow'} card: </span>
					{c.player} {c.minute}
				</li>
			))}
		</ul>
	)
}

function EventColumn({ flag, teamId, teamName, scorers, cards, scorerLabel, cardLabel }: {
	flag: string
	teamId?: string
	teamName: string
	scorers: string[]
	cards: Card[]
	scorerLabel: string
	cardLabel: string
}) {
	return (
		<div className={styles.eventSide}>
			<div className={styles.eventTeam}>
				{teamId ? <FlagIcon code={teamId} flag={flag} small /> : <FlagIcon flag={flag} opponent={teamName} small />}
			</div>
			<ScorerList scorers={scorers} label={scorerLabel} />
			<CardList cards={cards} label={cardLabel} />
		</div>
	)
}

export default function MatchCard(props: MatchCardProps) {
	if (props.mode === 'neutral') {
		const { homeTeam, homeFlag, homeId, awayTeam, awayFlag, awayId, score, status, date, venue, broadcasts, homeScorers, awayScorers, homeCards, awayCards } = props
		const isFinished = status === 'finished'
		const isLive = status === 'in_progress'
		const hasResult = isFinished || isLive
		const cardClass = isLive ? styles.cardLive : isFinished ? styles.cardNeutral : styles.cardUpcoming
		const badgeClass = isLive ? styles.badgeLive : isFinished ? styles.badgeD : styles.badgeUpcoming
		const badgeText = isLive ? (props.clock ? `LIVE ${props.clock}` : 'LIVE') : isFinished ? 'FT' : 'Upcoming'

		return (
			<div className={`${styles.matchCard} ${cardClass}`}>
				<div className={styles.matchMeta}>
					<span>{formatDate(date)}</span>
					<span className={`${styles.badge} ${badgeClass}`}>
						{badgeText}
					</span>
				</div>

				<div className={styles.matchTeams}>
					<FlagIcon code={homeId} flag={homeFlag} name={homeTeam} />
					<span className={styles.opponentName}>{homeTeam}</span>
					<span className={styles.vsLabel}>vs</span>
					<FlagIcon code={awayId} flag={awayFlag} name={awayTeam} />
					<span className={styles.opponentName}>{awayTeam}</span>
					{score && (
						<span className={`${styles.score} ${isLive ? styles.scoreLive : ''}`} aria-label={`Score: ${score}`}>{score}</span>
					)}
				</div>

				{hasResult && (
					<div className={styles.matchEvents}>
						<EventColumn
							flag={homeFlag} teamId={homeId} teamName={homeTeam}
							scorers={homeScorers} cards={homeCards}
							scorerLabel={`${homeTeam} goal scorers`}
							cardLabel={`${homeTeam} cards`}
						/>
						<EventColumn
							flag={awayFlag} teamId={awayId} teamName={awayTeam}
							scorers={awayScorers} cards={awayCards}
							scorerLabel={`${awayTeam} goal scorers`}
							cardLabel={`${awayTeam} cards`}
						/>
					</div>
				)}

				{broadcasts && broadcasts.length > 0 && !isFinished && (
					<div className={styles.matchBroadcasts}>
						{broadcasts.join(' / ')}
					</div>
				)}

				{!hasResult && venue && <div className={styles.venue}>{venue}</div>}
			</div>
		)
	}

	// ── Team mode (existing behavior) ──
	const { match, teamFlag, teamId, teams, liveData } = props
	const effectiveScore = liveData?.score ?? match.score
	const effectiveIsLive = liveData ? liveData.status === 'IN_PROGRESS' : (!match.result && !!match.score)
	const isWin = match.result === 'W'
	const isDraw = match.result === 'D'
	const isLive = effectiveIsLive
	const resultLabel = match.result ? (RESULT_LABELS[match.result] ?? 'To be played') : isLive ? 'Live' : 'To be played'
	const badgeClass = match.result
		? (match.result === 'W' ? styles.badgeW : match.result === 'D' ? styles.badgeD : styles.badgeL)
		: isLive ? styles.badgeLive : styles.badgeUpcoming
	const cardClass = isWin ? styles.cardW : isDraw ? styles.cardD : isLive ? styles.cardLive : styles.cardUpcoming
	const badgeText = isLive && liveData?.clock ? `LIVE ${liveData.clock}` : isLive ? 'LIVE' : match.result ?? 'TBD'

	const oppTeam = teams?.find(t => t.name === match.opponent)
	const oppMatch = oppTeam?.groupResults?.find(g => g.matchday === match.matchday)

	const hasEvents = !!match.result || (isLive && ((match.scorers?.length ?? 0) > 0 || (match.cards?.length ?? 0) > 0 || (oppMatch?.scorers?.length ?? 0) > 0 || (oppMatch?.cards?.length ?? 0) > 0 || (liveData?.homeScorers?.length ?? 0) > 0 || (liveData?.awayScorers?.length ?? 0) > 0 || (liveData?.homeCards?.length ?? 0) > 0 || (liveData?.awayCards?.length ?? 0) > 0))
	const myScorers = liveData?.homeScorers ?? match.scorers ?? []
	const myCards = liveData?.homeCards ?? match.cards ?? []
	const oppScorers = liveData?.awayScorers ?? oppMatch?.scorers ?? []
	const oppCards = liveData?.awayCards ?? oppMatch?.cards ?? []

	return (
		<div className={`${styles.matchCard} ${cardClass}`}>
			<div className={styles.matchMeta}>
				<span>MD{match.matchday} · {formatDate(match.date)}</span>
				<span className={`${styles.badge} ${badgeClass}`} aria-label={resultLabel}>
					{badgeText}
				</span>
			</div>

			<div className={styles.matchTeams}>
				<FlagIcon code={teamId} flag={teamFlag} />
				<span className={styles.vsLabel}>vs</span>
				<FlagIcon flag={match.opponentFlag} opponent={match.opponent} />
				<span className={styles.opponentName}>{match.opponent}</span>
				{effectiveScore && (
					<span className={`${styles.score} ${isLive ? styles.scoreLive : ''}`} aria-label={`Score: ${effectiveScore}`}>
						{effectiveScore}
					</span>
				)}
			</div>

			{hasEvents && (
				<div className={styles.matchEvents}>
					<EventColumn
						flag={teamFlag} teamId={teamId} teamName=""
						scorers={myScorers} cards={myCards}
						scorerLabel={`${teamId} goal scorers`}
						cardLabel={`${teamId} cards`}
					/>
					<EventColumn
						flag={match.opponentFlag} teamName={match.opponent}
						scorers={oppScorers} cards={oppCards}
						scorerLabel={`${match.opponent} goal scorers`}
						cardLabel={`${match.opponent} cards`}
					/>
				</div>
			)}

			{(liveData?.broadcasts && liveData.broadcasts.length > 0 && !match.result) && (
					<div className={styles.matchBroadcasts}>
						{liveData.broadcasts.join(' / ')}
					</div>
				)}

				{!match.result && !isLive && <div className={styles.venue}>{match.venue}</div>}
		</div>
	)
}
