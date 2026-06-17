import { useMemo } from 'react'
import type { AppData, DailyMatch } from '../types'
import type { View } from '../hooks/useAppState'
import { useLiveScores, type LiveMatchPatch } from '../hooks/useLiveScores'
import MatchCard from './groups/MatchCard'
import NewsSection from './NewsSection'
import styles from './HomePage.module.css'

interface HomePageProps {
	data: AppData
	selectedTeamId: string
	onTeamChange: (id: string) => void
	onViewChange: (v: View) => void
}

function localDateStr(date = new Date()): string {
	return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function todayStr(): string { return localDateStr() }

function yesterdayStr(): string {
	const d = new Date()
	d.setDate(d.getDate() - 1)
	return localDateStr(d)
}

function tomorrowStr(): string {
	const d = new Date()
	d.setDate(d.getDate() + 1)
	return localDateStr(d)
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
	livePatch?: LiveMatchPatch
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

	const effectiveStatus = live?.status ?? match.status
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
		homeScorers: live?.homeScorers ?? homeResult?.scorers ?? [],
		awayScorers: live?.awayScorers ?? awayResult?.scorers ?? [],
		homeCards: live?.homeCards ?? homeResult?.cards ?? [],
		awayCards: live?.awayCards ?? awayResult?.cards ?? [],
	}
}

export default function HomePage({ data, selectedTeamId, onTeamChange, onViewChange }: HomePageProps) {
	const dailyMatches = useMemo(() => data.dailyMatches ?? {}, [data.dailyMatches])
	const livePatches = useLiveScores(dailyMatches, data.teams, data.isHistorical)

	const today = todayStr()
	const yesterday = yesterdayStr()
	const tomorrow = tomorrowStr()

	const sections = useMemo(() => [
		{ key: 'today', date: today, matches: (dailyMatches[today] ?? []).map(m => enrich(m, data.teams, livePatches?.get(`${m.homeId}:${m.awayId}`))) },
		{ key: 'yesterday', date: yesterday, matches: (dailyMatches[yesterday] ?? []).map(m => enrich(m, data.teams, livePatches?.get(`${m.homeId}:${m.awayId}`))) },
		{ key: 'tomorrow', date: tomorrow, matches: (dailyMatches[tomorrow] ?? []).map(m => enrich(m, data.teams, livePatches?.get(`${m.homeId}:${m.awayId}`))) },
	], [dailyMatches, data.teams, today, yesterday, tomorrow, livePatches])

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
											<MatchCard {...m} />
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
				<NewsSection />
			</section>
		</div>
	)
}