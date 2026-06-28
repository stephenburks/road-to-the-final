import { describe, it, expect } from 'vitest'
import { deriveLiveAppData } from './deriveLive'
import type { AppData, Team } from '../types'
import type { LiveMatchPatch } from '../hooks/useLiveScores'

function baseData(overrides: Partial<AppData> = {}): AppData {
	return {
		lastUpdated: '2026-06-27T00:00:00Z',
		snapshotDate: '2026-06-27',
		isHistorical: false,
		tournament: {
			name: 'FIFA World Cup 2026',
			currentStage: 'group_stage',
			stages: {
				group_stage: { status: 'active', label: 'Group Stage', date: '' },
				r32: { status: 'upcoming', label: 'R32', date: '' },
				r16: { status: 'future', label: 'R16', date: '' },
				qf:  { status: 'future', label: 'QF', date: '' },
				sf:  { status: 'future', label: 'SF', date: '' },
				final: { status: 'future', label: 'Final', date: '' },
			},
		},
		groups: {
			D: {
				winProbabilities: { usa: 60, paraguay: 30, australia: 5, turkey: 5 },
				standings: [
					{ pos: 1, teamId: 'usa',       team: 'USA',       flag: '🇺🇸', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
					{ pos: 2, teamId: 'paraguay',  team: 'Paraguay',  flag: '🇵🇾', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
					{ pos: 3, teamId: 'australia', team: 'Australia', flag: '🇦🇺', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
					{ pos: 4, teamId: 'turkey',    team: 'Türkiye',   flag: '🇹🇷', played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, gd: 0, pts: 0 },
				],
			},
		},
		teams: [
			team({ id: 'usa', group: 'D', currentStage: 'group_stage' }),
			team({ id: 'paraguay', group: 'D', currentStage: 'group_stage' }),
			team({ id: 'australia', group: 'D', currentStage: 'group_stage' }),
			team({ id: 'turkey', group: 'D', currentStage: 'group_stage' }),
		],
		dailyMatches: {
			'2026-06-12': [
				match('usa', 'paraguay', 0, 0, 'SCHEDULED', '2026-06-12'),
			],
		},
		...overrides,
	}
}

function team(overrides: Partial<Team>): Team {
	return {
		id: 'x', name: 'X', flag: '🏳️', group: 'D', confederation: 'CONCACAF', fifaRank: 50,
		eliminated: false, currentStage: 'group_stage',
		groupResults: [], advanceProbabilities: { r32: 50, r16: 25, qf: 10, sf: 5, final: 2, winner: 1, source: 'market' },
		path: {
			group_stage: { status: 'active' },
			r32: null, r16: null, qf: null, sf: null, final: null,
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

function match(homeId: string, awayId: string, homeScore: number, awayScore: number, status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED', date: string) {
	const home = team({ id: homeId, name: homeId })
	const away = team({ id: awayId, name: awayId })
	return {
		homeTeam: home.name, homeFlag: home.flag, homeId,
		awayTeam: away.name, awayFlag: away.flag, awayId,
		homeScore, awayScore, status, date,
	}
}

describe('deriveLiveAppData', () => {
	it('returns a derived AppData even with no patches (re-derives from baked dailyMatches)', () => {
		const data = baseData()
		const live = deriveLiveAppData(data, null)
		// Same shape, recomputed from the same input — should be equivalent but not
		// the same reference. Standings/teams content matches.
		expect(live.groups.D.standings.length).toBe(data.groups.D.standings.length)
		expect(live.teams.length).toBe(data.teams.length)
	})

	it('returns the same reference in historical mode', () => {
		const data = baseData({ isHistorical: true })
		const patches = new Map<string, LiveMatchPatch>([
			['usa:paraguay', livePatch('usa', 'paraguay', 3, 0, 'FINISHED')],
		])
		expect(deriveLiveAppData(data, patches)).toBe(data)
	})

	it('reorders group standings when a live patch flips a result', () => {
		// Pre-tournament: everyone at 0pts. Add a live FINISHED USA 3-0 Paraguay
		// and expect USA jumps to 1st with pts=3, Paraguay stays at 0 but gd=-3.
		const data = baseData()
		const patches = new Map<string, LiveMatchPatch>([
			['usa:paraguay', livePatch('usa', 'paraguay', 3, 0, 'FINISHED')],
		])
		const live = deriveLiveAppData(data, patches)
		const D = live.groups.D.standings
		const usa = D.find(r => r.teamId === 'usa')!
		const par = D.find(r => r.teamId === 'paraguay')!
		expect(usa.pts).toBe(3)
		expect(usa.w).toBe(1)
		expect(usa.gd).toBe(3)
		expect(par.pts).toBe(0)
		expect(par.l).toBe(1)
	})

	it('preserves winProbabilities unchanged when recomputing standings', () => {
		const data = baseData()
		const patches = new Map<string, LiveMatchPatch>([
			['usa:paraguay', livePatch('usa', 'paraguay', 1, 0, 'FINISHED')],
		])
		const live = deriveLiveAppData(data, patches)
		expect(live.groups.D.winProbabilities).toBe(data.groups.D.winProbabilities)
	})

	it('keeps team.currentStage at group_stage until the group is fully played', () => {
		const data = baseData()
		const patches = new Map<string, LiveMatchPatch>([
			['usa:paraguay', livePatch('usa', 'paraguay', 1, 0, 'FINISHED')],
		])
		const live = deriveLiveAppData(data, patches)
		expect(live.teams.find(t => t.id === 'usa')?.currentStage).toBe('group_stage')
	})

	it('marks a team eliminated when their R32 match is FINISHED and they lost (regression: South Africa 2026-06-28)', () => {
		const data = baseData()
		data.teams = [
			team({ id: 'usa', group: 'D', currentStage: 'r32', eliminated: false }),
			team({ id: 'paraguay', group: 'D', currentStage: 'r32', eliminated: false }),
			team({ id: 'australia', group: 'D', currentStage: 'group_stage', eliminated: true }),
			team({ id: 'turkey', group: 'D', currentStage: 'group_stage', eliminated: true }),
		]
		// All 6 group D matches must be in dailyMatches so computeStandings
		// produces played=3 (and pos=2 for paraguay) — otherwise determineCurrentStage
		// would short-circuit to 'group_stage'.
		data.dailyMatches = {
			'2026-06-12': [match('usa', 'paraguay', 4, 1, 'FINISHED', '2026-06-12')],
			'2026-06-13': [match('australia', 'turkey', 2, 1, 'FINISHED', '2026-06-13')],
			'2026-06-19': [
				match('usa', 'australia', 2, 0, 'FINISHED', '2026-06-19'),
				match('turkey', 'paraguay', 0, 1, 'FINISHED', '2026-06-19'),
			],
			'2026-06-25': [
				match('turkey', 'usa', 3, 2, 'FINISHED', '2026-06-25'),
				match('paraguay', 'australia', 1, 1, 'FINISHED', '2026-06-25'),
			],
			// Knockout: paraguay loses to germany in R32
			'2026-06-29': [match('paraguay', 'germany', 0, 2, 'FINISHED', '2026-06-29')],
		}

		const live = deriveLiveAppData(data, null)
		const par = live.teams.find(t => t.id === 'paraguay')
		expect(par?.eliminated).toBe(true)
		expect(par?.currentStage).toBe('r32')
		// USA finished 1st, no R32 match in fixture → currentStage stays 'r32',
		// eliminated stays false.
		const usa = live.teams.find(t => t.id === 'usa')
		expect(usa?.eliminated).toBe(false)
		expect(usa?.currentStage).toBe('r32')
	})

	it('honors Polymarket=0% as a hard elimination signal even with live patches', () => {
		const t = team({ id: 'turkey', group: 'D', advanceProbabilities: {
			r32: 0, r16: 0, qf: 0, sf: 0, final: 0, winner: 0, source: 'market',
		}})
		const data = baseData({ teams: [
			team({ id: 'usa', group: 'D' }),
			team({ id: 'paraguay', group: 'D' }),
			team({ id: 'australia', group: 'D' }),
			t,
		]})
		const live = deriveLiveAppData(data, new Map([['usa:paraguay', livePatch('usa', 'paraguay', 1, 1, 'IN_PROGRESS')]]))
		expect(live.teams.find(x => x.id === 'turkey')?.eliminated).toBe(true)
	})
})

function livePatch(homeId: string, awayId: string, homeScore: number, awayScore: number, status: 'SCHEDULED' | 'IN_PROGRESS' | 'FINISHED'): LiveMatchPatch {
	return {
		homeId, awayId, homeScore, awayScore, status,
		clock: status === 'IN_PROGRESS' ? '34\'' : '',
		homeScorers: [], awayScorers: [], homeCards: [], awayCards: [], broadcasts: [],
	}
}
