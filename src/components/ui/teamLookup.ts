// Re-exports the canonical team registry from scripts/lib/teams.js as the
// single source of truth. All team data lives in that file — never duplicate
// here.

import {
	TEAMS as TEAMS_JS,
	NAME_TO_ID as NAME_TO_ID_JS,
	ID_TO_ISO as ID_TO_ISO_JS,
	ID_TO_TLA as ID_TO_TLA_JS,
	ID_TO_FLAG as ID_TO_FLAG_JS,
	ID_TO_NAME as ID_TO_NAME_JS,
	TLA_TO_ID as TLA_TO_ID_JS,
	ESPN_SLUG_MAP as ESPN_SLUG_MAP_JS,
	ID_TO_PM_TLAS as ID_TO_PM_TLAS_JS,
} from '../../../scripts/lib/teams.js'

export interface CanonicalTeam {
	id: string
	name: string
	flag: string
	iso: string
	tla: string
	group: string
	confederation: string
	fifaRank: number
	espnSlug: string
	polymarketTlas: string[]
	aliases: string[]
}

export const TEAMS = TEAMS_JS as readonly CanonicalTeam[]
export const NAME_TO_ID = NAME_TO_ID_JS as Record<string, string>
export const ID_TO_ISO = ID_TO_ISO_JS as Record<string, string>
export const ID_TO_TLA = ID_TO_TLA_JS as Record<string, string>
export const ID_TO_FLAG = ID_TO_FLAG_JS as Record<string, string>
export const ID_TO_NAME = ID_TO_NAME_JS as Record<string, string>
export const TLA_TO_ID = TLA_TO_ID_JS as Record<string, string>
export const ESPN_SLUG_MAP = ESPN_SLUG_MAP_JS as Record<string, string>
export const ID_TO_PM_TLAS = ID_TO_PM_TLAS_JS as Record<string, string[]>

export function getTeamTLA(id?: string, name?: string): string {
	const resolvedId = id || (name ? NAME_TO_ID[name] : '') || ''
	return ID_TO_TLA[resolvedId] || ''
}

export function getTeamIdByTLA(tla?: string): string | undefined {
	if (!tla) return undefined
	return TLA_TO_ID[tla.toUpperCase()]
}
