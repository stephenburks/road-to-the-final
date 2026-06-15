import type { Team, AppData, GroupMatch } from '../types'
import { formatDate, getFeederGroup } from '../utils'
import SectionLabel from './ui/SectionLabel'
import FlagIcon from './ui/FlagIcon'
import { GroupTable } from './ui/GroupTable'
import FeederGroupPanel from './ui/FeederGroupPanel'
import styles from './GroupStage.module.css'

const BADGE_STYLES = {
	W: { background: '#052e16', color: '#22c55e' },
	D: { background: '#1c1917', color: '#a8a29e' },
	L: { background: '#2d0a0a', color: '#ef4444' },
}

const RESULT_LABELS = { W: 'Win', D: 'Draw', L: 'Loss' }

const CARD_BG = {
	W: 'rgba(34,197,94,0.06)',
	D: 'rgba(99,102,241,0.04)',
}

const CARD_BORDER = {
	W: 'rgba(34,197,94,0.2)',
	D: 'rgba(99,102,241,0.15)',
}

function MatchCard({ match, teamFlag, teamId, teams }: {
	match: GroupMatch
	teamFlag: string
	teamId: string
	teams: Team[]
}) {
	const badgeStyle = match.result ? (BADGE_STYLES[match.result] ?? { background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }) : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }
	const isWin = match.result === 'W'
	const isDraw = match.result === 'D'
	const resultLabel = match.result ? (RESULT_LABELS[match.result] ?? 'To be played') : 'To be played'

	// Find opponent's match data for the same matchday
	const oppTeam = teams?.find(t => t.name === match.opponent)
	const oppMatch = oppTeam?.groupResults?.find(g => g.matchday === match.matchday)

	return (
		<div
			className={styles.matchCard}
			style={{
				background: isWin ? CARD_BG.W : isDraw ? CARD_BG.D : 'rgba(255,255,255,0.03)',
				border: `1px solid ${isWin ? CARD_BORDER.W : isDraw ? CARD_BORDER.D : 'rgba(255,255,255,0.07)'}`,
			}}
		>
			<div className={styles.matchMeta}>
				<span>MD{match.matchday} · {formatDate(match.date)}</span>
				<span className={styles.badge} style={badgeStyle} aria-label={resultLabel}>
					{match.result ?? 'TBD'}
				</span>
			</div>

			<div className={styles.matchTeams}>
				<FlagIcon code={teamId} flag={teamFlag} />
				<span style={{ fontSize: 12, color: 'var(--text-lo)' }}>vs</span>
				<FlagIcon flag={match.opponentFlag} opponent={match.opponent} />
				<span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>{match.opponent}</span>
				{match.score && (
					<span className={styles.score} aria-label={`Score: ${match.score}`}>
						{match.score}
					</span>
				)}
			</div>

			{match.result && (
				<div className={styles.matchEvents}>
					<div className={styles.eventSide}>
						<div className={styles.eventTeam}>
							<FlagIcon code={teamId} flag={teamFlag} small />
						</div>
						{match.scorers?.length > 0 && (
							<ul className={styles.scorers} aria-label={`${teamId} goal scorers`}>
								{match.scorers.map((s, j) => <li key={j}><span className="emoji" aria-hidden="true">⚽</span> {s}</li>)}
							</ul>
						)}
						{match.cards?.length > 0 && (
							<ul className={styles.cards} aria-label={`${teamId} cards`}>
								{match.cards.map((c, j) => (
									<li key={j}>
										<span className={styles.cardIndicator} style={{ background: c.type === 'red' ? '#ef4444' : '#eab308' }} aria-hidden="true" />
										<span className="sr-only">{c.type === 'red' ? 'Red' : 'Yellow'} card: </span>
										{c.player} {c.minute}
									</li>
								))}
							</ul>
						)}
					</div>
					{oppMatch && (
						<div className={styles.eventSide}>
							<div className={styles.eventTeam}>
								<FlagIcon code={oppTeam?.id} flag={match.opponentFlag} small />
							</div>
							{oppMatch.scorers?.length > 0 && (
								<ul className={styles.scorers} aria-label={`${match.opponent} goal scorers`}>
									{oppMatch.scorers.map((s, j) => <li key={j}><span className="emoji" aria-hidden="true">⚽</span> {s}</li>)}
								</ul>
							)}
							{oppMatch.cards?.length > 0 && (
								<ul className={styles.cards} aria-label={`${match.opponent} cards`}>
									{oppMatch.cards.map((c, j) => (
										<li key={j}>
											<span className={styles.cardIndicator} style={{ background: c.type === 'red' ? '#ef4444' : '#eab308' }} aria-hidden="true" />
											<span className="sr-only">{c.type === 'red' ? 'Red' : 'Yellow'} card: </span>
											{c.player} {c.minute}
										</li>
									))}
								</ul>
							)}
						</div>
					)}
				</div>
			)}

			{!match.result && <div className={styles.venue}>{match.venue}</div>}
		</div>
	)
}

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
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 10,
							color: 'var(--text-dim)',
							textAlign: 'center',
							lineHeight: 1.5,
							alignSelf: 'center',
							padding: '0 16px',
						}}
					>
						The Round of 16 opponent isn&rsquo;t determined by a single group — depends on results from multiple R32 matches. Will update as the bracket fills in.
					</div>
				)}
			</div>

			<div
				role="note"
				style={{
					background: 'rgba(245,158,11,0.06)',
					border: '1px solid rgba(245,158,11,0.15)',
					color: '#fcd34d',
					fontSize: 11,
					padding: '10px 14px',
					borderRadius: 8,
					fontFamily: 'var(--font-mono)',
					marginTop: 12,
					marginBottom: 4,
					lineHeight: 1.5,
				}}
			>
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