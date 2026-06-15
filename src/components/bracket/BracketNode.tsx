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
	const fontSize = icon === '✕' || icon === '✓'
		? '13px'
		: color === '#052e16'
			? '13px'
			: '9px'

	return (
		<div
			className={`${styles.node} emoji`}
			style={{ background: bg, border: `2px solid ${border}`, color, boxShadow: shadow, fontSize }}
			aria-hidden="true"
		>
			{icon}
		</div>
	)
}
