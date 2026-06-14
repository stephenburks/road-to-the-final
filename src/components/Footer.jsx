import { AUTHOR_NAME, AUTHOR_GITHUB_URL } from '../constants'
import styles from './Footer.module.css'

/**
 * Site footer — data sources, update instructions, attribution.
 */
export default function Footer() {
  return (
    <footer className={styles.footer} role="contentinfo">
      <div className="wrap">
        <div className={styles.inner}>
          <div className={styles.left}>
            <span>Data: FIFA · Polymarket · football-data.org</span>
            <span className={styles.sep} aria-hidden="true">·</span>
            <span>
              Refresh:{' '}
              <code className={styles.code}>node scripts/update-data.js</code>
            </span>
            <span className={styles.sep} aria-hidden="true">·</span>
            <span>URL encodes team, date &amp; stage for sharing</span>
          </div>

          <div className={styles.attribution}>
            Created by{' '}
            <a
              href={AUTHOR_GITHUB_URL}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.link}
              aria-label={`${AUTHOR_NAME}'s GitHub profile`}
            >
              {AUTHOR_NAME}
              <span className={styles.externalIcon} aria-hidden="true"> ↗</span>
            </a>
          </div>
        </div>
      </div>
    </footer>
  )
}
