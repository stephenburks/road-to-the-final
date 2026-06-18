import type { NodeState } from './bracketStyles'
import styles from './BracketNode.module.css'

interface BracketNodeProps {
	state: NodeState
	icon: string
}

const LARGE_STATES: Set<NodeState> = new Set(['elim', 'done', 'current'])

export default function BracketNode({ state, icon }: BracketNodeProps) {
	const isLarge = LARGE_STATES.has(state)
	return (
		<div
			className={`${styles.node} ${isLarge ? styles.nodeLarge : ''}`}
			data-state={state}
			data-icon={icon}
			aria-hidden="true"
		/>
	)
}
