import { STAGE_ORDER, STAGE_LABELS } from '../constants'
import type { Stage, Team } from '../types'
import { stageIndex } from '../utils'
import SectionLabel from './ui/SectionLabel'
import BracketNode from './bracket/BracketNode'
import BracketCard from './bracket/BracketCard'
import { getNodeStyle, getCardStyle, connectorGradient } from './bracket/bracketStyles'
import styles from './RoadBracket.module.css'

export default function RoadBracket({ team, activeStage, onStageSelect }: {
	team: Team
	activeStage: Stage
	onStageSelect: (stage: Stage) => void
}) {
	const currentIdx = stageIndex(team.currentStage ?? 'group_stage')
	const gradient = connectorGradient(currentIdx)

	return (
		<section className="wrap section" id="road" aria-labelledby="road-heading">
			<SectionLabel text="The Road to the Final" />
			<h2 id="road-heading" className="sr-only">Tournament bracket — {team.name}</h2>

			<div className={styles.outer}>
				<div
					className={styles.connector}
					style={{ background: gradient }}
					aria-hidden="true"
				/>

				<div className={styles.grid} role="group" aria-label="Tournament stages">
					{STAGE_ORDER.map((stage, i) => {
						const isAct = stage === activeStage
						const path = team.path?.[stage]
						const node = getNodeStyle(i, currentIdx, stage, team, isAct)
						const card = getCardStyle(i, currentIdx, stage, team, isAct)

						return (
						<button
							key={stage}
							aria-pressed={isAct}
							aria-label={`${STAGE_LABELS[stage]}${path?.city ? ` in ${path.city}` : ''}${i < currentIdx ? ', completed' : stage === team.currentStage ? ', current' : ''}`}
								className={styles.stage}
								onClick={() => onStageSelect(stage)}
							>
								<BracketNode state={node.state} icon={node.icon} />
								<BracketCard path={path} card={card} isAct={isAct} stage={stage} />
							</button>
						)
					})}
				</div>
			</div>
		</section>
	)
}
