import { STAGE_LABELS } from '../constants'
import type { Stage, Team, AdvanceProbabilities } from '../types'
import { daysUntil, formatDate } from '../utils'
import FlagIcon from './ui/FlagIcon'
import styles from './Hero.module.css'

const STAT_CARDS = [
	{ key: 'r32', label: 'Reach Round of 32', color: '#22c55e', bg: 'rgba(34,197,94,0.08)', border: 'rgba(34,197,94,0.28)' },
	{ key: 'r16', label: 'Reach Round of 16', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.28)' },
	{ key: 'qf', label: 'Reach Quarterfinal', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)' },
	{ key: 'final', label: 'Reach the Final', color: '#ef4444', bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)' },
]

function getEyebrow(team: Team, activeStage: string, isHistorical: boolean) {
	if (team.eliminated) return `\u274C ${team.name} \u2014 Eliminated`
	return `${STAGE_LABELS[activeStage as Stage]}${isHistorical ? ' \u00B7 Historical' : ''}`
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

function getSubtext(team: Team, activeStage: string, days: number | null) {
	if (team.eliminated) {
		return `${team.name} were knocked out in the ${STAGE_LABELS[team.currentStage ?? 'r32']}.`
	}
	if (days !== null) {
		return `${STAGE_LABELS[activeStage as Stage]} is ${Math.max(days, 0)} day${days !== 1 ? 's' : ''} away.`
	}
	return `Next: ${team.path?.[activeStage as Stage]?.date ?? '\u2014'}`
}

interface HeroProps {
	team: Team
	activeStage: Stage
	isHistorical: boolean
}

export default function Hero({ team, activeStage, isHistorical }: HeroProps) {
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
						{!team.eliminated && <><FlagIcon code={team.id} flag={team.flag} name={team.name} />{' '}</>}
						{heading}
					</h1>
					{!team.eliminated && <p className={styles.subhead}>{subhead}</p>}
					<p className={styles.subtext}>{subtext}</p>
					{conditionalNote && (
						<p className={styles.conditionalNote} role="note">
							<span aria-hidden="true" className="emoji">⚠️ </span>{conditionalNote}
						</p>
					)}

					{!team.eliminated && (
						<div className={styles.statGrid} role="list" aria-label="Tournament advancement probabilities">
							{STAT_CARDS.map(card => (
								<div
									key={card.key}
									role="listitem"
									className={styles.statCard}
									style={{ background: card.bg, border: `1px solid ${card.border}` }}
									aria-label={`${card.label}: ${ap[card.key as keyof AdvanceProbabilities] ?? 0}%`}
								>
									<div className={styles.statValue} style={{ color: card.color }}>
										{ap[card.key as keyof AdvanceProbabilities] ?? 0}%
									</div>
									<div className={styles.statLabel}>{card.label}</div>
									<div className={styles.statSub}>
										{sourceLabel}
									</div>
								</div>
							))}
						</div>
					)}
				</div>
			</section>
		</div>
	)
}