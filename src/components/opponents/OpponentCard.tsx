import type { Opponent } from '../../types'
import FlagIcon from '../ui/FlagIcon'
import { NAME_TO_ID } from '../ui/teamLookup'
import DiffPips from './DiffPips'
import styles from './OpponentCard.module.css'

interface OpponentCardProps {
	opp: Opponent
	compact?: boolean
	onTeamPeek?: (id: string) => void
}

export default function OpponentCard({ opp, compact = false, onTeamPeek }: OpponentCardProps) {
	const borderClass = (opp.difficulty ?? 0) >= 5
		? styles.borderDanger
		: (opp.difficulty ?? 0) >= 4
			? styles.borderTough
			: styles.borderDefault

	const teamName = opp.likelyTeam ?? opp.opponent ?? 'TBD'
	const teamId = NAME_TO_ID[teamName]
	const isClickable = !!(onTeamPeek && teamId)

	const handleClick = isClickable ? () => onTeamPeek!(teamId) : undefined
	const handleKey = isClickable
		? (e: React.KeyboardEvent) => {
			if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onTeamPeek!(teamId) }
		}
		: undefined

	return (
		<article
			className={`${styles.card} ${compact ? styles.cardCompact : ''} ${borderClass} ${isClickable ? styles.cardClickable : ''}`}
			data-diff={opp.difficulty ?? 3}
			aria-label={`${teamName}${opp.label ? `, ${opp.label}` : ''}${opp.pct != null ? `, ${opp.pct}% probability` : ''}${isClickable ? ' — click to view team' : ''}`}
			role={isClickable ? 'button' : undefined}
			tabIndex={isClickable ? 0 : undefined}
			onClick={handleClick}
			onKeyDown={handleKey}
		>
			{opp.difficulty != null && (
				<div className={styles.topBar} aria-hidden="true" />
			)}
			<div className={styles.cardHeader}>
				<FlagIcon flag={opp.flag} />
				{opp.group && <span className={styles.groupTag}>Grp {opp.group}</span>}
			</div>
			<div className={styles.teamName}>{teamName}</div>
			{opp.fifaRank && <div className={styles.rank}>FIFA #{opp.fifaRank}</div>}
			{opp.difficulty != null && (
				<div className={styles.diffRow}>
					<span className={styles.diffLabel}>{opp.label ?? ''}</span>
					<DiffPips level={opp.difficulty} />
				</div>
			)}
			{opp.pct != null && (
				<div className={styles.prob} aria-label={`${opp.pct}% probability of this matchup`}>
					{opp.pct}% chance
				</div>
			)}
			{opp.note && <p className={styles.note}>{opp.note}</p>}
			{opp.altTeam && (
				<div className={styles.alt}>
					<span>or</span>
					<FlagIcon flag={opp.altFlag} />
					<span>{opp.altTeam}</span>
				</div>
			)}
		</article>
	)
}
