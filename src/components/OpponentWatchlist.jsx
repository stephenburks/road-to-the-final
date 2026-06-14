import { STAGE_LABELS } from '../constants'
import { formatDate, getFeederGroup } from '../utils'
import SectionLabel from './ui/SectionLabel'
import { GroupTable } from './GroupStage'
import styles from './OpponentWatchlist.module.css'

function DiffPips({ level, color, max = 5 }) {
	return (
		<div className={styles.pips} aria-label={`Difficulty ${level} out of ${max}`}>
			{Array.from({ length: max }).map((_, i) => (
				<div
					key={i}
					className={styles.pip}
					style={{ background: i < level ? color : 'rgba(255,255,255,0.1)' }}
				/>
			))}
		</div>
	)
}

function OpponentCard({ opp, compact = false }) {
	const borderColor = opp.difficulty >= 5
		? 'rgba(239,68,68,0.22)'
		: opp.difficulty >= 4
			? 'rgba(251,146,60,0.16)'
			: 'rgba(255,255,255,0.07)'

	const teamName = opp.likelyTeam ?? opp.opponent ?? 'TBD'

	return (
		<article
			className={`${styles.card} ${compact ? styles.cardCompact : ''}`}
			style={{ border: `1px solid ${borderColor}` }}
			aria-label={`${teamName}${opp.label ? `, ${opp.label}` : ''}${opp.pct != null ? `, ${opp.pct}% probability` : ''}`}
		>
			{opp.color && (
				<div className={styles.topBar} style={{ background: opp.color }} aria-hidden="true" />
			)}
			<div className={styles.cardHeader}>
				<span className={styles.flag} aria-hidden="true">{opp.flag ?? '🏳️'}</span>
				{opp.group && <span className={styles.groupTag}>Grp {opp.group}</span>}
			</div>
			<div className={styles.teamName}>{teamName}</div>
			{opp.fifaRank && <div className={styles.rank}>FIFA #{opp.fifaRank}</div>}
			{opp.difficulty != null && (
				<div className={styles.diffRow}>
					<span className={styles.diffLabel} style={{ color: opp.color ?? 'var(--amber)' }}>{opp.label}</span>
					<DiffPips level={opp.difficulty} color={opp.color} />
				</div>
			)}
			{opp.pct != null && (
				<div className={styles.prob} aria-label={`${opp.pct}% probability of this matchup`}>
					{opp.pct}% chance
				</div>
			)}
			{opp.note && <p className={styles.note}>{opp.note}</p>}
			{opp.altTeam && (
				<div className={styles.alt}>
					<span>or</span>
					<span aria-hidden="true">{opp.altFlag}</span>
					<span>{opp.altTeam}</span>
				</div>
			)}
		</article>
	)
}

function getGroupTag(teamName, data) {
	if (!data?.groups || !teamName) return null
	for (const [key, g] of Object.entries(data.groups)) {
		const s = g.standings?.find(r => r.team === teamName)
		if (s) return { group: key, pos: s.pos }
	}
	return null
}

function MatchupRow({ opp, team, maxPct, data }) {
	const name = opp.opponent ?? opp.likelyTeam ?? 'TBD'
	const tag = getGroupTag(name, data)
	return (
		<div className={styles.matchupRow}>
			<div className={styles.matchupTeams}>
				<span aria-hidden="true">{opp.flag ?? '🏳️'}</span>
				<span className={styles.matchupName}>
					{team.flag} {team.name} vs {name}
					{tag && (
						<span
							style={{
								fontFamily: 'var(--font-mono)',
								fontSize: 9,
								color: 'var(--text-dim)',
								marginLeft: 6,
								whiteSpace: 'nowrap',
							}}
						>
							G{tag.group}#{tag.pos}
						</span>
					)}
				</span>
			</div>
			<div
				className={styles.matchupTrack}
				role="progressbar"
				aria-valuenow={opp.pct}
				aria-valuemin={0}
				aria-valuemax={100}
				aria-label={`${opp.pct}% probability`}
			>
				<div className={styles.matchupFill} style={{ width: `${(opp.pct / maxPct) * 100}%` }} />
			</div>
			<div className={styles.matchupPct}>{opp.pct}%</div>
		</div>
	)
}

function MatchupMatrix({ flatList, team, maxPct, data }) {
	const sorted = [...flatList].filter(o => o.pct != null).sort((a, b) => b.pct - a.pct)
	const top4 = sorted.slice(0, 4)

	return (
		<div className={styles.matchupSection}>
			<div className={styles.matchupList}>
				{sorted.map((opp, i) => (
					<MatchupRow key={i} opp={opp} team={team} maxPct={maxPct} data={data} />
				))}
			</div>
			<div className={styles.calloutGrid}>
				{top4.map((opp, i) => (
					<div
						key={i}
						className={styles.calloutCard}
						style={{
							background: i === 0 ? 'rgba(99,102,241,0.1)' : 'rgba(255,255,255,0.03)',
							border: `1px solid ${i === 0 ? 'rgba(99,102,241,0.3)' : 'rgba(255,255,255,0.07)'}`,
						}}
					>
						<span style={{ fontSize: 22 }}>{opp.flag ?? '🏳️'}</span>
						<div>
							<div className={styles.calloutVs}>{team.flag} vs {opp.opponent ?? opp.likelyTeam}</div>
							<div className={styles.calloutPct} style={{ color: i === 0 ? '#a5b4fc' : 'var(--text-dim)' }}>
								{opp.pct}%
							</div>
							{opp.note && <div className={styles.calloutNote}>{opp.note}</div>}
						</div>
					</div>
				))}
			</div>
		</div>
	)
}

function FutureStagePlaceholder({ stage, path }) {
	return (
		<div className={styles.futurePlaceholder}>
			<div className={styles.futureIcon} aria-hidden="true">⏳</div>
			<div className={styles.futureText}>
				<strong>{STAGE_LABELS[stage]} opponents update live</strong>
				<p>
					Possible opponents will be shown here as the bracket fills in.
					{path?.city && (
						<span> Expected venue: {path.city}
							{path.conditional && ' (conditional on path through bracket).'}</span>
					)}
				</p>
			</div>
		</div>
	)
}

function VenueBanner({ stagePath, activeStage }) {
	return (
		<div
			className={`${styles.banner} ${stagePath.conditional ? styles.bannerConditional : ''}`}
			role="note"
		>
			<div className={styles.bannerMain}>
				<strong>{STAGE_LABELS[activeStage]}</strong>
				{stagePath.match ? ` · Match ${stagePath.match}` : ''}
				{stagePath.date?.match(/^\d{4}/) ? ` · ${formatDate(stagePath.date)}` : ''}
				{stagePath.venue ? ` · ${stagePath.venue}, ${stagePath.city}` : stagePath.city ? ` · ${stagePath.city}` : ''}
			</div>
			{stagePath.conditional && stagePath.conditionNote && (
				<div className={styles.bannerConditionalNote}>
					<span className={styles.conditionalIcon} aria-hidden="true">⚠️</span>
					{stagePath.conditionNote}
				</div>
			)}
			{!stagePath.conditional && stagePath.opponentDesc && (
				<div className={styles.bannerSub}>{stagePath.opponentDesc}</div>
			)}
		</div>
	)
}

export default function OpponentWatchlist({ team, activeStage, data }) {
	const stagePath = team.path?.[activeStage]
	const oppData = team.possibleOpponents?.[activeStage]

	if (activeStage === 'group_stage') return null

	const hasScenarios = Array.isArray(oppData?.scenarios)
	const flatList = Array.isArray(oppData) ? oppData : []
	const hasFlat = flatList.length > 0
	const isLateStage = ['qf', 'sf', 'final'].includes(activeStage)
	const r16WithPct = activeStage === 'r16' && flatList.some(o => o.pct != null)
	const r32Feeder = activeStage === 'r32' ? getFeederGroup(team, 'r32', data) : null
	const r16Feeder = activeStage === 'r16' ? getFeederGroup(team, 'r16', data) : null
	const maxPct = r16WithPct ? Math.max(...flatList.map(o => o.pct ?? 0), 1) : 1

	return (
		<section className="wrap section" id="opponents" aria-labelledby="opponents-heading">
			<SectionLabel text={`${STAGE_LABELS[activeStage]} — ${isLateStage ? 'Path Ahead' : 'Opponent Watchlist'}`} />
			<h2 id="opponents-heading" className="sr-only">
				{isLateStage ? 'Path ahead in the ' : 'Possible opponents in the '}{STAGE_LABELS[activeStage]}
			</h2>

			{stagePath && <VenueBanner stagePath={stagePath} activeStage={activeStage} />}

			{isLateStage && <FutureStagePlaceholder stage={activeStage} path={stagePath} />}

			{!isLateStage && hasScenarios && (
				<div className={styles.scenarios}>
					{oppData.scenarios.map((scenario, i) => (
						<div key={i} className={styles.scenario}>
							<div className={styles.scenarioHeader}>
								<span className={styles.scenarioLabel}>{scenario.condition}</span>
								<span className={styles.scenarioProb}>{scenario.probability}% likely</span>
							</div>
							{scenario.venue && (
								<div className={styles.scenarioMeta}>
									{scenario.date ? `${formatDate(scenario.date)} · ` : ''}{scenario.venue}
								</div>
							)}
							<div className={styles.grid}>
								{(scenario.opponents ?? []).map((opp, j) => (
									<OpponentCard key={j} opp={opp} />
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{!isLateStage && !hasScenarios && hasFlat && !r16WithPct && (
				<div className={styles.grid}>
					{flatList.map((opp, i) => <OpponentCard key={i} opp={opp} />)}
				</div>
			)}

			{r32Feeder && (
				<div style={{ marginTop: 20 }}>
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 9,
							color: 'var(--text-dim)',
							marginBottom: 8,
							lineHeight: 1.5,
						}}
					>
						Potential opponent&rsquo;s group — based on current standings: Group {r32Feeder.key}
					</div>
					<GroupTable groupKey={r32Feeder.key} groupData={r32Feeder.group} highlightTeamId={null} />
				</div>
			)}

			{r16WithPct && (
				<MatchupMatrix flatList={flatList} team={team} maxPct={maxPct} data={data} />
			)}

			{r16Feeder && (
				<div style={{ marginTop: r16WithPct ? 24 : 0 }}>
					<div
						style={{
							fontFamily: 'var(--font-mono)',
							fontSize: 9,
							color: 'var(--text-dim)',
							marginBottom: 8,
							lineHeight: 1.5,
						}}
					>
						Potential R16 opponent&rsquo;s group — if {team.name} wins Group {team.group}, they face the winner of Group {r16Feeder.key}
					</div>
					<GroupTable groupKey={r16Feeder.key} groupData={r16Feeder.group} highlightTeamId={null} />
				</div>
			)}

			{activeStage === 'r32' && (hasFlat || hasScenarios) && (
				<div className={styles.legend} role="note" aria-label="Difficulty key">
					<span>🟢 Favorable</span>
					<span>🟡 Moderate</span>
					<span>🟠 Tough</span>
					<span>🔴 Danger</span>
				</div>
			)}
		</section>
	)
}