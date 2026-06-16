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
					className={`${styles.pip} ${i < level ? '' : styles.pipEmpty}`}
					style={i < level ? { background: color } : undefined}
				/>
			))}
		</div>
	)
}
