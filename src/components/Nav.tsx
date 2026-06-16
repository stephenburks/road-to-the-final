import { useCallback } from 'react'
import type { View } from '../hooks/useAppState'
import styles from './Nav.module.css'

interface NavProps {
	view: View
	onViewChange: (v: View) => void
	isHistorical: boolean
}

const SECTION_LINKS = [
	{ id: 'hero',       label: 'Team' },
	{ id: 'road',       label: 'Bracket' },
	{ id: 'groups',     label: 'Groups' },
	{ id: 'opponents',  label: 'Opponents' },
	{ id: 'schedule',   label: 'Schedule' },
	{ id: 'squad',      label: 'Squad' },
]

function scrollToSection(id: string) {
	document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
}

/**
 * Sticky navigation bar — static links on all views.
 * Section links navigate to team view first when not already there.
 */
export default function Nav({ view, onViewChange, isHistorical }: NavProps) {
	const handleSectionClick = useCallback((sectionId: string) => {
		if (view !== 'team') {
			onViewChange('team')
			// Wait for React render + DOM paint before scrolling
			setTimeout(() => scrollToSection(sectionId), 60)
		} else {
			scrollToSection(sectionId)
		}
	}, [view, onViewChange])

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

				{SECTION_LINKS.map(({ id, label }) => (
					<button
						key={id}
						className={`${styles.link} ${view === 'team' ? styles.active : ''}`}
						onClick={() => handleSectionClick(id)}
					>
						{label}
					</button>
				))}

				<div className={styles.badge} aria-live="polite">
					<div
						className={styles.dot}
						style={{
							background: isHistorical ? 'var(--amber)' : 'var(--green)',
							boxShadow: isHistorical ? '0 0 6px var(--amber)' : '0 0 6px var(--green)',
						}}
						aria-hidden="true"
					/>
					<span style={{ color: isHistorical ? 'var(--amber)' : 'var(--green)' }}>
						{isHistorical ? 'Historical' : 'Live'}
					</span>
				</div>
			</div>
		</nav>
	)
}
