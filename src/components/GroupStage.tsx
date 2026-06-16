import { useMemo } from 'react'
import type { Team, AppData } from '../types'
import { getFeederGroup } from '../utils'
import { useLiveScores } from '../hooks/useLiveScores'
import SectionLabel from './ui/SectionLabel'
import { GroupTable } from './ui/GroupTable'
import FeederGroupPanel from './ui/FeederGroupPanel'
import MatchCard from './groups/MatchCard'
import styles from './GroupStage.module.css'

export default function GroupStage({ team, data }: { team: Team; data: AppData }) {
	const myGroup = data?.groups?.[team.group]
	const feeder = getFeederGroup(team, 'r16', data)

	const livePatches = useLiveScores(data.dailyMatches ?? {}, data.teams, data.isHistorical)

	const eliminatedTeamIds = useMemo(() => {
		const set = new Set<string>()
		for (const t of (data.teams ?? [])) {
			if (t.eliminated) set.add(t.id)
		}
		return set
	}, [data.teams])

	const resolveLiveData = (opponentName: string) => {
		if (!livePatches) return undefined
		const oppTeam = data.teams?.find(t => t.name === opponentName)
		if (!oppTeam) return undefined
		const patch = livePatches.get(`${team.id}:${oppTeam.id}`) ?? livePatches.get(`${oppTeam.id}:${team.id}`)
		if (!patch || patch.status === 'SCHEDULED') return undefined
		const isHome = livePatches.has(`${team.id}:${oppTeam.id}`)
		const myScore = isHome ? patch.homeScore : patch.awayScore
		const opScore = isHome ? patch.awayScore : patch.homeScore
		return {
			score: `${myScore}-${opScore}`,
			clock: patch.clock,
			status: patch.status,
			homeScorers: isHome ? patch.homeScorers : patch.awayScorers,
			awayScorers: isHome ? patch.awayScorers : patch.homeScorers,
			homeCards: isHome ? patch.homeCards : patch.awayCards,
			awayCards: isHome ? patch.awayCards : patch.homeCards,
			broadcasts: patch.broadcasts,
		}
	}

	const resolveTime = (opponentName: string) => {
		const oppTeam = data.teams?.find(t => t.name === opponentName)
		if (!oppTeam) return undefined
		const daily = (data.dailyMatches as Record<string, Array<{ homeId: string; awayId: string; time?: string }>>)
		for (const matches of Object.values(daily ?? {})) {
			const m = (matches as Array<{ homeId: string; awayId: string; time?: string }>).find(
				m => (m.homeId === team.id && m.awayId === oppTeam.id) || (m.homeId === oppTeam.id && m.awayId === team.id)
			)
			if (m?.time) return m.time
		}
		return undefined
	}

	return (
		<section className="wrap section" id="groups" aria-labelledby="groups-heading">
			<SectionLabel text="Group Stage Tracker" />
			<h2 id="groups-heading" className="sr-only">Group stage standings and results</h2>

			<div className={styles.groupGrid}>
				{myGroup && (
					<GroupTable
						groupKey={team.group}
						groupData={myGroup}
						highlightTeamId={team.id}
						eliminatedTeamIds={eliminatedTeamIds}
					/>
				)}
				{feeder && (
					<FeederGroupPanel
						feeder={feeder}
						marginTop={0}
						eliminatedTeamIds={eliminatedTeamIds}
						explanation={`The table shows Group ${feeder.key} standings — if ${team.name} wins Group ${team.group}, the winner of Group ${feeder.key} would be their Round of 16 opponent.`}
					/>
				)}
				{!feeder && (
					<div className={styles.noFeederMsg}>
						The Round of 16 opponent isn&rsquo;t determined by a single group — depends on results from multiple R32 matches. Will update as the bracket fills in.
					</div>
				)}
			</div>

			<div className={styles.disclaimer} role="note">
				⚠️ Bracket path, opponent scenarios, and venues assume {team.name} finishes 1st in Group {team.group}. If they finish 2nd or 3rd, the Round of 16 opponent, subsequent knockout path, and venues will be different.
			</div>

			<div className={styles.matchGrid}>
				{(team.groupResults ?? []).map((match, i) => (
					<MatchCard
						key={i}
						match={match}
						teamFlag={team.flag}
						teamId={team.id}
						teams={data.teams}
						liveData={resolveLiveData(match.opponent)}
						matchTime={resolveTime(match.opponent)}
					/>
				))}
			</div>
		</section>
	)
}
