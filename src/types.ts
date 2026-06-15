export type Stage = 'group_stage' | 'r32' | 'r16' | 'qf' | 'sf' | 'final'

export type Result = 'W' | 'D' | 'L' | null

export type Difficulty = 1 | 2 | 3 | 4 | 5

export interface GroupMatch {
	matchday: number
	opponent: string
	opponentFlag: string
	result: Result
	score: string | null
	date: string
	venue: string
	scorers: string[]
}

export interface PathStage {
	status: 'active' | 'upcoming' | 'future' | 'done'
	match?: number
	date?: string
	city?: string
	venue?: string
	opponentDesc?: string
	conditional?: boolean
	conditionNote?: string
	detail?: string
}

export interface TeamPath {
	group_stage: PathStage
	r32: PathStage | null
	r16: PathStage | null
	qf: PathStage | null
	sf: PathStage | null
	final: PathStage | null
}

export interface Opponent {
	group?: string
	likelyTeam?: string
	opponent?: string
	flag?: string
	altTeam?: string
	altFlag?: string
	fifaRank?: number
	difficulty?: Difficulty
	label?: string
	color?: string
	note?: string
	pct?: number | null
	dPct?: number
	gPct?: number
}

export interface AdvanceProbabilities {
	r32: number
	r16: number
	qf: number
	sf: number
	final: number
	winner: number
	source: 'market' | 'calculated'
}

export interface StandingRow {
	pos: number
	teamId: string | null
	team: string
	flag: string
	played: number
	w: number
	d: number
	l: number
	gf: number
	ga: number
	gd: number
	pts: number
}

export interface GroupData {
	standings: StandingRow[]
	winProbabilities: Record<string, number>
}

export interface Team {
	id: string
	name: string
	flag: string
	group: string
	confederation: string
	fifaRank: number
	eliminated: boolean
	currentStage: Stage
	groupResults: GroupMatch[]
	advanceProbabilities: AdvanceProbabilities
	path: TeamPath
	possibleOpponents: {
		r32: Opponent[]
		r16: Opponent[]
	} | {
		r32: { scenarios: string[] }
		r16: { scenarios: string[] }
	}
}

export interface Scenario {
	condition: string
	probability: number
	venue?: string
	date?: string
	opponents: Opponent[]
}

export type PossibleOpponentData = Opponent[] | { scenarios: Scenario[] }

export interface TournamentStage {
	status: 'active' | 'upcoming' | 'future' | 'done'
	label: string
	date: string
}

export interface AppData {
	lastUpdated: string
	snapshotDate: string
	isHistorical: boolean
	tournament: {
		name: string
		currentStage: Stage
		stages: Record<Stage, TournamentStage>
	}
	groups: Record<string, GroupData>
	teams: Team[]
}

export interface SnapshotManifest {
	available: string[]
	labels: Record<string, string>
	earliest: string
	latest: string
	generated: string
}

export interface Confederation {
	name: string
	teams: Team[]
}