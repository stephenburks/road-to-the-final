import { formatUpdated } from '../utils'
import TeamSelector from './TeamSelector'
import DateSelector from './DateSelector'
import styles from './Header.module.css'

/**
 * Site header with logo, date picker, and team selector.
 */
export default function Header({
  data,
  selectedTeamId,
  onTeamChange,
  selectedDate,
  onDateChange,
  manifest,
}) {
  return (
    <div className="wrap">
      <header className={styles.header}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={styles.logoIcon} aria-hidden="true">⚽</div>
          <div>
            <div className={styles.logoName}>Road to the Final</div>
            <div className={styles.logoSub}>FIFA World Cup 2026</div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.updated} aria-label={`Data last updated ${formatUpdated(data?.lastUpdated)}`}>
            Updated {formatUpdated(data?.lastUpdated)}
          </div>

          <DateSelector
            manifest={manifest}
            selectedDate={selectedDate}
            onChange={onDateChange}
          />

          {data && (
            <TeamSelector
              teams={data.teams}
              selectedId={selectedTeamId}
              onChange={onTeamChange}
            />
          )}
        </div>
      </header>
    </div>
  )
}
