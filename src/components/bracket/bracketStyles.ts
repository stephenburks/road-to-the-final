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

export type NodeState = 'elim' | 'done' | 'current' | 'active' | 'default'
export type CardState = 'current' | 'done' | 'active' | 'default'

export interface NodeStyle {
	state: NodeState
	icon: string
}

export function getNodeStyle(i: number, currentIdx: number, stage: string, team: Team, isAct: boolean): NodeStyle {
	const isDone = i < currentIdx
	const isCur = stage === team.currentStage
	const isElim = team.eliminated && i === currentIdx

	if (isElim)   return { state: 'elim',    icon: '✕' }
	if (isDone)   return { state: 'done',    icon: '✓' }
	if (isCur)    return { state: 'current', icon: NODE_ICONS[stage] }
	if (isAct)    return { state: 'active',  icon: NODE_ICONS[stage] }
	return         { state: 'default', icon: NODE_ICONS[stage] }
}

export interface CardStyle {
	state: CardState
}

export function getCardStyle(i: number, currentIdx: number, stage: string, team: Team, isAct: boolean): CardStyle {
	const isDone = i < currentIdx
	const isCur = stage === team.currentStage

	if (isCur)  return { state: 'current' }
	if (isDone) return { state: 'done' }
	if (isAct)  return { state: 'active' }
	return        { state: 'default' }
}

export function connectorGradient(currentIdx: number): string {
	const completePct = Math.min((currentIdx / (STAGE_ORDER.length - 1)) * 100, 100)
	return `linear-gradient(to right,
		var(--green) 0%,
		var(--green) ${completePct * 0.9}%,
		rgba(99,102,241,0.35) ${completePct * 0.9 + 4}%,
		rgba(255,255,255,0.04) 100%)`
}
