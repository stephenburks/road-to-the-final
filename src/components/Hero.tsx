import { STAGE_LABELS, STAGE_ORDER, POLYMARKET_STAGE_URLS, polymarketGroupUrl } from '../constants'
import type { Stage, Team, AppData, AdvanceProbabilities } from '../types'
import { daysUntil, formatDate, stageIndex } from '../utils'
import { useTeamRecord, type NextEvent } from '../hooks/useTeamRecord'
import { useLiveOverlayContext } from '../hooks/liveOverlayContext'
import { useChangeIndicator } from '../hooks/useChangeIndicator'
import FlagIcon from './ui/FlagIcon'
import TeamFlagLink from './ui/TeamFlagLink'
import ChangeArrow from './ui/ChangeArrow'
import { NAME_TO_ID } from './ui/teamLookup'
import styles from './Hero.module.css'

const STAT_CARD_DEFS = [
	{
		key: 'r32',
		label: 'Reach Round of 32',
		cardClass: styles.statCardR32,
		valueClass: styles.statValueR32,
	},
	{
		key: 'r16',
		label: 'Reach Round of 16',
		cardClass: styles.statCardR16,
		valueClass: styles.statValueR16,
	},
	{
		key: 'qf',
		label: 'Reach Quarterfinal',
		cardClass: styles.statCardQf,
		valueClass: styles.statValueQf,
	},
	{
		key: 'sf',
		label: 'Reach Semifinal',
		cardClass: styles.statCardSf,
		valueClass: styles.statValueSf,
	},
	{
		key: 'final',
		label: 'Reach the Final',
		cardClass: styles.statCardFinal,
		valueClass: styles.statValueFinal,
	},
	{
		key: 'winner',
		label: 'Win World Cup',
		cardClass: styles.statCardWin,
		valueClass: styles.statValueWin,
	},
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
	groupPosition?: number
	data?: AppData
	onTeamPeek?: (id: string) => void
}

function ordinal(n: number): string {
	const s = ['th', 'st', 'nd', 'rd']
	const v = n % 100
	return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Small wrappers — each owns its own change-indicator ref so per-card animations
 * fire independently when their value updates.
 */
function StageChangeArrow({ value }: { value: number }) {
	const delta = useChangeIndicator(value)
	return <ChangeArrow delta={delta} />
}

function GroupChangeArrow({ value }: { value: number | undefined }) {
	const delta = useChangeIndicator(value)
	return <ChangeArrow delta={delta} />
}

/**
 * Has the team secured this stage? Two signals:
 *   1. The effective probability (live overlay or static) is 100 — Polymarket
 *      encodes mathematical clinching as 100% (or pulls the market entirely).
 *   2. The team has already progressed past this stage (team.currentStage is
 *      further along in STAGE_ORDER).
 */
function isStageClinched(
	team: Team,
	cardKey: keyof AdvanceProbabilities,
	effectiveValue: number
): boolean {
	if (cardKey === 'source') return false
	if (effectiveValue >= 100) return true
	if (cardKey === 'winner') return false
	if (!STAGE_ORDER.includes(cardKey as Stage)) return false
	return stageIndex(team.currentStage) > stageIndex(cardKey as Stage)
}

/**
 * Group winner is clinched when the effective probability is 100% (Polymarket
 * has resolved the market) or when all four teams have finished their three
 * matches and this team is in first place.
 */
function isGroupWinClinched(
	team: Team,
	data: AppData | undefined,
	effectiveValue: number | undefined
): boolean {
	if (effectiveValue != null && effectiveValue >= 100) return true
	const standings = data?.groups?.[team.group]?.standings
	if (!standings || standings.length === 0) return false
	const row = standings.find(r => r.teamId === team.id)
	if (!row || row.pos !== 1) return false
	return standings.every(s => (s.played ?? 0) >= 3)
}

/**
 * When ESPN's team API has no nextEvent (typically when the next match is
 * more than a week out), construct one from our static schedule data so the
 * Hero card stays populated.
 */
function buildFallbackNextEvent(team: Team, data: AppData | undefined): NextEvent | null {
	if (!data?.dailyMatches) return null
	const today = new Date().toISOString().slice(0, 10)
	const dates = Object.keys(data.dailyMatches).sort()
	for (const date of dates) {
		if (date < today) continue
		const matches = data.dailyMatches[date] ?? []
		for (const m of matches) {
			if (m.homeId !== team.id && m.awayId !== team.id) continue
			if (m.status === 'FINISHED') continue
			const isHome = m.homeId === team.id
			const opponent = isHome ? m.awayTeam : m.homeTeam
			const opponentFlag = isHome ? m.awayFlag : m.homeFlag
			return {
				opponent,
				opponentFlag,
				date: m.time ?? m.date,
				venue: m.venue ?? '',
				broadcasts: m.broadcasts ?? [],
				isHome,
				isLive: false,
			}
		}
	}
	return null
}

export default function Hero({
	team,
	activeStage,
	isHistorical,
	groupWinProb,
	groupPosition,
	data,
	onTeamPeek,
}: HeroProps) {
	const path = team.path?.[activeStage]
	const ap = team.advanceProbabilities ?? {}

	// Live overlay for advancement probabilities while a match is in progress.
	const { probs: liveProbs } = useLiveOverlayContext()

	const liveStageVal = (key: keyof AdvanceProbabilities): number | undefined => {
		if (!liveProbs) return undefined
		const bucket = liveProbs[key as keyof typeof liveProbs]
		if (bucket && typeof bucket === 'object' && team.id in bucket) {
			return (bucket as Record<string, number>)[team.id]
		}
		return undefined
	}
	const liveGroupVal = liveProbs?.group[team.id]
	const days = daysUntil(path?.date)
	const source = ap.source
	const sourceLabel = isHistorical
		? 'As of snapshot'
		: source === 'market'
			? 'Polymarket'
			: 'Calculated'

	const {
		record,
		nextEvent: espnNextEvent,
		links,
		error: teamRecordError,
		loading: teamRecordLoading,
	} = useTeamRecord(team.id, isHistorical)

	// ESPN's team API only exposes nextEvent within ~1 week of kickoff. For
	// teams between rounds or with a longer gap, fall back to our static
	// schedule so the Next Match card still renders.
	const nextEvent = espnNextEvent ?? (!isHistorical ? buildFallbackNextEvent(team, data) : null)

	const eyebrow = getEyebrow(team, activeStage, isHistorical)
	const heading = getHeading(team)
	const subhead = getSubhead(path)
	const subtext = getSubtext(team, activeStage, days)
	const conditionalNote =
		path?.conditional && !team.eliminated
			? (path.conditionNote ?? 'Venue assumes current group standing — may change.')
			: null

	const useTopRowLayout = !team.eliminated && (!!nextEvent || teamRecordLoading)

	const textCol = (
		<div className={styles.textCol}>
			<p className={styles.eyebrow}>{eyebrow}</p>
			<h1 id="hero-heading" className={styles.heading}>
				{!team.eliminated && (
					<>
						<FlagIcon code={team.id} flag={team.flag} name={team.name} size={40} />{' '}
					</>
				)}
				{heading}
			</h1>
			{!team.eliminated && (
				<div>
					<div className={styles.metaRow}>
						{record && (
							<span
								className={styles.recordBadge}
								aria-label={`Record: ${record.summary.replace(/-/g, ' wins, ').replace(/-/g, ' draws, ')} losses`}
							>
								{record.summary}
							</span>
						)}
						{teamRecordLoading && !record && (
							<span
								className={`${styles.recordBadge} ${styles.skeleton}`}
								aria-hidden="true"
								style={{ width: '56px', minHeight: '18px' }}
							/>
						)}
						{teamRecordError && !record && (
							<span className={styles.recordError}>Couldn&apos;t load record</span>
						)}
						{groupPosition != null && (
							<span
								className={styles.contextBadge}
								aria-label={`${ordinal(groupPosition)} in Group ${team.group}`}
							>
								{ordinal(groupPosition)} in Group {team.group}
							</span>
						)}
						{team.fifaRank != null && (
							<span className={styles.contextBadge} aria-label={`FIFA world rank ${team.fifaRank}`}>
								FIFA #{team.fifaRank}
							</span>
						)}
					</div>
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
			{!isHistorical && links.length > 0 && (
				<div className={styles.espnLinks} aria-label="External links">
					<span className={styles.espnLinksLabel}>On ESPN:</span>
					{links
						.filter((l) => l.isDesktop && (l.rel === 'stats' || l.rel === 'clubhouse'))
						.map((l) => (
							<a
								key={l.rel}
								href={l.href}
								target="_blank"
								rel="noopener noreferrer"
								className={styles.espnLink}
							>
								{l.text}
							</a>
						))}
				</div>
			)}
		</div>
	)

	const nextMatchCard = nextEvent ? (
		<div className={styles.nextMatch} role="complementary" aria-label="Next match">
			<div className={styles.nextMatchLabel}>
				{nextEvent.isLive ? (
					<span className={styles.nextMatchLiveLabel}>
						<span className={styles.nextMatchLiveDot} aria-hidden="true" />
						LIVE {nextEvent.clock || ''}
					</span>
				) : (
					'Next Match'
				)}
			</div>
			<div className={styles.nextMatchTeams}>
				<FlagIcon code={team.id} flag={team.flag} name={team.name} />
				<span className={styles.nextMatchVs}>vs</span>
				<TeamFlagLink
					teamId={NAME_TO_ID[nextEvent.opponent]}
					teamName={nextEvent.opponent}
					onPeek={onTeamPeek ?? (() => {})}
					disabled={!onTeamPeek}
				>
					<FlagIcon flag={nextEvent.opponentFlag} opponent={nextEvent.opponent} />
					<span className={styles.nextMatchOpponent}>{nextEvent.opponent}</span>
				</TeamFlagLink>
			</div>
			{nextEvent.isLive && nextEvent.score && (
				<div className={styles.nextMatchScore} aria-label={`Live score: ${nextEvent.score}`}>
					{nextEvent.score}
				</div>
			)}
			<div className={styles.nextMatchDetails}>
				{nextEvent.date && (
					<span>
						{formatDate(nextEvent.date)} ·{' '}
						{new Date(nextEvent.date).toLocaleTimeString([], {
							hour: 'numeric',
							minute: '2-digit',
							timeZoneName: 'short',
						})}
					</span>
				)}
				{nextEvent.venue && <span className={styles.nextMatchVenue}>{nextEvent.venue}</span>}
			</div>
			{nextEvent.broadcasts.length > 0 && (
				<div className={styles.nextMatchBroadcasts}>{nextEvent.broadcasts.join(' / ')}</div>
			)}
		</div>
	) : teamRecordLoading ? (
		<div
			className={`${styles.nextMatch} ${styles.skeleton}`}
			aria-hidden="true"
			role="presentation"
		>
			<div
				className={styles.skelLine}
				style={{ width: '80px', height: '10px', marginBottom: '10px' }}
			/>
			<div
				className={styles.skelLine}
				style={{ width: '100%', height: '24px', marginBottom: '8px' }}
			/>
			<div className={styles.skelLine} style={{ width: '70%', height: '12px' }} />
		</div>
	) : null

	const goalsFor = record?.stats?.pointsFor

	const probNote =
		!team.eliminated && !isHistorical
			? source === 'market'
				? 'Advancement probabilities from Polymarket prediction markets — crowd-sourced estimates based on live trading.'
				: 'Advancement probabilities estimated from FIFA rankings and simulated outcomes. No Polymarket data available for this team.'
			: isHistorical
				? 'Probabilities reflect the selected historical snapshot — not current market prices.'
				: null

	const statGridEl = !team.eliminated ? (
		<>
			<div
				className={styles.statGrid}
				role="list"
				aria-label="Tournament statistics and advancement probabilities"
			>
				{/* ── Goals ── */}
				<div
					role="listitem"
					className={`${styles.statCard} ${styles.statCardGoals}`}
					aria-label={`Total goals: ${goalsFor ?? '\u2014'}`}
				>
					<div className={`${styles.statValue} ${styles.statValueGoals}`}>
						{goalsFor ?? '\u2014'}
					</div>
					<div className={styles.statLabel}>Total Goals</div>
					<div className={styles.statSub}>ESPN</div>
				</div>

				{/* ── Group Win ── */}
				{(() => {
					const effectivePct = liveGroupVal ?? groupWinProb?.probability
					const clinched = isGroupWinClinched(team, data, effectivePct)
					const groupUrl = !clinched && groupWinProb && !isHistorical
						? polymarketGroupUrl(groupWinProb.groupLetter)
						: undefined
					const groupLabel = groupWinProb ? `Win Group ${groupWinProb.groupLetter}` : 'Win Group'
					const groupAria = clinched
						? `Group ${groupWinProb?.groupLetter ?? team.group} clinched`
						: groupWinProb
							? `Win Group ${groupWinProb.groupLetter}: ${effectivePct ?? 0}%`
							: 'Win group probability not available'
					const groupContent = clinched ? (
						<>
							<div className={`${styles.statValue} ${styles.statValueGroup} ${styles.statValueClinched}`}>
								<span className={styles.clinchedCheck} aria-hidden="true">✓</span> Clinched
							</div>
							<div className={styles.statLabel}>{groupLabel}</div>
							<div className={styles.statSub}>Confirmed</div>
						</>
					) : (
						<>
							<div className={`${styles.statValue} ${styles.statValueGroup}`}>
								{effectivePct ?? '\u2014'}%
								<GroupChangeArrow value={effectivePct} />
							</div>
							<div className={styles.statLabel}>{groupLabel}</div>
							<div className={styles.statSub}>Polymarket</div>
						</>
					)
					return groupUrl ? (
						<a
							role="listitem"
							href={groupUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={`${styles.statCard} ${styles.statCardGroup} ${styles.statCardLink}`}
							aria-label={`${groupAria} \u2014 opens Polymarket in a new tab`}
						>
							{groupContent}
						</a>
					) : (
						<div
							role="listitem"
							className={`${styles.statCard} ${styles.statCardGroup}`}
							aria-label={groupAria}
						>
							{groupContent}
						</div>
					)
				})()}

				{/* ── Stage probabilities ── */}
				{STAT_CARD_DEFS.map((card) => {
					const cardKey = card.key as keyof AdvanceProbabilities
					const staticValue = (ap[cardKey] ?? 0) as number
					const live = liveStageVal(cardKey)
					const value: number = live ?? staticValue
					const clinched = isStageClinched(team, cardKey, value)
					const stageUrl = !clinched && !isHistorical && source === 'market'
						? POLYMARKET_STAGE_URLS[card.key as keyof typeof POLYMARKET_STAGE_URLS]
						: undefined
					const aria = clinched
						? `${card.label}: clinched`
						: `${card.label}: ${value}%`
					const inner = clinched ? (
						<>
							<div className={`${styles.statValue} ${card.valueClass} ${styles.statValueClinched}`}>
								<span className={styles.clinchedCheck} aria-hidden="true">✓</span> Clinched
							</div>
							<div className={styles.statLabel}>{card.label}</div>
							<div className={styles.statSub}>Confirmed</div>
						</>
					) : (
						<>
							<div className={`${styles.statValue} ${card.valueClass}`}>
								{value}%
								<StageChangeArrow value={value} />
							</div>
							<div className={styles.statLabel}>{card.label}</div>
							<div className={styles.statSub}>{sourceLabel}</div>
						</>
					)
					return stageUrl ? (
						<a
							key={card.key}
							role="listitem"
							href={stageUrl}
							target="_blank"
							rel="noopener noreferrer"
							className={`${styles.statCard} ${card.cardClass} ${styles.statCardLink}`}
							aria-label={`${aria} — opens Polymarket in a new tab`}
						>
							{inner}
						</a>
					) : (
						<div
							key={card.key}
							role="listitem"
							className={`${styles.statCard} ${card.cardClass}`}
							aria-label={aria}
						>
							{inner}
						</div>
					)
				})}
			</div>
			{probNote && <p className={styles.probNote}>{probNote}</p>}
		</>
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
