import { STAGE_ORDER, STAGE_LABELS } from '../constants'
import { stageIndex, formatDate } from '../utils'
import SectionLabel from './ui/SectionLabel'
import styles from './RoadBracket.module.css'

const NODE_ICONS = {
  group_stage: 'GS',
  r32: '32',
  r16: '16',
  qf:  'QF',
  sf:  'SF',
  final: '★',
}

/**
 * Horizontal 6-stage bracket.
 * Clicking a stage node fires onStageSelect.
 */
export default function RoadBracket({ team, activeStage, onStageSelect }) {
  const currentIdx = stageIndex(team.currentStage ?? 'group_stage')
  const completePct = Math.min((currentIdx / 5) * 100, 100)

  const connectorGradient = `linear-gradient(to right,
    var(--green) 0%,
    var(--green) ${completePct * 0.9}%,
    rgba(99,102,241,0.35) ${completePct * 0.9 + 4}%,
    rgba(255,255,255,0.04) 100%)`

  return (
    <section className="wrap section" id="road" aria-labelledby="road-heading">
      <SectionLabel text="The Road to the Final" />
      <h2 id="road-heading" className="sr-only">Tournament bracket — {team.name}</h2>

      <div className={styles.outer}>
        {/* Connecting line behind nodes */}
        <div
          className={styles.connector}
          style={{ background: connectorGradient }}
          aria-hidden="true"
        />

        <div className={styles.grid} role="tablist" aria-label="Tournament stages">
          {STAGE_ORDER.map((stage, i) => {
            const isDone  = i < currentIdx
            const isCur   = stage === team.currentStage
            const isAct   = stage === activeStage
            const isElim  = team.eliminated && i === currentIdx
            const path    = team.path?.[stage]

            // Node styling
            const nodeBg     = isElim ? 'rgba(239,68,68,0.15)' : isDone ? 'rgba(34,197,94,0.12)' : isCur ? 'var(--green)' : isAct ? 'var(--purple-lo)' : 'rgba(255,255,255,0.03)'
            const nodeBorder = isElim ? 'var(--red)' : isDone ? 'rgba(34,197,94,0.4)' : isCur ? 'var(--green)' : isAct ? 'var(--purple)' : 'rgba(255,255,255,0.1)'
            const nodeColor  = isElim ? '#fca5a5' : isDone ? '#86efac' : isCur ? '#052e16' : isAct ? '#a5b4fc' : 'var(--text-dim)'
            const nodeShadow = isCur ? '0 0 14px rgba(34,197,94,0.5)' : isAct ? '0 0 10px rgba(99,102,241,0.4)' : 'none'
            const nodeIcon   = isElim ? '✕' : isDone ? '✓' : NODE_ICONS[stage]
            const nodeFontSz = isCur ? '13px' : '9px'

            // Card styling
            const cardBg     = isCur ? 'var(--green-lo)' : isAct ? 'var(--purple-lo)' : 'rgba(255,255,255,0.02)'
            const cardBorder = isCur ? 'var(--green-b)' : isAct ? 'var(--purple-b)' : 'rgba(255,255,255,0.05)'
            const titleColor = isElim ? '#fca5a5' : isDone ? '#86efac' : isCur ? '#86efac' : isAct ? '#c7d2fe' : 'var(--text-lo)'
            const detColor   = isCur ? 'var(--green)' : isDone ? '#86efac' : 'var(--text-dim)'

            return (
              <button
                key={stage}
                role="tab"
                aria-selected={isAct}
                aria-label={`${STAGE_LABELS[stage]}${path?.city ? ` in ${path.city}` : ''}${isDone ? ', completed' : isCur ? ', current' : ''}`}
                className={styles.stage}
                onClick={() => onStageSelect(stage)}
              >
                {/* Node circle */}
                <div
                  className={styles.node}
                  style={{
                    background: nodeBg,
                    border: `2px solid ${nodeBorder}`,
                    color: nodeColor,
                    boxShadow: nodeShadow,
                    fontSize: nodeFontSz,
                  }}
                  aria-hidden="true"
                >
                  {nodeIcon}
                </div>

                {/* Info card */}
                <div
                  className={styles.card}
                  style={{ background: cardBg, border: `1px solid ${cardBorder}` }}
                >
                  <div className={styles.cardTitle} style={{ color: titleColor }}>
                    {STAGE_LABELS[stage]}
                  </div>
                  <div className={styles.cardDate}>
                    {path?.date?.match(/^\d{4}/) ? formatDate(path.date) : (path?.date ?? '—')}
                  </div>
                  <div className={styles.cardCity} style={{ color: isAct ? '#818cf8' : 'var(--text-dim)' }}>
                    {path?.city ?? '—'}
                  </div>
                  <div className={styles.cardDetail} style={{ color: detColor }}>
                    {path?.detail ?? path?.opponentDesc ?? '—'}
                  </div>
                  {path?.conditional && (
                    <div
                      className={styles.cardConditional}
                      title={path.conditionNote ?? 'Venue depends on finishing position'}
                      aria-label={path.conditionNote ?? 'Conditional venue'}
                    >
                      ⚠ Conditional
                    </div>
                  )}
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}
