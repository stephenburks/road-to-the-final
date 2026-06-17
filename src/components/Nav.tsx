import { useCallback, useEffect, useState } from 'react'
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
	const [activeSection, setActiveSection] = useState<string | null>(null)

	useEffect(() => {
		if (view !== 'team') return
		const sections = SECTION_LINKS.map(({ id }) => document.getElementById(id)).filter(Boolean) as HTMLElement[]
		const observer = new IntersectionObserver(
			entries => {
				// Pick the visible entry closest to the top of the viewport
				const visible = entries
					.filter(e => e.isIntersecting)
					.sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
				if (visible.length > 0) setActiveSection(visible[0].target.id)
			},
			{ rootMargin: '-10% 0px -60% 0px', threshold: 0 }
		)
		sections.forEach(el => observer.observe(el))
		return () => {
			observer.disconnect()
			setActiveSection(null)
		}
	}, [view])

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
						className={`${styles.link} ${view === 'team' ? styles.active : ''} ${activeSection === id ? styles.currentSection : ''}`}
						onClick={() => handleSectionClick(id)}
						aria-current={activeSection === id ? 'location' : undefined}
					>
						{label}
					</button>
				))}

				<div className={`${styles.badge} ${isHistorical ? styles.badgeHistorical : styles.badgeLive}`} aria-live="polite">
					<div className={styles.dot} aria-hidden="true" />
					<span>{isHistorical ? 'Historical' : 'Live'}</span>
				</div>
			</div>
		</nav>
	)
}
