import { STAGE_LABELS } from '../constants'
import type { Stage, Team, AppData, Scenario } from '../types'
import { formatDate, getFeederGroup, computeScheduleDifficulty } from '../utils'
import SectionLabel from './ui/SectionLabel'
import FeederGroupPanel from './ui/FeederGroupPanel'
import OpponentCard from './opponents/OpponentCard'
import MatchupMatrix from './opponents/MatchupMatrix'
import DiffPips from './opponents/DiffPips'
import styles from './OpponentWatchlist.module.css'

function FutureStagePlaceholder({
	stage,
	path,
}: {
	stage: Stage
	path?: Team['path'][keyof Team['path']] | null
}) {
	return (
		<div className={styles.futurePlaceholder}>
			<div className={styles.futureIcon} aria-hidden="true" />
			<div className={styles.futureText}>
				<strong>{STAGE_LABELS[stage]} opponents update live</strong>
				<p>
					Possible opponents will be shown here as the bracket fills in.
					{path?.city && (
						<span>
							{' '}
							Expected venue: {path.city}
							{path.conditional && ' (conditional on path through bracket).'}
						</span>
					)}
				</p>
			</div>
		</div>
	)
}

function VenueBanner({
	stagePath,
	activeStage,
}: {
	stagePath: NonNullable<Team['path'][keyof Team['path']]>
	activeStage: Stage
}) {
	return (
		<div
			className={`${styles.banner} ${stagePath.conditional ? styles.bannerConditional : ''}`}
			role="note"
		>
			<div className={styles.bannerMain}>
				<strong>{STAGE_LABELS[activeStage]}</strong>
				{stagePath.match ? ` · Match ${stagePath.match}` : ''}
				{stagePath.date?.match(/^\d{4}/) ? ` · ${formatDate(stagePath.date)}` : ''}
				{stagePath.venue
					? ` · ${stagePath.venue}, ${stagePath.city}`
					: stagePath.city
						? ` · ${stagePath.city}`
						: ''}
			</div>
			{stagePath.conditional && stagePath.conditionNote && (
				<div className={styles.bannerConditionalNote}>
					<span className={styles.conditionalIcon} aria-hidden="true" />
					{stagePath.conditionNote}
				</div>
			)}
			{!stagePath.conditional && stagePath.opponentDesc && (
				<div className={styles.bannerSub}>{stagePath.opponentDesc}</div>
			)}
		</div>
	)
}

export default function OpponentWatchlist({
	team,
	activeStage,
	data,
	eliminatedTeamIds = new Set(),
}: {
	team: Team
	activeStage: Stage
	data: AppData
	eliminatedTeamIds?: Set<string>
}) {

	const stagePath = team.path?.[activeStage]
	const schedDiff = computeScheduleDifficulty(team)

	if (activeStage === 'group_stage') return null

	const oppData =
		activeStage === 'r32' || activeStage === 'r16' ? team.possibleOpponents[activeStage] : undefined

	const hasScenarios =
		oppData != null &&
		!Array.isArray(oppData) &&
		'scenarios' in oppData &&
		Array.isArray(oppData.scenarios)
	const flatList = Array.isArray(oppData) ? oppData : []
	const hasFlat = flatList.length > 0
	const isLateStage = ['qf', 'sf', 'final'].includes(activeStage)
	const r16WithPct = activeStage === 'r16' && flatList.some((o) => o.pct != null)
	const r32Feeder = activeStage === 'r32' ? getFeederGroup(team, 'r32', data) : null
	const r16Feeder = activeStage === 'r16' ? getFeederGroup(team, 'r16', data) : null
	const maxPct = r16WithPct ? Math.max(...flatList.map((o) => o.pct ?? 0), 1) : 1

	return (
		<section className="wrap section" id="opponents" aria-labelledby="opponents-heading">
			<SectionLabel
				text={`${STAGE_LABELS[activeStage]} — ${isLateStage ? 'Path Ahead' : 'Opponent Watchlist'}`}
			/>
			<h2 id="opponents-heading" className="sr-only">
				{isLateStage ? 'Path ahead in the ' : 'Possible opponents in the '}
				{STAGE_LABELS[activeStage]}
			</h2>

			{schedDiff && (
				<div className={styles.schedDiff} data-diff={schedDiff.score} aria-label={`Path difficulty: ${schedDiff.label}`}>
					<span className={styles.schedDiffLabel}>Path Difficulty</span>
					<DiffPips level={schedDiff.score} />
					<span className={styles.schedDiffText}>{schedDiff.label}</span>
				</div>
			)}

			{stagePath && <VenueBanner stagePath={stagePath} activeStage={activeStage} />}

			{isLateStage && <FutureStagePlaceholder stage={activeStage} path={stagePath} />}

			{!isLateStage && hasScenarios && (
				<div className={styles.scenarios}>
					{/* Scenarios code path: currently unused by live data.
						If data with scenarios is added, verify this rendering path. */}
					{(oppData as { scenarios: Scenario[] }).scenarios.map((scenario, i) => (
						<div key={i} className={styles.scenario}>
							<div className={styles.scenarioHeader}>
								<span className={styles.scenarioLabel}>{scenario.condition}</span>
								<span className={styles.scenarioProb}>{scenario.probability}% likely</span>
							</div>
							{scenario.venue && (
								<div className={styles.scenarioMeta}>
									{(scenario.date ? `${formatDate(scenario.date)} \u00B7 ` : '') + scenario.venue}
								</div>
							)}
							<div className={styles.grid}>
								{scenario.opponents.map((opp, j) => (
									<OpponentCard key={j} opp={opp} />
								))}
							</div>
						</div>
					))}
				</div>
			)}

			{!isLateStage && !hasScenarios && hasFlat && !r16WithPct && (
				<div className={styles.grid}>
					{flatList.map((opp, i) => (
						<OpponentCard key={i} opp={opp} />
					))}
				</div>
			)}

			{r32Feeder && (
				<FeederGroupPanel
					feeder={r32Feeder}
					eliminatedTeamIds={eliminatedTeamIds}
					explanation={`Potential opponent's group — based on current standings: Group ${r32Feeder.key}`}
				/>
			)}
			{!r32Feeder && activeStage === 'r32' && (
				<div className={styles.noFeederMsg}>
					Opponent pool spans multiple groups — will narrow as group stage standings update.
				</div>
			)}

			{r16WithPct && <MatchupMatrix flatList={flatList} team={team} maxPct={maxPct} data={data} />}

			{r16Feeder && (
				<FeederGroupPanel
					feeder={r16Feeder}
					marginTop={r16WithPct ? 24 : 0}
					eliminatedTeamIds={eliminatedTeamIds}
					explanation={`Potential R16 opponent's group — if ${team.name} wins Group ${team.group}, they face the winner of Group ${r16Feeder.key}`}
				/>
			)}
			{!r16Feeder && activeStage === 'r16' && (
				<div className={`${styles.noFeederMsg} ${r16WithPct ? styles.noFeederMsgExtra : ''}`}>
					Opponent depends on R32 results across multiple matches — will resolve as the knockout
					rounds progress.
				</div>
			)}

			{activeStage === 'r32' && (hasFlat || hasScenarios) && (
				<div className={styles.legend} role="note" aria-label="Difficulty key">
					<span>
						<span className={`${styles.legendPip} ${styles.legendPipFavorable}`} /> Favorable
					</span>
					<span>
						<span className={`${styles.legendPip} ${styles.legendPipModerate}`} /> Moderate
					</span>
					<span>
						<span className={`${styles.legendPip} ${styles.legendPipTough}`} /> Tough
					</span>
					<span>
						<span className={`${styles.legendPip} ${styles.legendPipDanger}`} /> Danger
					</span>
				</div>
			)}
		</section>
	)
}
