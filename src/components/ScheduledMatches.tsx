import { STAGE_ORDER, STAGE_LABELS } from '../constants'
import type { Stage, Team, GroupMatch } from '../types'
import { formatDate, stageIndex } from '../utils'
import SectionLabel from './ui/SectionLabel'
import FlagIcon from './ui/FlagIcon'
import TeamFlagLink from './ui/TeamFlagLink'
import { NAME_TO_ID } from './ui/teamLookup'
import styles from './ScheduledMatches.module.css'

/**
 * Determines the status icon and CSS class for a match row.
 */
function matchStatus(result: GroupMatch['result']) {
  if (result === 'W') return { icon: '\u2713', className: styles.statusWin,   label: 'Win' }
  if (result === 'D') return { icon: '\u00BD', className: styles.statusDraw,  label: 'Draw' }
  if (result === 'L') return { icon: '\u2717', className: styles.statusLoss,  label: 'Loss' }
  return { icon: '?', className: styles.statusUpcoming, label: 'Upcoming' }
}

interface MatchRowProps {
	match: {
		result?: GroupMatch['result']
		opponent?: string | null
		opponentDesc?: string | null
		opponentFlag?: string
		date?: string
		score?: string | null
		venue?: string
	}
	teamFlag: string
	teamId: string
	isConditional?: boolean
	onTeamPeek?: (id: string) => void
}

/** A single match row */
function MatchRow({ match, teamFlag, teamId, isConditional = false, onTeamPeek }: MatchRowProps) {
  const status = matchStatus(match.result ?? null)

  return (
    <div
      className={`${styles.matchRow} ${match.result ? styles.played : styles.upcoming} ${isConditional ? styles.conditional : ''}`}
      aria-label={`${match.result ? status.label : 'Upcoming'}: vs ${match.opponent ?? match.opponentDesc ?? 'TBD'}`}
    >
      <div className={`${styles.matchStatus} ${status.className}`} aria-hidden="true" />

      <div className={styles.matchDate}>{formatDate(match.date)}</div>

      <div className={styles.matchTeams}>
        {match.result ? (
          <>
            <FlagIcon code={teamId} flag={teamFlag} />
            <span className={styles.vs}>vs</span>
            <TeamFlagLink
              teamId={match.opponent ? NAME_TO_ID[match.opponent] : undefined}
              teamName={match.opponent ?? ''}
              onPeek={onTeamPeek ?? (() => {})}
              disabled={!onTeamPeek}
            >
              <FlagIcon flag={match.opponentFlag} opponent={match.opponent ?? undefined} />
              <span className={styles.opponentName}>{match.opponent}</span>
            </TeamFlagLink>
          </>
        ) : (
          <span className={`${styles.opponentName} ${isConditional ? styles.opponentNameConditional : ''}`}>
            {match.opponent ?? match.opponentDesc ?? 'TBD'}
          </span>
        )}
        {match.score && (
          <span
            className={styles.score}
            aria-label={`Score: ${match.score}`}
          >
            {match.score}
          </span>
        )}
      </div>

      {match.venue && (
        <div className={styles.matchVenue}>{match.venue}</div>
      )}
    </div>
  )
}

interface StageBlockProps {
	stageKey: Stage
	team: Team
	onTeamPeek?: (id: string) => void
}

/** A stage block (Group Stage, R32, etc.) */
function StageBlock({ stageKey, team, onTeamPeek }: StageBlockProps) {
  const path = team.path?.[stageKey]
  const currentIdx = stageIndex(team.currentStage ?? 'group_stage')
  const stageIdx2  = stageIndex(stageKey)
  const isComplete = stageIdx2 < currentIdx
  const isCurrent  = stageKey === team.currentStage
  const isFuture   = stageIdx2 > currentIdx

  // Group stage: pull from groupResults
  if (stageKey === 'group_stage') {
    const results = team.groupResults ?? []
    if (!results.length) return null

    return (
      <div className={styles.stageBlock}>
        <div className={styles.stageHeader}>
          <span className={`${styles.stageLabel} ${isCurrent ? styles.stageCurrent : isComplete ? styles.stageDone : ''}`}>
            {STAGE_LABELS[stageKey]}
          </span>
        </div>
        {results.map((match, i) => (
          <MatchRow key={i} match={match} teamFlag={team.flag} teamId={team.id} onTeamPeek={onTeamPeek} />
        ))}
      </div>
    )
  }

  // Knockout stages: use path data
  if (!path) return null

  // Conditional match (team hasn't clinched this stage yet)
  const conditionalMatch = {
    date:        path.date,
    opponentDesc: path.opponentDesc ?? 'TBD',
    venue:       path.venue,
    result:      null,
    opponent:    null,
  }

  return (
    <div className={styles.stageBlock}>
      <div className={styles.stageHeader}>
          <span className={`${styles.stageLabel} ${isCurrent ? styles.stageCurrent : isComplete ? styles.stageDone : styles.stageFuture}`}>
            {STAGE_LABELS[stageKey]}
          </span>
        {path.city && (
          <span className={styles.stageCity}>{path.city}</span>
        )}
      </div>
      <MatchRow
        match={conditionalMatch}
        teamFlag={team.flag}
        teamId={team.id}
        isConditional={isFuture || isCurrent}
        onTeamPeek={onTeamPeek}
      />
    </div>
  )
}

/**
 * Full schedule section — all matches from group stage through the final,
 * with conditional future matches shown clearly as tentative.
 */
export default function ScheduledMatches({ team, onTeamPeek }: { team: Team; onTeamPeek?: (id: string) => void }) {
  return (
    <section
      className="wrap section"
      id="schedule"
      aria-labelledby="schedule-heading"
    >
      <SectionLabel text={`Full Schedule — ${team.name}`} />
      <h2 id="schedule-heading" className="sr-only">
        Full match schedule for {team.name}
      </h2>

      <div className={styles.schedule}>
        {STAGE_ORDER.map(stage => (
          <StageBlock key={stage} stageKey={stage} team={team} onTeamPeek={onTeamPeek} />
        ))}
      </div>

      <p className={styles.note} role="note">
        Future matches are conditional on advancing from each stage.
        Venues and dates reflect the most likely path based on current group standings.
      </p>
    </section>
  )
}
