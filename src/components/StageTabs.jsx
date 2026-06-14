import { STAGE_ORDER, STAGE_LABELS, STAGE_LABELS_SHORT } from '../constants'
import { stageIndex } from '../utils'
import styles from './StageTabs.module.css'

function getTabClasses(styles, i, currentIdx, stage, team, selectedStage) {
	const isDone = i < currentIdx
	const isCur = stage === team.currentStage
	const isElim = team.eliminated && i === currentIdx
	const isSel = stage === selectedStage

	return [
		styles.tab,
		isDone ? styles.done : '',
		isCur ? styles.current : '',
		(!isDone && !isCur) ? styles.future : '',
		isElim ? styles.elim : '',
		isSel ? styles.selected : '',
	].filter(Boolean).join(' ')
}

export default function StageTabs({ team, selectedStage, onSelect }) {
	const currentIdx = stageIndex(team.currentStage ?? 'group_stage')

	function handleKeyDown(e, stage) {
		const idx = STAGE_ORDER.indexOf(stage)
		if (e.key === 'ArrowRight' && idx < STAGE_ORDER.length - 1) {
			onSelect(STAGE_ORDER[idx + 1])
		} else if (e.key === 'ArrowLeft' && idx > 0) {
			onSelect(STAGE_ORDER[idx - 1])
		}
	}

	return (
		<div className={styles.outer} role="tablist" aria-label="Tournament stage">
			<div className={styles.inner}>
				{STAGE_ORDER.map((stage, i) => {
					const path = team.path?.[stage]

					return (
						<button
							key={stage}
							role="tab"
							aria-selected={stage === selectedStage}
							aria-label={`${STAGE_LABELS[stage]}${path?.city ? `, ${path.city}` : ''}${i < currentIdx ? ', completed' : stage === team.currentStage ? ', current stage' : ''}`}
							className={getTabClasses(styles, i, currentIdx, stage, team, selectedStage) + ' stage-tab'}
							onClick={() => onSelect(stage)}
							onKeyDown={e => handleKeyDown(e, stage)}
							tabIndex={stage === selectedStage ? 0 : -1}
						>
							{(team.eliminated && i === currentIdx) && <span className={`${styles.icon} emoji`} aria-hidden="true">✕</span>}
							{(i < currentIdx && !(team.eliminated && i === currentIdx)) && <span className={`${styles.icon} emoji`} aria-hidden="true">✓</span>}
							{(stage === team.currentStage && !team.eliminated) && <span className={`${styles.pulse} emoji`} aria-hidden="true">●</span>}

							<span className={styles.labelFull}>{STAGE_LABELS[stage]}</span>
							<span className={styles.labelShort} aria-hidden="true">{STAGE_LABELS_SHORT[stage]}</span>

							{path?.city && (
								<span className={styles.city}>
									{path.city.split('·')[0].trim()}
								</span>
							)}
							{path?.conditional && stage !== team.currentStage && i >= currentIdx && (
								<span className={`${styles.conditional} emoji`} aria-label="Conditional on finishing position" title={path.conditionNote ?? 'Conditional venue'}>
									⚠
								</span>
							)}
						</button>
					)
				})}
			</div>
		</div>
	)
}