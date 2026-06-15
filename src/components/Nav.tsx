import styles from './Nav.module.css'

/**
 * Sticky navigation bar with section links and live/historical badge.
 */
export default function Nav({ isHistorical }: { isHistorical: boolean }) {
  return (
    <nav className={styles.nav} aria-label="Site navigation">
      <div className={styles.inner}>
        <a href="#hero"      className={styles.link}>Today</a>
        <a href="#road"      className={styles.link}>Bracket</a>
        <a href="#groups"    className={styles.link}>Groups</a>
        <a href="#opponents" className={styles.link}>Opponents</a>
        <a href="#schedule"  className={styles.link}>Schedule</a>

        <div className={styles.badge} aria-live="polite">
          <div
            className={styles.dot}
            style={{
              background:  isHistorical ? 'var(--amber)' : 'var(--green)',
              boxShadow:   isHistorical
                ? '0 0 6px var(--amber)'
                : '0 0 6px var(--green)',
            }}
            aria-hidden="true"
          />
          <span
            style={{ color: isHistorical ? 'var(--amber)' : 'var(--green)' }}
          >
            {isHistorical ? 'Historical' : 'Live'}
          </span>
        </div>
      </div>
    </nav>
  )
}
