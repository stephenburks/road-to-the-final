import { STAGE_LABELS } from '../constants'
import { formatDate } from '../utils'
import SectionLabel from './ui/SectionLabel'
import styles from './OpponentWatchlist.module.css'

/** Difficulty pip row */
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

/** Single opponent card — works for both R32 watchlist style and R16 matchup style */
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

      {opp.fifaRank && (
        <div className={styles.rank}>FIFA #{opp.fifaRank}</div>
      )}

      {opp.difficulty != null && (
        <div className={styles.diffRow}>
          <span className={styles.diffLabel} style={{ color: opp.color ?? 'var(--amber)' }}>
            {opp.label}
          </span>
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

/** R16 matchup row — probability bar style, used when we have pct data */
function MatchupRow({ opp, team, maxPct }) {
  const name = opp.opponent ?? opp.likelyTeam ?? 'TBD'
  return (
    <div className={styles.matchupRow}>
      <div className={styles.matchupTeams}>
        <span aria-hidden="true">{opp.flag ?? '🏳️'}</span>
        <span className={styles.matchupName}>{team.flag} {team.name} vs {name}</span>
      </div>
      <div
        className={styles.matchupTrack}
        role="progressbar"
        aria-valuenow={opp.pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${opp.pct}% probability`}
      >
        <div
          className={styles.matchupFill}
          style={{ width: `${(opp.pct / maxPct) * 100}%` }}
        />
      </div>
      <div className={styles.matchupPct}>{opp.pct}%</div>
    </div>
  )
}

/** Placeholder for QF, SF, Final — these update as the bracket plays out */
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

/**
 * Opponent Watchlist — renders differently per stage:
 *
 * group_stage → not shown (no opponents yet)
 * r32         → grid of opponent cards with difficulty ratings (rich data)
 * r16         → probability bar matchup matrix (pct-based)
 * qf/sf/final → placeholder noting it updates as bracket resolves
 */
export default function OpponentWatchlist({ team, activeStage }) {
  const stagePath = team.path?.[activeStage]
  const oppData   = team.possibleOpponents?.[activeStage]

  // Don't render for group stage
  if (activeStage === 'group_stage') return null

  // Determine what kind of data we have
  const hasScenarios = Array.isArray(oppData?.scenarios)
  const flatList     = Array.isArray(oppData) ? oppData : []
  const hasFlat      = flatList.length > 0
  const isLateStage  = ['qf', 'sf', 'final'].includes(activeStage)

  // For R16: check if we have pct data for matchup matrix view
  const r16WithPct   = activeStage === 'r16' && flatList.some(o => o.pct != null)
  const maxPct       = r16WithPct ? Math.max(...flatList.map(o => o.pct ?? 0), 1) : 1

  return (
    <section
      className="wrap section"
      id="opponents"
      aria-labelledby="opponents-heading"
    >
      <SectionLabel text={`${STAGE_LABELS[activeStage]} — ${isLateStage ? 'Path Ahead' : 'Opponent Watchlist'}`} />
      <h2 id="opponents-heading" className="sr-only">
        {isLateStage ? 'Path ahead in the ' : 'Possible opponents in the '}{STAGE_LABELS[activeStage]}
      </h2>

      {/* Venue + match info banner */}
      {stagePath && (
        <div
          className={`${styles.banner} ${stagePath.conditional ? styles.bannerConditional : ''}`}
          role="note"
        >
          <div className={styles.bannerMain}>
            <strong>{STAGE_LABELS[activeStage]}</strong>
            {stagePath.match  ? ` · Match ${stagePath.match}` : ''}
            {stagePath.date?.match(/^\d{4}/) ? ` · ${formatDate(stagePath.date)}` : ''}
            {stagePath.venue  ? ` · ${stagePath.venue}, ${stagePath.city}` : stagePath.city ? ` · ${stagePath.city}` : ''}
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
      )}

      {/* Late stages: placeholder */}
      {isLateStage && (
        <FutureStagePlaceholder stage={activeStage} path={stagePath} />
      )}

      {/* R32 scenario-based view */}
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

      {/* R32 flat card grid */}
      {!isLateStage && !hasScenarios && hasFlat && !r16WithPct && (
        <div className={styles.grid}>
          {flatList.map((opp, i) => <OpponentCard key={i} opp={opp} />)}
        </div>
      )}

      {/* R16 probability matrix */}
      {r16WithPct && (
        <div className={styles.matchupSection}>
          <div className={styles.matchupList}>
            {[...flatList]
              .filter(o => o.pct != null)
              .sort((a, b) => b.pct - a.pct)
              .map((opp, i) => (
                <MatchupRow key={i} opp={opp} team={team} maxPct={maxPct} />
              ))}
          </div>

          {/* Top 4 callout cards */}
          <div className={styles.calloutGrid}>
            {[...flatList]
              .filter(o => o.pct != null)
              .sort((a, b) => b.pct - a.pct)
              .slice(0, 4)
              .map((opp, i) => (
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
                    <div className={styles.calloutVs}>
                      {team.flag} vs {opp.opponent ?? opp.likelyTeam}
                    </div>
                    <div
                      className={styles.calloutPct}
                      style={{ color: i === 0 ? '#a5b4fc' : 'var(--text-dim)' }}
                    >
                      {opp.pct}%
                    </div>
                    {opp.note && <div className={styles.calloutNote}>{opp.note}</div>}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Difficulty legend — only for R32 */}
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
