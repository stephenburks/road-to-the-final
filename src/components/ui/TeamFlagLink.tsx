import type { ReactNode } from 'react'
import styles from './TeamFlagLink.module.css'

interface TeamFlagLinkProps {
	teamId: string | undefined
	teamName: string
	onPeek: (id: string) => void
	disabled?: boolean
	children: ReactNode
}

/**
 * Wraps a flag + name (or just a flag) in an accessible button that navigates
 * to the team's page WITHOUT changing the user's preferred team.
 * Falls back to a static span when teamId is missing or disabled is true.
 */
export default function TeamFlagLink({ teamId, teamName, onPeek, disabled, children }: TeamFlagLinkProps) {
	if (!teamId || disabled) {
		return <span className={styles.static}>{children}</span>
	}
	return (
		<button
			type="button"
			className={styles.link}
			onClick={(e) => { e.stopPropagation(); onPeek(teamId) }}
			aria-label={`View ${teamName}`}
		>
			{children}
		</button>
	)
}
