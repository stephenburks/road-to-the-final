import { useMemo } from 'react'
import type { AppData, DailyMatch, MatchupOdds } from '../types'
import type { View } from '../hooks/useAppState'
import { useLiveOverlayContext } from '../hooks/liveOverlayContext'
import type { LiveMatchPatch } from '../hooks/useLiveScores'
import { localDateStr } from '../utils'
import MatchCard from './groups/MatchCard'
import NewsSection from './NewsSection'
import ErrorBoundary from './ui/ErrorBoundary'
import styles from './HomePage.module.css'

interface HomePageProps {
	data: AppData
	selectedTeamId: string
	onTeamChange: (id: string) => void
	onTeamPeek?: (id: string) => void
	onViewChange: (v: View) => void
}

function dateOffset(base: string, days: number): string {
	const d = new Date(base + 'T12:00:00Z')
	d.setUTCDate(d.getUTCDate() + days)
	return d.toISOString().slice(0, 10)
}

const DAY_LABELS: Record<string, string> = {
	yesterday: "Yesterday's Matches",
	today: "Today's Matches",
	tomorrow: "Tomorrow's Matches",
}

/** Cross-reference a DailyMatch with team groupResults to extract scorers/cards */
function enrich(
	match: DailyMatch,
	teams: AppData['teams'],
	today: string,
	livePatch?: LiveMatchPatch,
	liveOdds?: MatchupOdds
) {
	const homeTeam = teams.find(t => t.id === match.homeId)
	const awayTeam = teams.find(t => t.id === match.awayId)

	const live = livePatch

	const homeResult = homeTeam?.groupResults?.find(
		g => g.opponent === match.awayTeam
	)
	const awayResult = awayTeam?.groupResults?.find(
		g => g.opponent === match.homeTeam
	)

	const rawStatus = live?.status ?? match.status
	// If static data says IN_PROGRESS for a past-date match but no live patch
	// confirms it, treat as FINISHED — the update script may have been captured mid-game.
	const effectiveStatus = rawStatus === 'IN_PROGRESS' && !live && match.date < today ? 'FINISHED' : rawStatus
	const effectiveScore = live ? `${live.homeScore}-${live.awayScore}` : (match.status !== 'SCHEDULED' ? `${match.homeScore}-${match.awayScore}` : null)

	return {
		mode: 'neutral' as const,
		homeTeam: match.homeTeam,
		homeFlag: match.homeFlag,
		homeId: match.homeId,
		awayTeam: match.awayTeam,
		awayFlag: match.awayFlag,
		awayId: match.awayId,
		score: effectiveScore,
		status: effectiveStatus === 'FINISHED' ? 'finished' as const : effectiveStatus === 'IN_PROGRESS' ? 'in_progress' as const : 'upcoming' as const,
		date: match.date,
		time: match.time,
		clock: live?.clock ?? match.clock,
		broadcasts: match.broadcasts,
		venue: match.venue,
		homeScorers: live?.homeScorers ?? homeResult?.scorers ?? [],
		awayScorers: live?.awayScorers ?? awayResult?.scorers ?? [],
		homeCards: live?.homeCards ?? homeResult?.cards ?? [],
		awayCards: live?.awayCards ?? awayResult?.cards ?? [],
		polymarket: liveOdds ?? match.polymarket,
	}
}

export default function HomePage({ data, selectedTeamId, onTeamChange, onTeamPeek, onViewChange }: HomePageProps) {
	const dailyMatches = useMemo(() => data.dailyMatches ?? {}, [data.dailyMatches])
	const { patches: livePatches, odds: liveOdds } = useLiveOverlayContext()

	// In historical mode, use the snapshot date as the anchor so "Today" shows
	// the snapshot day's matches rather than the actual current date.
	const baseDate = data.isHistorical && data.snapshotDate ? data.snapshotDate : localDateStr()
	const today = baseDate
	const yesterday = dateOffset(baseDate, -1)
	const tomorrow = dateOffset(baseDate, 1)

	const sections = useMemo(() => {
		const enrichDay = (date: string) =>
			(dailyMatches[date] ?? []).map(m => enrich(
				m,
				data.teams,
				today,
				livePatches?.get(`${m.homeId}:${m.awayId}`),
				liveOdds?.get(`${m.homeId}:${m.awayId}`),
			))

		const todayMatches = enrichDay(today)
		// Pin any in-progress match to the top of today's list; leave other days as-is
		const todaySorted = [
			...todayMatches.filter(m => m.status === 'in_progress'),
			...todayMatches.filter(m => m.status !== 'in_progress'),
		]

		return [
			{ key: 'today',    date: today,    matches: todaySorted },
			{ key: 'tomorrow', date: tomorrow, matches: enrichDay(tomorrow) },
			{ key: 'yesterday', date: yesterday, matches: enrichDay(yesterday) },
		]
	}, [dailyMatches, data.teams, today, yesterday, tomorrow, livePatches, liveOdds])

	return (
		<div className={styles.page}>
			<div className={`wrap ${styles.heroBanner}`}>
				<h1 className={styles.title}>Road to the Final</h1>
				<p className={styles.subtitle}>FIFA World Cup 2026</p>
				<div className={styles.actions}>
					<button
						className={styles.btnPrimary}
						onClick={() => onTeamChange(selectedTeamId)}
					>
						View Your Team
					</button>
					<button
						className={styles.btnSecondary}
						onClick={() => onViewChange('standings')}
					>
						View Standings
					</button>
				</div>
			</div>

			{sections.map(({ key, date, matches }) => {
					const hasLiveMatch = matches.some(m => m.status === 'in_progress')
					return (
						<section key={key} className={`wrap ${styles.section}`}>
							<h2 className={styles.sectionHeading}>
								{DAY_LABELS[key] ?? `Matches for ${date}`}
								{matches.length > 0 && (
									<span className={styles.matchCount}>{matches.length}</span>
								)}
							</h2>
							{matches.length > 0 ? (
								<div className={styles.matchGrid} role="list" aria-label={`${DAY_LABELS[key] ?? date} matches`} aria-live={hasLiveMatch ? 'polite' : 'off'}>
									{matches.map((m, i) => (
										<div key={`${m.homeTeam}-${m.awayTeam}-${i}`} role="listitem">
											<MatchCard {...m} onTeamPeek={onTeamPeek} />
										</div>
									))}
								</div>
							) : (
								<p className={styles.emptyState}>No matches scheduled for this date.</p>
							)}
						</section>
					)
				})}

			<section className={`wrap ${styles.section}`}>
				<ErrorBoundary name="news"><NewsSection /></ErrorBoundary>
			</section>
		</div>
	)
}