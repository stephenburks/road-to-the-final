import styles from './DiffPips.module.css'

interface DiffPipsProps {
	level: number
	color: string
	max?: number
}

export default function DiffPips({ level, color, max = 5 }: DiffPipsProps) {
	return (
		<div className={styles.pips} aria-label={`Difficulty ${level} out of ${max}`}>
			{Array.from({ length: max }).map((_, i) => (
				<div
					key={i}
					className={styles.pip}
					style={{ background: i < level ? color : 'rgba(255,255,255,0.1)' }}
				/>
			))}
		</div>
	)
}
