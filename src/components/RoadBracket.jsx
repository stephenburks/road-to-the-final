import { STAGE_ORDER, STAGE_LABELS } from '../constants'
import { stageIndex, formatDate } from '../utils'
import SectionLabel from './ui/SectionLabel'
import styles from './RoadBracket.module.css'

const NODE_ICONS = {
	group_stage: 'GS',
	r32: '32',
	r16: '16',
	qf: 'QF',
	sf: 'SF',
	final: '★',
}

function getNodeStyle(i, currentIdx, stage, team) {
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
	return {
		bg: 'rgba(255,255,255,0.03)',
		border: 'rgba(255,255,255,0.1)',
		color: 'var(--text-dim)',
		shadow: 'none',
		icon: NODE_ICONS[stage],
	}
}

function getCardStyle(i, currentIdx, stage, team) {
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
	return {
		bg: 'rgba(255,255,255,0.02)',
		border: 'rgba(255,255,255,0.05)',
		titleColor: 'var(--text-lo)',
		detColor: 'var(--text-dim)',
	}
}

function BracketNode({ node, isAct }) {
	const fontSize = node.icon === '✕' || node.icon === '✓'
		? '13px'
		: node.color === '#052e16'
			? '13px'
			: '9px'

	return (
		<div
			className={styles.node}
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

function BracketCard({ path, card, isAct, stage }) {
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
					className={styles.cardConditional}
					title={path.conditionNote ?? 'Venue depends on finishing position'}
					aria-label={path.conditionNote ?? 'Conditional venue'}
				>
					⚠ Conditional
				</div>
			)}
		</div>
	)
}

export default function RoadBracket({ team, activeStage, onStageSelect }) {
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

				<div className={styles.grid} role="tablist" aria-label="Tournament stages">
					{STAGE_ORDER.map((stage, i) => {
						const isAct = stage === activeStage
						const path = team.path?.[stage]
						const node = getNodeStyle(i, currentIdx, stage, team)
						const card = getCardStyle(i, currentIdx, stage, team)

						return (
							<button
								key={stage}
								role="tab"
								aria-selected={isAct}
								aria-label={`${STAGE_LABELS[stage]}${path?.city ? ` in ${path.city}` : ''}${i < currentIdx ? ', completed' : stage === team.currentStage ? ', current' : ''}`}
								className={styles.stage}
								onClick={() => onStageSelect(stage)}
							>
								<BracketNode node={node} isAct={isAct} />
								<BracketCard path={path} card={card} isAct={isAct} stage={stage} />
							</button>
						)
					})}
				</div>
			</div>
		</section>
	)
}