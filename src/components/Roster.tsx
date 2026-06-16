import { useState } from 'react'
import type { RosterPlayer } from '../../types'
import styles from './Roster.module.css'

function PlayerCard({ p }: { p: RosterPlayer }) {
	const [imgError, setImgError] = useState(false)

	return (
		<div className={styles.card} role="listitem">
			<span className={styles.jersey}>{p.jersey}</span>
			{p.headshot?.href && !imgError ? (
				<div className={styles.headshotWrap}>
					<img
						className={styles.headshot}
						src={p.headshot.href}
						alt={p.displayName}
						loading="lazy"
						onError={() => setImgError(true)}
					/>
				</div>
			) : (
				<div
					className={`${styles.headshotFallback} ${styles['fallback' + (p.position.abbreviation || '')] || ''}`}
					aria-hidden="true"
				/>
			)}
			<div className={styles.info}>
				<span className={styles.name}>{p.shortName || p.displayName}</span>
				<span className={styles.pos}>{p.position.abbreviation}</span>
			</div>
			{p.statistics.goals > 0 && (
				<span className={styles.goalBadge} aria-label={`${p.statistics.goals} goals`}>
					{p.statistics.goals}
				</span>
			)}
		</div>
	)
}

interface RosterProps {
	players: RosterPlayer[] | null
	loading: boolean
}

const POSITION_LABELS: Record<string, string> = {
	G: 'Goalkeepers', D: 'Defenders', M: 'Midfielders', F: 'Forwards',
}

export default function Roster({ players, loading }: RosterProps) {
	if (!players && !loading) return null

	const grouped: Record<string, RosterPlayer[]> = {}
	if (players) {
		for (const p of players) {
			const abb = p.position.abbreviation || '?'
			if (!grouped[abb]) grouped[abb] = []
			grouped[abb].push(p)
		}
	}

	return (
		<section className="wrap section" id="squad" aria-labelledby="roster-heading">
			<h2 id="roster-heading" className={styles.heading}>Squad</h2>

			{loading && !players && (
				<div className={styles.grid} role="status" aria-label="Loading roster">
					{Array.from({ length: 6 }).map((_, i) => (
						<div key={i} className={`${styles.card} ${styles.skeleton}`}>
							<div className={styles.skelJersey} />
							<div className={styles.skelHeadshot} />
							<div className={styles.skelName} />
						</div>
					))}
				</div>
			)}

			{players && Object.keys(POSITION_LABELS).map(abb => {
				const group = grouped[abb]
				if (!group?.length) return null
				return (
					<div key={abb}>
						<h3 className={styles.groupLabel}>
							{POSITION_LABELS[abb]} <span className={styles.groupCount}>{group.length}</span>
						</h3>
						<div className={styles.grid} role="list" aria-label={POSITION_LABELS[abb]}>
							{group.map(p => <PlayerCard key={p.id} p={p} />)}
						</div>
					</div>
				)
			})}
		</section>
	)
}
