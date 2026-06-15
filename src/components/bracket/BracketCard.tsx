import type { Stage, Team } from '../../types'
import { STAGE_LABELS } from '../../constants'
import { formatDate } from '../../utils'
import type { CardStyle } from './bracketStyles'
import styles from './BracketCard.module.css'

interface BracketCardProps {
	path: Team['path'][keyof Team['path']] | null
	card: CardStyle
	isAct: boolean
	stage: Stage
}

export default function BracketCard({ path, card, isAct, stage }: BracketCardProps) {
	return (
		<div
			className={styles.card}
			style={{ background: card.bg, border: `1px solid ${card.border}` }}
		>
			<div className={styles.cardTitle} style={{ color: card.titleColor }}>
				{STAGE_LABELS[stage]}
			</div>
			<div className={styles.cardDate}>
				{path?.date?.match(/^\d{4}/) ? formatDate(path.date) : (path?.date ?? '—')}
			</div>
			<div className={styles.cardCity} style={{ color: isAct ? '#818cf8' : 'var(--text-dim)' }}>
				{path?.city ?? '—'}
			</div>
			<div className={styles.cardDetail} style={{ color: card.detColor }}>
				{path?.detail ?? path?.opponentDesc ?? '—'}
			</div>
			{path?.conditional && (
				<div
					className={styles.cardConditional + ' emoji'}
					title={path.conditionNote ?? 'Venue depends on finishing position'}
					aria-label={path.conditionNote ?? 'Conditional venue'}
				>
					⚠ Conditional
				</div>
			)}
		</div>
	)
}
