import type { ChangeDelta } from '../../hooks/useChangeIndicator'
import styles from './ChangeArrow.module.css'

/**
 * Small breathing arrow shown briefly when a probability value changes.
 * Green ▲ for upward, blue ▼ for downward. Renders nothing when delta is null.
 */
export default function ChangeArrow({ delta }: { delta: ChangeDelta }) {
	if (!delta) return null
	return (
		<span
			className={`${styles.arrow} ${delta === 'up' ? styles.up : styles.down}`}
			aria-hidden="true"
		>
			{delta === 'up' ? '▲' : '▼'}
		</span>
	)
}
