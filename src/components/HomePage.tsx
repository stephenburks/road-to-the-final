import type { AppData } from '../types'
import type { View } from '../hooks/useAppState'
import DailyMatchCard from './DailyMatchCard'
import NewsSection from './NewsSection'
import styles from './HomePage.module.css'

interface HomePageProps {
	data: AppData
	selectedTeamId: string
	onTeamChange: (id: string) => void
	onViewChange: (v: View) => void
}

function todayStr(): string {
	return new Date().toISOString().split('T')[0]
}

function yesterdayStr(): string {
	const d = new Date()
	d.setDate(d.getDate() - 1)
	return d.toISOString().split('T')[0]
}

function tomorrowStr(): string {
	const d = new Date()
	d.setDate(d.getDate() + 1)
	return d.toISOString().split('T')[0]
}

const DAY_LABELS: Record<string, string> = {
	yesterday: "Yesterday's Matches",
	today: "Today's Matches",
	tomorrow: "Tomorrow's Matches",
}

export default function HomePage({ data, selectedTeamId, onTeamChange, onViewChange }: HomePageProps) {
	const dailyMatches = data.dailyMatches ?? {}

	const today = todayStr()
	const yesterday = yesterdayStr()
	const tomorrow = tomorrowStr()

	const sections = [
		{ key: 'yesterday', date: yesterday, matches: dailyMatches[yesterday] ?? [] },
		{ key: 'today', date: today, matches: dailyMatches[today] ?? [] },
		{ key: 'tomorrow', date: tomorrow, matches: dailyMatches[tomorrow] ?? [] },
	]

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

			{sections.map(({ key, date, matches }) => (
				<section key={key} className={`wrap ${styles.section}`}>
					<h2 className={styles.sectionHeading}>
						{DAY_LABELS[key] ?? `Matches for ${date}`}
						{matches.length > 0 && (
							<span className={styles.matchCount}>{matches.length}</span>
						)}
					</h2>
					{matches.length > 0 ? (
						<div className={styles.matchGrid} role="list" aria-label={`${DAY_LABELS[key] ?? date} matches`}>
							{matches.map((m, i) => (
								<div key={`${m.homeTeam}-${m.awayTeam}-${i}`} role="listitem">
									<DailyMatchCard match={m} />
								</div>
							))}
						</div>
					) : (
						<p className={styles.emptyState}>No matches scheduled for this date.</p>
					)}
				</section>
			))}

			<section className={`wrap ${styles.section}`}>
				<NewsSection />
			</section>
		</div>
	)
}