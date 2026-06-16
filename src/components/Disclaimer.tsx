import styles from './Disclaimer.module.css'

/**
 * Data disclaimer shown in the footer area.
 * Keeps expectations calibrated — this is a fan visualization, not a betting tool.
 */
export default function Disclaimer() {
  return (
    <aside
      className={styles.container}
      aria-label="Data disclaimer"
      role="note"
    >
      <div className="wrap">
        <div className={styles.inner}>
          <div className={`${styles.icon} emoji`} aria-hidden="true">ℹ️</div>
          <div className={styles.content}>
            <p className={styles.heading}>About the probabilities</p>
            <p className={styles.body}>
              Percentages are derived from{' '}
              <a
                href="https://polymarket.com"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                Polymarket
              </a>{' '}
              prediction markets and sports betting odds — they reflect crowd-sourced
              expectations, not guaranteed outcomes. This is a fan-made visualization
              for entertainment and discussion only.{' '}
              <strong>Not intended for wagering or any consequential decisions.</strong>{' '}
              Group standings and match results update every 30 minutes on match days via{' '}
              <a
                href="https://www.espn.com/soccer/scoreboard/_/league/fifa.world"
                target="_blank"
                rel="noopener noreferrer"
                className={styles.link}
              >
                ESPN
              </a>
              . Match schedule sourced from the official FIFA 2026 bracket.
            </p>
          </div>
        </div>
      </div>
    </aside>
  )
}
