import { useMemo } from 'react'
import type { Team, AppData, DailyMatch } from '../types'
import { GROUP_SCHEDULE, MATCH_DATES } from '../data/tournamentSchedule'
import { useLiveScores, type LiveMatchPatch } from '../hooks/useLiveScores'
import MatchCard from './groups/MatchCard'
import styles from './GamesToWatch.module.css'

/** Get YYYY-MM-DD for today/tomorrow in local time */
function dateStr(daysOffset = 0): string {
	const d = new Date()
	d.setDate(d.getDate() + daysOffset)
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function enrich(match: DailyMatch, teams: AppData['teams'], livePatch?: LiveMatchPatch) {
	const homeTeam = teams.find((t) => t.id === match.homeId)
	const awayTeam = teams.find((t) => t.id === match.awayId)
	const homeResult = homeTeam?.groupResults?.find((g) => g.opponent === match.awayTeam)
	const awayResult = awayTeam?.groupResults?.find((g) => g.opponent === match.homeTeam)

	const effectiveStatus = livePatch?.status ?? match.status
	const effectiveScore = livePatch
		? `${livePatch.homeScore}-${livePatch.awayScore}`
		: match.status !== 'SCHEDULED' ? `${match.homeScore}-${match.awayScore}` : null

	return {
		mode: 'neutral' as const,
		homeTeam: match.homeTeam,
		homeFlag: match.homeFlag,
		homeId: match.homeId,
		awayTeam: match.awayTeam,
		awayFlag: match.awayFlag,
		awayId: match.awayId,
		score: effectiveScore,
		status:
			effectiveStatus === 'FINISHED'
				? ('finished' as const)
				: effectiveStatus === 'IN_PROGRESS'
					? ('in_progress' as const)
					: ('upcoming' as const),
		clock: livePatch?.clock ?? match.clock,
		date: match.date,
		time: match.time,
		broadcasts: match.broadcasts,
		homeScorers: livePatch?.homeScorers ?? homeResult?.scorers ?? [],
		awayScorers: livePatch?.awayScorers ?? awayResult?.scorers ?? [],
		homeCards: livePatch?.homeCards ?? homeResult?.cards ?? [],
		awayCards: livePatch?.awayCards ?? awayResult?.cards ?? [],
	}
}

interface WatchMatch {
	match: ReturnType<typeof enrich>
	note: string
}

function findGroupWatchMatches(team: Team, data: AppData, targetDates: string[], livePatches: Map<string, LiveMatchPatch> | null): WatchMatch[] {
	const groupLetter = team.group
	const groupStandings = data.groups?.[groupLetter]?.standings ?? []
	const groupTeamIds = new Set(groupStandings.map((s) => s.teamId).filter(Boolean) as string[])

	const results: WatchMatch[] = []
	for (const date of targetDates) {
		const matches = data.dailyMatches?.[date] ?? []
		for (const match of matches) {
			if (!groupTeamIds.has(match.homeId) || !groupTeamIds.has(match.awayId)) continue
			if (match.homeId === team.id || match.awayId === team.id) continue
			const livePatch = livePatches?.get(`${match.homeId}:${match.awayId}`)
			results.push({
				match: enrich(match, data.teams, livePatch),
				note: `This result affects ${team.name}'s group standing`,
			})
		}
	}
	return results
}

function findKnockoutWatchMatches(team: Team, data: AppData, _targetDates: string[], livePatches: Map<string, LiveMatchPatch> | null): WatchMatch[] {
	const path = team.path?.[team.currentStage ?? 'r32']
	const desc = path?.opponentDesc ?? ''
	const results: WatchMatch[] = []

	const matchNumM = desc.match(/Winner\s+Match\s+(\d+)/i)
	if (matchNumM) {
		const matchNum = parseInt(matchNumM[1], 10)
		const matchDate = MATCH_DATES[matchNum]
		if (matchDate) {
			const dayMatches = data.dailyMatches?.[matchDate] ?? []
			for (const match of dayMatches) {
				const livePatch = livePatches?.get(`${match.homeId}:${match.awayId}`)
				results.push({
					match: enrich(match, data.teams, livePatch),
					note: `Winner faces ${team.name} in ${team.currentStage?.toUpperCase() || 'next round'}`,
				})
			}
		}
		return results
	}

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
					const livePatch = livePatches?.get(`${match.homeId}:${match.awayId}`)
					results.push({
						match: enrich(match, data.teams, livePatch),
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
	const livePatches = useLiveScores(data.dailyMatches ?? {}, data.teams, data.isHistorical)

	const watchMatches = useMemo<WatchMatch[]>(() => {
		const today = dateStr(0)
		const tomorrow = dateStr(1)
		const targetDates = [today, tomorrow]

		const isGroupStage = team.currentStage === 'group_stage'

		if (isGroupStage) {
			return findGroupWatchMatches(team, data, targetDates, livePatches)
		}
		return findKnockoutWatchMatches(team, data, targetDates, livePatches)
	}, [team, data, livePatches])

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
