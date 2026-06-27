// Re-exports the canonical tournament schedule + bracket from
// scripts/lib/tournament.js as the single source of truth.

import {
	GROUP_SCHEDULE as GROUP_SCHEDULE_JS,
	BRACKET_PATHS as BRACKET_PATHS_JS,
	MATCH_DATES as MATCH_DATES_JS,
	R32_MATCH_TO_POSITIONS as R32_MATCH_TO_POSITIONS_JS,
	STAGE_ORDER as STAGE_ORDER_JS,
	KNOCKOUT_STAGES as KNOCKOUT_STAGES_JS,
	GROUP_LETTERS as GROUP_LETTERS_JS,
} from '../../scripts/lib/tournament.js'

import { ESPN_SLUG_MAP } from '../components/ui/teamLookup'

export interface GroupFixture {
	md: number
	h: string
	a: string
	d: string
	v: string
}

export interface BracketStage {
	match: number
	date: string
	city: string
	venue: string
	opponentDesc: string
}

export interface BracketPath {
	r32: BracketStage
	r16: BracketStage
	qf: BracketStage
	sf: BracketStage
	final: BracketStage
}

export const GROUP_SCHEDULE = GROUP_SCHEDULE_JS as Record<string, GroupFixture[]>
export const BRACKET_PATHS = BRACKET_PATHS_JS as Record<string, BracketPath>
export const MATCH_DATES = MATCH_DATES_JS as Record<number, string>
export const R32_MATCH_TO_POSITIONS = R32_MATCH_TO_POSITIONS_JS as Record<number, string[]>
export const STAGE_ORDER = STAGE_ORDER_JS as readonly string[]
export const KNOCKOUT_STAGES = KNOCKOUT_STAGES_JS as readonly string[]
export const GROUP_LETTERS = GROUP_LETTERS_JS as readonly string[]

// Re-exported so consumers don't need a second import path.
export { ESPN_SLUG_MAP }
