import type { NodeStyle } from './bracketStyles'
import styles from './BracketNode.module.css'

interface BracketNodeProps {
	bg: string
	border: string
	color: string
	shadow: string
	icon: string
}

export default function BracketNode({ bg, border, color, shadow, icon }: BracketNodeProps) {
	const isLarge = icon === '\u2715' || icon === '\u2713' || color === '#052e16'

	return (
		<div
			className={`${styles.node} emoji ${isLarge ? styles.nodeLarge : ''}`}
			style={{ background: bg, border: `2px solid ${border}`, color, boxShadow: shadow }}
			aria-hidden="true"
		>
			{icon}
		</div>
	)
}
