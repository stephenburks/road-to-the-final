import { useMemo } from 'react'
import type { Team, AppData, DailyMatch } from '../types'
import { GROUP_SCHEDULE, MATCH_DATES } from '../data/tournamentSchedule'
import MatchCard from './groups/MatchCard'
import styles from './GamesToWatch.module.css'

/** Get YYYY-MM-DD for today/tomorrow in local time */
function dateStr(daysOffset = 0): string {
	const d = new Date()
	d.setDate(d.getDate() + daysOffset)
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function enrich(match: DailyMatch, teams: AppData['teams']) {
	const homeTeam = teams.find((t) => t.id === match.homeId)
	const awayTeam = teams.find((t) => t.id === match.awayId)
	const homeResult = homeTeam?.groupResults?.find((g) => g.opponent === match.awayTeam)
	const awayResult = awayTeam?.groupResults?.find((g) => g.opponent === match.homeTeam)

	return {
		mode: 'neutral' as const,
		homeTeam: match.homeTeam,
		homeFlag: match.homeFlag,
		homeId: match.homeId,
		awayTeam: match.awayTeam,
		awayFlag: match.awayFlag,
		awayId: match.awayId,
		score: match.status !== 'SCHEDULED' ? `${match.homeScore}-${match.awayScore}` : null,
		status:
			match.status === 'FINISHED'
				? ('finished' as const)
				: match.status === 'IN_PROGRESS'
					? ('in_progress' as const)
					: ('upcoming' as const),
		date: match.date,
		time: match.time,
		broadcasts: match.broadcasts,
		homeScorers: homeResult?.scorers ?? [],
		awayScorers: awayResult?.scorers ?? [],
		homeCards: homeResult?.cards ?? [],
		awayCards: awayResult?.cards ?? [],
	}
}

interface WatchMatch {
	match: ReturnType<typeof enrich>
	note: string
}

function findGroupWatchMatches(team: Team, data: AppData, targetDates: string[]): WatchMatch[] {
	const groupLetter = team.group
	const groupStandings = data.groups?.[groupLetter]?.standings ?? []
	const groupTeamIds = new Set(groupStandings.map((s) => s.teamId).filter(Boolean) as string[])

	const results: WatchMatch[] = []
	for (const date of targetDates) {
		const matches = data.dailyMatches?.[date] ?? []
		for (const match of matches) {
			// Only matches where BOTH teams are in the same group
			if (!groupTeamIds.has(match.homeId) || !groupTeamIds.has(match.awayId)) continue
			// Exclude matches involving the selected team (already shown elsewhere)
			if (match.homeId === team.id || match.awayId === team.id) continue

			results.push({
				match: enrich(match, data.teams),
				note: `This result affects ${team.name}'s group standing`,
			})
		}
	}
	return results
}

function findKnockoutWatchMatches(team: Team, data: AppData, _targetDates: string[]): WatchMatch[] {
	const path = team.path?.[team.currentStage ?? 'r32']
	const desc = path?.opponentDesc ?? ''
	const results: WatchMatch[] = []

	// "Winner Match N" pattern — show regardless of date (upcoming feeder match)
	const matchNumM = desc.match(/Winner\s+Match\s+(\d+)/i)
	if (matchNumM) {
		const matchNum = parseInt(matchNumM[1], 10)
		const matchDate = MATCH_DATES[matchNum]
		if (matchDate) {
			const dayMatches = data.dailyMatches?.[matchDate] ?? []
			for (const match of dayMatches) {
				results.push({
					match: enrich(match, data.teams),
					note: `Winner faces ${team.name} in ${team.currentStage?.toUpperCase() || 'next round'}`,
				})
			}
		}
		return results
	}

	// "Winner Group X" or "Runner-up Group X" pattern — show upcoming group matches
	const groupM = desc.match(/(Winner|Runner-up)\s+Group\s+([A-L])/i)
	if (groupM) {
		const oppGroup = groupM[2].toUpperCase()
		if (oppGroup === team.group) return results

		const schedules = GROUP_SCHEDULE[oppGroup] ?? []
		for (const sched of schedules) {
			const dayMatches = data.dailyMatches?.[sched.d] ?? []
			for (const match of dayMatches) {
				const scheduleIds = new Set(schedules.map((s) => [s.h, s.a]).flat())
				if (scheduleIds.has(match.homeId) || scheduleIds.has(match.awayId)) {
					results.push({
						match: enrich(match, data.teams),
						note: `Decides ${team.name}'s next opponent in ${team.currentStage?.toUpperCase() || 'next round'}`,
					})
				}
			}
		}
		return results
	}

	return results
}

interface GamesToWatchProps {
	team: Team
	data: AppData
}

export default function GamesToWatch({ team, data }: GamesToWatchProps) {
	const watchMatches = useMemo<WatchMatch[]>(() => {
		const today = dateStr(0)
		const tomorrow = dateStr(1)
		const targetDates = [today, tomorrow]

		const isGroupStage = team.currentStage === 'group_stage'

		if (isGroupStage) {
			return findGroupWatchMatches(team, data, targetDates)
		}
		return findKnockoutWatchMatches(team, data, targetDates)
	}, [team, data])

	if (watchMatches.length === 0) return null

	return (
		<section className="wrap section" id="games-to-watch" aria-labelledby="gtw-heading">
			<h2 id="gtw-heading" className={styles.heading}>
				Games to Watch
			</h2>
			<p className={styles.subtitle}>
				Matches happening today or tomorrow that could affect {team.name}&rsquo;s tournament run.
			</p>
			<div className={styles.grid} role="list" aria-label="Games to watch">
				{watchMatches.map((item, i) => (
					<div key={`${item.match.homeTeam}-${item.match.awayTeam}-${i}`} role="listitem">
						<MatchCard {...item.match} />
						<p className={styles.note} role="note">
							{item.note}
						</p>
					</div>
				))}
			</div>
		</section>
	)
}
