import styles from './DiffPips.module.css'

interface DiffPipsProps {
	level: number
	max?: number
}

export default function DiffPips({ level, max = 5 }: DiffPipsProps) {
	return (
		<div className={styles.pips} data-diff={level} aria-label={`Difficulty ${level} out of ${max}`}>
			{Array.from({ length: max }).map((_, i) => (
				<div
					key={i}
					className={`${styles.pip} ${i < level ? styles.pipActive : styles.pipEmpty}`}
				/>
			))}
		</div>
	)
}
