import { STAGE_ORDER, STAGE_LABELS } from '../constants'
import type { Stage, Team } from '../types'
import { stageIndex, formatDate } from '../utils'
import SectionLabel from './ui/SectionLabel'
import styles from './RoadBracket.module.css'

const NODE_ICONS: Record<string, string> = {
	group_stage: 'GS',
	r32: '32',
	r16: '16',
	qf: 'QF',
	sf: 'SF',
	final: '★',
}

interface NodeStyle {
	bg: string
	border: string
	color: string
	shadow: string
	icon: string
}

function getNodeStyle(i: number, currentIdx: number, stage: string, team: Team, isAct: boolean): NodeStyle {
	const isDone = i < currentIdx
	const isCur = stage === team.currentStage
	const isElim = team.eliminated && i === currentIdx

	if (isElim) {
		return {
			bg: 'rgba(239,68,68,0.15)',
			border: 'var(--red)',
			color: '#fca5a5',
			shadow: 'none',
			icon: '✕',
		}
	}
	if (isDone) {
		return {
			bg: 'rgba(34,197,94,0.12)',
			border: 'rgba(34,197,94,0.4)',
			color: '#86efac',
			shadow: 'none',
			icon: '✓',
		}
	}
	if (isCur) {
		return {
			bg: 'var(--green)',
			border: 'var(--green)',
			color: '#052e16',
			shadow: '0 0 14px rgba(34,197,94,0.5)',
			icon: NODE_ICONS[stage],
		}
	}
	if (isAct) {
		return {
			bg: 'var(--purple-lo)',
			border: 'var(--purple)',
			color: '#a5b4fc',
			shadow: '0 0 10px rgba(99,102,241,0.4)',
			icon: NODE_ICONS[stage],
		}
	}
	return {
		bg: 'rgba(255,255,255,0.03)',
		border: 'rgba(255,255,255,0.1)',
		color: 'var(--text-dim)',
		shadow: 'none',
		icon: NODE_ICONS[stage],
	}
}

interface CardStyle {
	bg: string
	border: string
	titleColor: string
	detColor: string
}

function getCardStyle(i: number, currentIdx: number, stage: string, team: Team, isAct: boolean): CardStyle {
	const isDone = i < currentIdx
	const isCur = stage === team.currentStage

	if (isCur) {
		return {
			bg: 'var(--green-lo)',
			border: 'var(--green-b)',
			titleColor: '#86efac',
			detColor: 'var(--green)',
		}
	}
	if (isDone) {
		return {
			bg: 'rgba(255,255,255,0.02)',
			border: 'rgba(255,255,255,0.05)',
			titleColor: '#86efac',
			detColor: '#86efac',
		}
	}
	if (isAct) {
		return {
			bg: 'var(--purple-lo)',
			border: 'var(--purple-b)',
			titleColor: '#c7d2fe',
			detColor: '#818cf8',
		}
	}
	return {
		bg: 'rgba(255,255,255,0.02)',
		border: 'rgba(255,255,255,0.05)',
		titleColor: 'var(--text-lo)',
		detColor: 'var(--text-dim)',
	}
}

function BracketNode({ node }: { node: NodeStyle & { isAct?: boolean } }) {
	const fontSize = node.icon === '✕' || node.icon === '✓'
		? '13px'
		: node.color === '#052e16'
			? '13px'
			: '9px'

	return (
		<div
			className={`${styles.node} emoji`}
			style={{
				background: node.bg,
				border: `2px solid ${node.border}`,
				color: node.color,
				boxShadow: node.shadow,
				fontSize,
			}}
			aria-hidden="true"
		>
			{node.icon}
		</div>
	)
}

function BracketCard({ path, card, isAct, stage }: {
	path: Team['path'][keyof Team['path']] | null
	card: CardStyle
	isAct: boolean
	stage: Stage
}) {
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

export default function RoadBracket({ team, activeStage, onStageSelect }: {
	team: Team
	activeStage: Stage
	onStageSelect: (stage: Stage) => void
}) {
	const currentIdx = stageIndex(team.currentStage ?? 'group_stage')
	const completePct = Math.min((currentIdx / 5) * 100, 100)

	const connectorGradient = `linear-gradient(to right,
		var(--green) 0%,
		var(--green) ${completePct * 0.9}%,
		rgba(99,102,241,0.35) ${completePct * 0.9 + 4}%,
		rgba(255,255,255,0.04) 100%)`

	return (
		<section className="wrap section" id="road" aria-labelledby="road-heading">
			<SectionLabel text="The Road to the Final" />
			<h2 id="road-heading" className="sr-only">Tournament bracket — {team.name}</h2>

			<div className={styles.outer}>
				<div
					className={styles.connector}
					style={{ background: connectorGradient }}
					aria-hidden="true"
				/>

				<div className={styles.grid} role="group" aria-label="Tournament stages">
					{STAGE_ORDER.map((stage, i) => {
						const isAct = stage === activeStage
						const path = team.path?.[stage]
						const node = getNodeStyle(i, currentIdx, stage, team, isAct)
						const card = getCardStyle(i, currentIdx, stage, team, isAct)

						return (
						<button
							key={stage}
							aria-pressed={isAct}
							aria-label={`${STAGE_LABELS[stage]}${path?.city ? ` in ${path.city}` : ''}${i < currentIdx ? ', completed' : stage === team.currentStage ? ', current' : ''}`}
								className={styles.stage}
								onClick={() => onStageSelect(stage)}
							>
								<BracketNode node={node} />
								<BracketCard path={path} card={card} isAct={isAct} stage={stage} />
							</button>
						)
					})}
				</div>
			</div>
		</section>
	)
}