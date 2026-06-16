import { STAGE_LABELS } from '../constants'
import type { Stage, Team, AdvanceProbabilities } from '../types'
import { daysUntil, formatDate } from '../utils'
import FlagIcon from './ui/FlagIcon'
import styles from './Hero.module.css'

const STAT_CARD_DEFS = [
	{ key: 'r32',   label: 'Reach Round of 32', cardClass: styles.statCardR32,   valueClass: styles.statValueR32 },
	{ key: 'r16',   label: 'Reach Round of 16', cardClass: styles.statCardR16,   valueClass: styles.statValueR16 },
	{ key: 'qf',    label: 'Reach Quarterfinal', cardClass: styles.statCardQf,    valueClass: styles.statValueQf },
	{ key: 'final', label: 'Reach the Final',    cardClass: styles.statCardFinal, valueClass: styles.statValueFinal },
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
	const sourceLabel = isHistorical ? 'As of snapshot' : source === 'market' ? 'Market estimate' : 'Calculated'

	const eyebrow = getEyebrow(team, activeStage, isHistorical)
	const heading = getHeading(team)
	const subhead = getSubhead(path)
	const subtext = getSubtext(team, activeStage, days)
	const conditionalNote = path?.conditional && !team.eliminated
		? (path.conditionNote ?? 'Venue assumes current group standing — may change.')
		: null

	return (
		<div className="wrap">
			<section className={styles.hero} id="hero" aria-labelledby="hero-heading">
				<div className={styles.glow} aria-hidden="true" />

				<div className={styles.inner}>
					<p className={styles.eyebrow}>{eyebrow}</p>
					<h1 id="hero-heading" className={styles.heading}>
						{!team.eliminated && <><FlagIcon code={team.id} flag={team.flag} name={team.name} size={40} />{' '}</>}
						{heading}
					</h1>
					{!team.eliminated && <p className={styles.subhead}>{subhead}</p>}
					<p className={styles.subtext}>{subtext}</p>
						{conditionalNote && (
						<div className={styles.conditionalNote} role="note">
							<span className={styles.conditionalNoteIcon} aria-hidden="true" />
							{conditionalNote}
						</div>
					)}

					{!team.eliminated && (
						<div className={styles.statGrid} role="list" aria-label="Tournament advancement probabilities">
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
							{groupWinProb && (
								<div
									role="listitem"
									className={`${styles.statCard} ${styles.statCardGroup}`}
									aria-label={`Win Group ${groupWinProb.groupLetter}: ${groupWinProb.probability}%`}
								>
									<div className={`${styles.statValue} ${styles.statValueGroup}`}>
										{groupWinProb.probability}%
									</div>
									<div className={styles.statLabel}>Win Group {groupWinProb.groupLetter}</div>
									<div className={styles.statSub}>Polymarket</div>
								</div>
							)}
						</div>
					)}
				</div>
			</section>
		</div>
	)
}