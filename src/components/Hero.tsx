import { STAGE_LABELS } from '../constants'
import type { Stage, Team, AdvanceProbabilities } from '../types'
import { daysUntil, formatDate } from '../utils'
import { useTeamRecord } from '../hooks/useTeamRecord'
import FlagIcon from './ui/FlagIcon'
import styles from './Hero.module.css'

const STAT_CARD_DEFS = [
	{ key: 'r32',   label: 'Reach Round of 32', cardClass: styles.statCardR32,   valueClass: styles.statValueR32 },
	{ key: 'r16',   label: 'Reach Round of 16', cardClass: styles.statCardR16,   valueClass: styles.statValueR16 },
	{ key: 'qf',    label: 'Reach Quarterfinal', cardClass: styles.statCardQf,    valueClass: styles.statValueQf },
	{ key: 'sf',    label: 'Reach Semifinal',    cardClass: styles.statCardSf,    valueClass: styles.statValueSf },
	{ key: 'final', label: 'Reach the Final',    cardClass: styles.statCardFinal, valueClass: styles.statValueFinal },
	{ key: 'winner',label: 'Win World Cup',      cardClass: styles.statCardWin,   valueClass: styles.statValueWin },
]

interface GroupWinCard {
	probability: number
	groupLetter: string
}

function getEyebrow(team: Team, activeStage: Stage, isHistorical: boolean) {
	if (team.eliminated) return `\u274C ${team.name} \u2014 Eliminated`
	return `${STAGE_LABELS[activeStage]}${isHistorical ? ' \u00B7 Historical' : ''}`
}

function getHeading(team: Team) {
	if (team.eliminated) return 'Journey Ended'
	return team.name
}

function getSubhead(path: { city?: string; date?: string } | null | undefined) {
	const city = path?.city ?? '\u2014'
	const dateSuffix = path?.date?.match(/^\d{4}/) ? `. ${formatDate(path.date)}.` : ''
	return city + dateSuffix
}

function getSubtext(team: Team, activeStage: Stage, days: number | null) {
	if (team.eliminated) {
		return `${team.name} were knocked out in the ${STAGE_LABELS[team.currentStage ?? 'r32']}.`
	}
	if (days !== null) {
		return `${STAGE_LABELS[activeStage]} is ${Math.max(days, 0)} day${days !== 1 ? 's' : ''} away.`
	}
	return `Next: ${team.path?.[activeStage]?.date ?? '\u2014'}`
}

interface HeroProps {
	team: Team
	activeStage: Stage
	isHistorical: boolean
	groupWinProb?: GroupWinCard
}

export default function Hero({ team, activeStage, isHistorical, groupWinProb }: HeroProps) {
	const path = team.path?.[activeStage]
	const ap = team.advanceProbabilities ?? {}
	const days = daysUntil(path?.date)
	const source = ap.source
	const sourceLabel = isHistorical ? 'As of snapshot' : source === 'market' ? 'Polymarket' : 'Calculated'

	const { record, nextEvent } = useTeamRecord(team.id, isHistorical)

	const eyebrow = getEyebrow(team, activeStage, isHistorical)
	const heading = getHeading(team)
	const subhead = getSubhead(path)
	const subtext = getSubtext(team, activeStage, days)
	const conditionalNote = path?.conditional && !team.eliminated
		? (path.conditionNote ?? 'Venue assumes current group standing — may change.')
		: null

	const useTopRowLayout = !team.eliminated && !!nextEvent

	const textCol = (
		<div className={styles.textCol}>
			<p className={styles.eyebrow}>{eyebrow}</p>
			<h1 id="hero-heading" className={styles.heading}>
				{!team.eliminated && <><FlagIcon code={team.id} flag={team.flag} name={team.name} size={40} />{' '}</>}
				{heading}
			</h1>
			{!team.eliminated && (
				<div className={styles.metaRow}>
					{record && (
						<span className={styles.recordBadge} aria-label={`Record: ${record.summary.replace(/-/g, ' wins, ').replace(/-/g, ' draws, ')} losses`}>
							{record.summary}
						</span>
					)}
					<p className={styles.subhead}>{subhead}</p>
				</div>
			)}
			<p className={styles.subtext}>{subtext}</p>
			{conditionalNote && (
				<div className={styles.conditionalNote} role="note">
					<span className={styles.conditionalNoteIcon} aria-hidden="true" />
					{conditionalNote}
				</div>
			)}
		</div>
	)

	const nextMatchCard = nextEvent ? (
		<div className={styles.nextMatch} role="complementary" aria-label="Next match">
			<div className={styles.nextMatchLabel}>Next Match</div>
			<div className={styles.nextMatchTeams}>
				<FlagIcon code={team.id} flag={team.flag} name={team.name} />
				<span className={styles.nextMatchVs}>vs</span>
				<FlagIcon flag={nextEvent.opponentFlag} opponent={nextEvent.opponent} />
				<span className={styles.nextMatchOpponent}>{nextEvent.opponent}</span>
			</div>
			<div className={styles.nextMatchDetails}>
				{nextEvent.date && <span>{formatDate(nextEvent.date)}</span>}
				{nextEvent.venue && <span className={styles.nextMatchVenue}>{nextEvent.venue}</span>}
			</div>
			{nextEvent.broadcasts.length > 0 && (
				<div className={styles.nextMatchBroadcasts}>
					{nextEvent.broadcasts.join(' / ')}
				</div>
			)}
		</div>
	) : null

	const goalsFor = record?.stats?.pointsFor

	const statGridEl = !team.eliminated ? (
		<div className={styles.statGrid} role="list" aria-label="Tournament statistics and advancement probabilities">

			{/* ── Goals ── */}
			<div role="listitem" className={`${styles.statCard} ${styles.statCardGoals}`} aria-label={`Total goals: ${goalsFor ?? '\u2014'}`}>
				<div className={`${styles.statValue} ${styles.statValueGoals}`}>
					{goalsFor ?? '\u2014'}
				</div>
				<div className={styles.statLabel}>Total Goals</div>
				<div className={styles.statSub}>ESPN</div>
			</div>

			{/* ── Group Win ── */}
			<div
				role="listitem"
				className={`${styles.statCard} ${styles.statCardGroup}`}
				aria-label={groupWinProb ? `Win Group ${groupWinProb.groupLetter}: ${groupWinProb.probability}%` : 'Win group probability not available'}
			>
				<div className={`${styles.statValue} ${styles.statValueGroup}`}>
					{groupWinProb?.probability ?? '\u2014'}%
				</div>
				<div className={styles.statLabel}>
					{groupWinProb ? `Win Group ${groupWinProb.groupLetter}` : 'Win Group'}
				</div>
				<div className={styles.statSub}>Polymarket</div>
			</div>

			{/* ── Stage probabilities ── */}
			{STAT_CARD_DEFS.map(card => (
				<div
					key={card.key}
					role="listitem"
					className={`${styles.statCard} ${card.cardClass}`}
					aria-label={`${card.label}: ${ap[card.key as keyof AdvanceProbabilities] ?? 0}%`}
				>
					<div className={`${styles.statValue} ${card.valueClass}`}>
						{ap[card.key as keyof AdvanceProbabilities] ?? 0}%
					</div>
					<div className={styles.statLabel}>{card.label}</div>
					<div className={styles.statSub}>
						{sourceLabel}
					</div>
				</div>
			))}
		</div>
	) : null

	return (
		<div className="wrap">
			<section className={styles.hero} id="hero" aria-labelledby="hero-heading">
				<div className={styles.glow} aria-hidden="true" />

				<div className={styles.inner}>
					{useTopRowLayout ? (
						<div className={styles.topRow}>
							{textCol}
							{nextMatchCard}
						</div>
					) : (
						textCol
					)}
					{statGridEl}
				</div>
			</section>
		</div>
	)
}