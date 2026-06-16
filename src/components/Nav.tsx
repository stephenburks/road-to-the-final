import type { View } from '../hooks/useAppState'
import styles from './Nav.module.css'

interface NavProps {
	view: View
	onViewChange: (v: View) => void
	isHistorical: boolean
}

/**
 * Sticky navigation bar — always shows view toggles, appends section anchors on team view.
 */
export default function Nav({ view, onViewChange, isHistorical }: NavProps) {
	return (
		<nav className={styles.nav} aria-label="Site navigation">
			<div className={styles.inner}>
				<button
					className={`${styles.link} ${view === 'home' ? styles.active : ''}`}
					onClick={() => onViewChange('home')}
					aria-current={view === 'home' ? 'page' : undefined}
				>
					Today
				</button>
				<button
					className={`${styles.link} ${view === 'standings' ? styles.active : ''}`}
					onClick={() => onViewChange('standings')}
					aria-current={view === 'standings' ? 'page' : undefined}
				>
					Standings
				</button>

				{view === 'team' && (
					<>
						<a className={styles.link} href="#hero">Team</a>
						<a className={styles.link} href="#road">Bracket</a>
						<a className={styles.link} href="#groups">Groups</a>
						<a className={styles.link} href="#opponents">Opponents</a>
						<a className={styles.link} href="#squad">Squad</a>
						<a className={styles.link} href="#schedule">Schedule</a>
					</>
				)}

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
