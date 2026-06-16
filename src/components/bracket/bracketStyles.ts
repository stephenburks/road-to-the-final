import { STAGE_ORDER } from '../../constants'
import type { Team } from '../../types'

export const NODE_ICONS: Record<string, string> = {
	group_stage: 'GS',
	r32: '32',
	r16: '16',
	qf: 'QF',
	sf: 'SF',
	final: '★',
}

export interface NodeStyle {
	bg: string
	border: string
	color: string
	shadow: string
	icon: string
}

export function getNodeStyle(i: number, currentIdx: number, stage: string, team: Team, isAct: boolean): NodeStyle {
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

export interface CardStyle {
	bg: string
	border: string
	titleColor: string
	detColor: string
}

export function getCardStyle(i: number, currentIdx: number, stage: string, team: Team, isAct: boolean): CardStyle {
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

export function connectorGradient(currentIdx: number): string {
	const completePct = Math.min((currentIdx / (STAGE_ORDER.length - 1)) * 100, 100)
	return `linear-gradient(to right,
		var(--green) 0%,
		var(--green) ${completePct * 0.9}%,
		rgba(99,102,241,0.35) ${completePct * 0.9 + 4}%,
		rgba(255,255,255,0.04) 100%)`
}
