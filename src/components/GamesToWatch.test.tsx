import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import GamesToWatch from './GamesToWatch'
import type { Team, AppData } from '../types'
import { renderWithQuery } from '../test-utils'

function mockTeam(overrides: Partial<Team> = {}): Team {
	return {
		id: 'usa',
		name: 'USA',
		flag: '🇺🇸',
		group: 'D',
		confederation: 'CONCACAF',
		fifaRank: 14,
		eliminated: false,
		currentStage: 'group_stage',
		groupResults: [],
		advanceProbabilities: {
			r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2,
			source: 'market',
		},
		path: {
			group_stage: { status: 'active' },
			r32: { status: 'upcoming' },
			r16: { status: 'future' },
			qf: { status: 'future' },
			sf: { status: 'future' },
			final: { status: 'future' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

function todayStr(): string {
	return new Date().toISOString().slice(0, 10)
}

function tomorrowStr(): string {
	const d = new Date()
	d.setDate(d.getDate() + 1)
	return d.toISOString().slice(0, 10)
}

function mockData(dailyMatches: AppData['dailyMatches'] = {}): AppData {
	return {
		lastUpdated: '2026-06-16T12:00:00Z',
		snapshotDate: '',
		isHistorical: false,
		tournament: {
			name: 'World Cup 2026',
			currentStage: 'group_stage',
			stages: {} as AppData['tournament']['stages'],
		},
		groups: {
			D: {
				standings: [
					{ pos: 1, teamId: 'usa', team: 'USA', flag: '🇺🇸', played: 1, w: 1, d: 0, l: 0, gf: 4, ga: 1, gd: 3, pts: 3 },
					{ pos: 2, teamId: 'turkey', team: 'Türkiye', flag: '🇹🇷', played: 1, w: 0, d: 1, l: 0, gf: 1, ga: 1, gd: 0, pts: 1 },
					{ pos: 3, teamId: 'australia', team: 'Australia', flag: '🇦🇺', played: 1, w: 0, d: 1, l: 0, gf: 1, ga: 1, gd: 0, pts: 1 },
					{ pos: 4, teamId: 'paraguay', team: 'Paraguay', flag: '🇵🇾', played: 1, w: 0, d: 0, l: 1, gf: 1, ga: 4, gd: -3, pts: 0 },
				],
				winProbabilities: { usa: 45, turkey: 25, australia: 20, paraguay: 10 },
			},
		},
		teams: [
			{ id: 'usa', name: 'USA', flag: '🇺🇸', group: 'D', confederation: 'CONCACAF', fifaRank: 14, eliminated: false, currentStage: 'group_stage', groupResults: [], advanceProbabilities: { r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2, source: 'market' }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
			{ id: 'turkey', name: 'Türkiye', flag: '🇹🇷', group: 'D', confederation: 'UEFA', fifaRank: 25, eliminated: false, currentStage: 'group_stage', groupResults: [], advanceProbabilities: { r32: 85, r16: 60, qf: 30, sf: 15, final: 5, winner: 2, source: 'market' }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
			{ id: 'australia', name: 'Australia', flag: '🇦🇺', group: 'D', confederation: 'AFC', fifaRank: 26, eliminated: false, currentStage: 'group_stage', groupResults: [], advanceProbabilities: { r32: 80, r16: 55, qf: 25, sf: 10, final: 3, winner: 1, source: 'market' }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
			{ id: 'paraguay', name: 'Paraguay', flag: '🇵🇾', group: 'D', confederation: 'CONMEBOL', fifaRank: 39, eliminated: false, currentStage: 'group_stage', groupResults: [], advanceProbabilities: { r32: 75, r16: 45, qf: 20, sf: 8, final: 2, winner: 1, source: 'market' }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
		],
		dailyMatches,
	}
}

describe('GamesToWatch', () => {
	beforeEach(() => {
		vi.setSystemTime(new Date('2026-06-16T12:00:00Z'))
	})

	afterEach(() => {
		vi.useRealTimers()
	})

	it('returns null when no group matches for today/tomorrow', () => {
		const { container } = renderWithQuery(
			<GamesToWatch team={mockTeam()} data={mockData({})} />
		)
		expect(container.firstChild).toBeNull()
	})

	it('shows same-group match for today that does not involve selected team', () => {
		const today = todayStr()
		const dailyMatches: AppData['dailyMatches'] = {
			[today]: [
				{
					homeTeam: 'Australia', homeFlag: '🇦🇺', homeId: 'australia',
					awayTeam: 'Türkiye', awayFlag: '🇹🇷', awayId: 'turkey',
					homeScore: 0, awayScore: 0, status: 'SCHEDULED', date: today,
				},
			],
		}

		renderWithQuery(<GamesToWatch team={mockTeam()} data={mockData(dailyMatches)} />)

		expect(screen.getByText('Games to Watch')).toBeInTheDocument()
		expect(screen.getByText(/Australia/)).toBeInTheDocument()
		expect(screen.getByText(/Türkiye/)).toBeInTheDocument()
		expect(screen.getByText(/affects USA/)).toBeInTheDocument()
	})

	it('excludes match involving the selected team', () => {
		const today = todayStr()
		const dailyMatches: AppData['dailyMatches'] = {
			[today]: [
				{
					homeTeam: 'USA', homeFlag: '🇺🇸', homeId: 'usa',
					awayTeam: 'Australia', awayFlag: '🇦🇺', awayId: 'australia',
					homeScore: 0, awayScore: 0, status: 'SCHEDULED', date: today,
				},
			],
		}

		const { container } = renderWithQuery(
			<GamesToWatch team={mockTeam()} data={mockData(dailyMatches)} />
		)
		expect(container.firstChild).toBeNull()
	})

	it('shows match for tomorrow', () => {
		const tomorrow = tomorrowStr()
		const dailyMatches: AppData['dailyMatches'] = {
			[tomorrow]: [
				{
					homeTeam: 'Australia', homeFlag: '🇦🇺', homeId: 'australia',
					awayTeam: 'Paraguay', awayFlag: '🇵🇾', awayId: 'paraguay',
					homeScore: 0, awayScore: 0, status: 'SCHEDULED', date: tomorrow,
				},
			],
		}

		renderWithQuery(<GamesToWatch team={mockTeam()} data={mockData(dailyMatches)} />)

		expect(screen.getByText('Games to Watch')).toBeInTheDocument()
		expect(screen.getByText(/Paraguay/)).toBeInTheDocument()
	})

	it('ignores matches from other groups', () => {
		const today = todayStr()
		const dailyMatches: AppData['dailyMatches'] = {
			[today]: [
				{
					homeTeam: 'Brazil', homeFlag: '🇧🇷', homeId: 'brazil',
					awayTeam: 'Morocco', awayFlag: '🇲🇦', awayId: 'morocco',
					homeScore: 0, awayScore: 0, status: 'SCHEDULED', date: today,
				},
			],
		}

		const { container } = renderWithQuery(
			<GamesToWatch team={mockTeam()} data={mockData(dailyMatches)} />
		)
		expect(container.firstChild).toBeNull()
	})

	it('shows knockout feeder match when team has match-based opponentDesc', () => {
		const team = mockTeam({
			currentStage: 'r32',
			path: {
				...mockTeam().path,
				r32: { status: 'active', opponentDesc: 'Winner Match 81', date: '2026-07-01' },
			},
		})

		const dailyMatches: AppData['dailyMatches'] = {
			'2026-07-01': [
				{
					homeTeam: 'Germany', homeFlag: '🇩🇪', homeId: 'germany',
					awayTeam: 'Ecuador', awayFlag: '🇪🇨', awayId: 'ecuador',
					homeScore: 0, awayScore: 0, status: 'SCHEDULED', date: '2026-07-01',
				},
			],
		}

		const data = {
			...mockData(dailyMatches),
			teams: [
				...mockData(dailyMatches).teams,
				{ id: 'germany', name: 'Germany', flag: '🇩🇪', group: 'E', confederation: 'UEFA', fifaRank: 9, eliminated: false, currentStage: 'r32' as const, groupResults: [], advanceProbabilities: { r32: 95, r16: 80, qf: 50, sf: 25, final: 10, winner: 5, source: 'market' as const }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
				{ id: 'ecuador', name: 'Ecuador', flag: '🇪🇨', group: 'E', confederation: 'CONMEBOL', fifaRank: 23, eliminated: false, currentStage: 'r32' as const, groupResults: [], advanceProbabilities: { r32: 90, r16: 70, qf: 40, sf: 20, final: 8, winner: 3, source: 'market' as const }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
			],
		}

		renderWithQuery(<GamesToWatch team={team} data={data} />)

		expect(screen.getByText('Games to Watch')).toBeInTheDocument()
		expect(screen.getByText(/faces USA/)).toBeInTheDocument()
	})
})
