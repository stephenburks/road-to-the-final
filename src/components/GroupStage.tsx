import type { Team, AppData } from '../types'
import { getFeederGroup } from '../utils'
import SectionLabel from './ui/SectionLabel'
import { GroupTable } from './ui/GroupTable'
import FeederGroupPanel from './ui/FeederGroupPanel'
import MatchCard from './groups/MatchCard'
import styles from './GroupStage.module.css'

export default function GroupStage({ team, data }: { team: Team; data: AppData }) {
	const myGroup = data?.groups?.[team.group]
	const feeder = getFeederGroup(team, 'r16', data)

	return (
		<section className="wrap section" id="groups" aria-labelledby="groups-heading">
			<SectionLabel text="Group Stage Tracker" />
			<h2 id="groups-heading" className="sr-only">Group stage standings and results</h2>

			<div className={styles.groupGrid}>
				{myGroup && <GroupTable groupKey={team.group} groupData={myGroup} highlightTeamId={team.id} />}
				{feeder && (
					<FeederGroupPanel
						feeder={feeder}
						marginTop={0}
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
					<MatchCard key={i} match={match} teamFlag={team.flag} teamId={team.id} teams={data.teams} />
				))}
			</div>
		</section>
	)
}
