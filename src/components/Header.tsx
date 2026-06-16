import type { AppData, SnapshotManifest } from '../types'
import { formatUpdated } from '../utils'
import TeamSelector from './TeamSelector'
import DateSelector from './DateSelector'
import styles from './Header.module.css'

interface HeaderProps {
  data: AppData
  selectedTeamId: string
  onTeamChange: (id: string) => void
  selectedDate: string
  onDateChange: (date: string) => void
  manifest: SnapshotManifest | null
}

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
}: HeaderProps) {
  return (
    <div className="wrap">
      <header className={styles.header}>
        {/* Logo */}
        <div className={styles.logo}>
          <div className={`${styles.logoIcon} emoji`} aria-hidden="true">⚽</div>
          <div>
            <div className={styles.logoName}>Road to the Final</div>
            <div className={styles.logoSub}>FIFA World Cup 2026</div>
          </div>
        </div>

        {/* Controls */}
        <div className={styles.controls}>
          <div className={styles.updated} aria-label={`Data last updated ${formatUpdated(data?.lastUpdated)} · every 30 minutes`}>
            Updated {formatUpdated(data?.lastUpdated)}
            <br /><span style={{ opacity: 0.7 }}>every 30 min</span>
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
