import { STAGE_ORDER, STAGE_LABELS, STAGE_LABELS_SHORT } from '../constants'
import { stageIndex } from '../utils'
import styles from './StageTabs.module.css'

/**
 * Horizontal tab row showing all 6 tournament stages.
 * - Completed stages show ✓
 * - Current stage pulses green
 * - Eliminated stage shows ✕ in red
 * - Clicking any tab fires onSelect
 * - Scrollable on mobile
 *
 * @param {object}   team          - selected team data
 * @param {string}   selectedStage - currently viewed stage
 * @param {function} onSelect      - called with stage key
 */
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
          const isDone  = i < currentIdx
          const isCur   = stage === team.currentStage
          const isSel   = stage === selectedStage
          const isElim  = team.eliminated && i === currentIdx
          const path    = team.path?.[stage]

          const tabClass = [
            styles.tab,
            isDone  ? styles.done     : '',
            isCur   ? styles.current  : '',
            !isDone && !isCur ? styles.future : '',
            isElim  ? styles.elim     : '',
            isSel   ? styles.selected : '',
          ].filter(Boolean).join(' ')

          return (
            <button
              key={stage}
              role="tab"
              aria-selected={isSel}
              aria-label={`${STAGE_LABELS[stage]}${path?.city ? `, ${path.city}` : ''}${isDone ? ', completed' : isCur ? ', current stage' : ''}`}
              className={tabClass + ' stage-tab'}
              onClick={() => onSelect(stage)}
              onKeyDown={e => handleKeyDown(e, stage)}
              tabIndex={isSel ? 0 : -1}
            >
              {isElim  && <span className={styles.icon} aria-hidden="true">✕</span>}
              {isDone  && !isElim && <span className={styles.icon} aria-hidden="true">✓</span>}
              {isCur   && !isElim && <span className={styles.pulse} aria-hidden="true">●</span>}

              <span className={styles.labelFull}>{STAGE_LABELS[stage]}</span>
              <span className={styles.labelShort} aria-hidden="true">{STAGE_LABELS_SHORT[stage]}</span>

              {path?.city && (
                <span className={styles.city}>
                  {path.city.split('·')[0].trim()}
                </span>
              )}
              {path?.conditional && !isCur && !isDone && (
                <span className={styles.conditional} aria-label="Conditional on finishing position" title={path.conditionNote ?? 'Conditional venue'}>
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
