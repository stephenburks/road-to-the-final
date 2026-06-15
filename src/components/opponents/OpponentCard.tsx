import type { Opponent } from '../../types'
import FlagIcon from '../ui/FlagIcon'
import DiffPips from './DiffPips'
import styles from './OpponentCard.module.css'

interface OpponentCardProps {
	opp: Opponent
	compact?: boolean
}

export default function OpponentCard({ opp, compact = false }: OpponentCardProps) {
	const borderClass = (opp.difficulty ?? 0) >= 5
		? styles.borderDanger
		: (opp.difficulty ?? 0) >= 4
			? styles.borderTough
			: styles.borderDefault

	const teamName = opp.likelyTeam ?? opp.opponent ?? 'TBD'

	return (
		<article
			className={`${styles.card} ${compact ? styles.cardCompact : ''} ${borderClass}`}
			aria-label={`${teamName}${opp.label ? `, ${opp.label}` : ''}${opp.pct != null ? `, ${opp.pct}% probability` : ''}`}
		>
			{opp.color && (
				<div className={styles.topBar} style={{ background: opp.color }} aria-hidden="true" />
			)}
			<div className={styles.cardHeader}>
				<FlagIcon flag={opp.flag} />
				{opp.group && <span className={styles.groupTag}>Grp {opp.group}</span>}
			</div>
			<div className={styles.teamName}>{teamName}</div>
			{opp.fifaRank && <div className={styles.rank}>FIFA #{opp.fifaRank}</div>}
			{opp.difficulty != null && (
				<div className={styles.diffRow}>
					<span className={styles.diffLabel} style={{ color: opp.color ?? 'var(--amber)' }}>{opp.label ?? ''}</span>
					<DiffPips level={opp.difficulty} color={opp.color ?? 'var(--amber)'} />
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
