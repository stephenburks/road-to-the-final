import { formatDate } from '../utils'
import SectionLabel from './ui/SectionLabel'
import styles from './GroupStage.module.css'

/** Single group standings table */
function GroupTable({ groupKey, groupData, highlightTeamId }) {
  const probs = groupData.winProbabilities ?? {}

  return (
    <div className={styles.table}>
      <div className={styles.tableHead}>
        <span className={styles.groupLetter}>Group {groupKey}</span>
        <span className={styles.tableTitle}>Standings</span>
      </div>

      <table aria-label={`Group ${groupKey} standings`}>
        <thead>
          <tr>
            <th scope="col" aria-label="Position">#</th>
            <th scope="col">Team</th>
            <th scope="col" aria-label="Played">P</th>
            <th scope="col" aria-label="Won">W</th>
            <th scope="col" aria-label="Drawn">D</th>
            <th scope="col" aria-label="Lost">L</th>
            <th scope="col" aria-label="Goal difference">GD</th>
            <th scope="col" aria-label="Points">Pts</th>
            <th scope="col" aria-label="Win probability">Win %</th>
          </tr>
        </thead>
        <tbody>
          {(groupData.standings ?? []).map((row, i) => {
            const isSelected = row.teamId === highlightTeamId
            const wp = probs[row.teamId] ?? 0

            return (
              <tr
                key={i}
                style={{ background: isSelected ? 'rgba(99,102,241,0.07)' : undefined }}
                aria-current={isSelected ? 'true' : undefined}
              >
                <td style={{ color: 'var(--text-dim)', width: 22 }}>{row.pos}</td>
                <td>
                  <div className={styles.teamCell}>
                    <span aria-hidden="true" style={{ fontSize: 15 }}>{row.flag ?? '🏳️'}</span>
                    <span style={{ fontWeight: isSelected ? 700 : 500, color: isSelected ? '#c7d2fe' : '#d1d5db' }}>
                      {row.team}
                    </span>
                    {isSelected && (
                      <span className={styles.youTag} aria-label="Your selected team">YOU</span>
                    )}
                  </div>
                </td>
                {[row.played, row.w, row.d, row.l, row.gd >= 0 ? `+${row.gd}` : row.gd, row.pts].map((val, j) => (
                  <td
                    key={j}
                    style={{
                      textAlign: 'center',
                      color: j === 5 ? (isSelected ? '#c7d2fe' : '#e2e0ff') : 'var(--text-dim)',
                      fontWeight: j === 5 ? 700 : 400,
                    }}
                  >
                    {val}
                  </td>
                ))}
                <td>
                  <div className={styles.probCell}>
                    <div
                      className={styles.probBar}
                      style={{
                        width: `${Math.max(wp * 0.6, 3)}px`,
                        background: wp > 40 ? 'var(--purple)' : wp > 15 ? 'var(--amber)' : '#374151',
                      }}
                      role="progressbar"
                      aria-valuenow={wp}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${wp}% chance to win group`}
                    />
                    <span style={{ color: wp > 40 ? '#a5b4fc' : 'var(--text-dim)', minWidth: 28 }}>
                      {wp}%
                    </span>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

/** Single match result card */
function MatchCard({ match, teamFlag }) {
  const isWin  = match.result === 'W'
  const isDraw = match.result === 'D'

  const badgeStyle = match.result
    ? {
        W: { background: '#052e16', color: '#22c55e' },
        D: { background: '#1c1917', color: '#a8a29e' },
        L: { background: '#2d0a0a', color: '#ef4444' },
      }[match.result]
    : { background: 'rgba(255,255,255,0.06)', color: 'var(--text-dim)' }

  const resultLabel = match.result === 'W' ? 'Win' : match.result === 'D' ? 'Draw' : match.result === 'L' ? 'Loss' : 'To be played'

  return (
    <div
      className={styles.matchCard}
      style={{
        background: isWin ? 'rgba(34,197,94,0.06)' : isDraw ? 'rgba(99,102,241,0.04)' : 'rgba(255,255,255,0.03)',
        border: `1px solid ${isWin ? 'rgba(34,197,94,0.2)' : isDraw ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.07)'}`,
      }}
    >
      <div className={styles.matchMeta}>
        <span>MD{match.matchday} · {formatDate(match.date)}</span>
        <span
          className={styles.badge}
          style={badgeStyle}
          aria-label={resultLabel}
        >
          {match.result ?? 'TBD'}
        </span>
      </div>

      <div className={styles.matchTeams}>
        <span aria-hidden="true" style={{ fontSize: 18 }}>{teamFlag}</span>
        <span style={{ fontSize: 12, color: 'var(--text-lo)' }}>vs</span>
        <span aria-hidden="true" style={{ fontSize: 18 }}>{match.opponentFlag ?? '🏳️'}</span>
        <span style={{ fontSize: 12, color: '#d1d5db', fontWeight: 600 }}>{match.opponent}</span>
        {match.score && (
          <span
            className={styles.score}
            aria-label={`Score: ${match.score}`}
          >
            {match.score}
          </span>
        )}
      </div>

      {match.scorers?.length > 0 && (
        <ul className={styles.scorers} aria-label="Goal scorers">
          {match.scorers.map((s, j) => (
            <li key={j}>⚽ {s}</li>
          ))}
        </ul>
      )}

      {!match.result && (
        <div className={styles.venue}>{match.venue}</div>
      )}
    </div>
  )
}

/**
 * Full group stage section: standings for team's group + feeder group,
 * plus match result cards.
 */
export default function GroupStage({ team, data }) {
  const myGroup = data.groups?.[team.group]

  // Find the feeder group (the group whose winner the team could face in R16)
  const r16Opps = team.possibleOpponents?.r16 ?? []
  let feederGroup = null
  let feederKey   = null

  if (r16Opps.length && data.groups) {
    for (const [key, g] of Object.entries(data.groups)) {
      if (key === team.group) continue
      if (g.standings?.some(s => r16Opps.some(o => o.opponent === s.team))) {
        feederGroup = g
        feederKey   = key
        break
      }
    }
  }

  return (
    <section className="wrap section" id="groups" aria-labelledby="groups-heading">
      <SectionLabel text="Group Stage Tracker" />
      <h2 id="groups-heading" className="sr-only">Group stage standings and results</h2>

      {/* Standings */}
      <div className={styles.groupGrid}>
        {myGroup && (
          <GroupTable
            groupKey={team.group}
            groupData={myGroup}
            highlightTeamId={team.id}
          />
        )}
        {feederGroup && (
          <GroupTable
            groupKey={feederKey}
            groupData={feederGroup}
            highlightTeamId={null}
          />
        )}
      </div>

      {/* Match results */}
      <div className={styles.matchGrid}>
        {(team.groupResults ?? []).map((match, i) => (
          <MatchCard key={i} match={match} teamFlag={team.flag} />
        ))}
      </div>
    </section>
  )
}
