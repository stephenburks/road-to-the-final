import { STAGE_LABELS } from '../constants'
import { daysUntil, formatDate } from '../utils'
import styles from './Hero.module.css'

const STAT_CARDS = [
  { key: 'r32',   label: 'Reach Round of 32', color: '#22c55e', bg: 'rgba(34,197,94,0.08)',  border: 'rgba(34,197,94,0.28)'  },
  { key: 'r16',   label: 'Reach Round of 16', color: '#6366f1', bg: 'rgba(99,102,241,0.08)', border: 'rgba(99,102,241,0.28)' },
  { key: 'qf',    label: 'Reach Quarterfinal', color: '#f59e0b', bg: 'rgba(245,158,11,0.08)', border: 'rgba(245,158,11,0.28)' },
  { key: 'final', label: 'Reach the Final',    color: '#ef4444', bg: 'rgba(239,68,68,0.08)',  border: 'rgba(239,68,68,0.2)'   },
]

/**
 * Page hero — big city/date headline plus probability stat cards.
 *
 * @param {object}  team        - selected team
 * @param {string}  activeStage - currently viewed stage
 * @param {boolean} isHistorical - true when viewing a snapshot
 */
export default function Hero({ team, activeStage, isHistorical }) {
  const path = team.path?.[activeStage]
  const ap   = team.advanceProbabilities ?? {}
  const days = daysUntil(path?.date)

  const eyebrow = team.eliminated
    ? `❌ ${team.name} — Eliminated`
    : `${team.flag} ${team.name} · ${STAGE_LABELS[activeStage]}${isHistorical ? ' · Historical' : ''}`

  const heading = team.eliminated ? 'Journey Ended' : (path?.city ?? '—')
  const dateSuffix = path?.date?.match(/^\d{4}/) ? `. ${formatDate(path.date)}.` : ''

  const subtext = team.eliminated
    ? `${team.name} were knocked out in the ${STAGE_LABELS[team.currentStage ?? 'r32']}.`
    : days !== null
      ? `${STAGE_LABELS[activeStage]} is ${Math.max(days, 0)} day${days !== 1 ? 's' : ''} away.`
      : `Next: ${path?.date ?? '—'}`

  // Show a note when the displayed city is conditional on finishing position
  const conditionalNote = path?.conditional && !team.eliminated
    ? (path.conditionNote ?? 'Venue assumes current group standing — may change.')
    : null

  return (
    <div className="wrap">
      <section className={styles.hero} aria-labelledby="hero-heading">
        {/* Ambient background glow */}
        <div className={styles.glow} aria-hidden="true" />

        <div className={styles.inner}>
          <p className={styles.eyebrow}>{eyebrow}</p>
          <h1 id="hero-heading" className={styles.heading}>
            {heading}{dateSuffix}
          </h1>
          <p className={styles.subtext}>{subtext}</p>
          {conditionalNote && (
            <p className={styles.conditionalNote} role="note">
              <span aria-hidden="true">⚠️ </span>{conditionalNote}
            </p>
          )}

          {!team.eliminated && (
            <div
              className={styles.statGrid}
              role="list"
              aria-label="Tournament advancement probabilities"
            >
              {STAT_CARDS.map(card => (
                <div
                  key={card.key}
                  role="listitem"
                  className={styles.statCard}
                  style={{ background: card.bg, border: `1px solid ${card.border}` }}
                  aria-label={`${card.label}: ${ap[card.key] ?? 0}%`}
                >
                  <div className={styles.statValue} style={{ color: card.color }}>
                    {ap[card.key] ?? 0}%
                  </div>
                  <div className={styles.statLabel}>{card.label}</div>
                  <div className={styles.statSub}>
                    {isHistorical ? 'As of snapshot' : 'Probability'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
