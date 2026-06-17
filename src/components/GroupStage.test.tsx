import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithQuery } from '../test-utils'
import GroupStage from './GroupStage'
import type { Team, AppData } from '../types'

function mockTeam(overrides: Partial<Team> = {}): Team {
	return {
		id: 'usa',
		name: 'USA',
		flag: '🇺🇸',
		group: 'A',
		confederation: 'CONCACAF',
		fifaRank: 14,
		eliminated: false,
		currentStage: 'r32',
		groupResults: [
			{
				matchday: 1,
				opponent: 'Germany',
				opponentFlag: '🇩🇪',
				result: 'W',
				score: '2-1',
				date: '2026-06-12',
				venue: 'SoFi Stadium, Los Angeles',
				scorers: ["Pulisic 34'", "McKennie 67'"],
				cards: [{ player: 'Adams', minute: "45'", type: 'yellow' }],
			},
			{
				matchday: 2,
				opponent: 'Brazil',
				opponentFlag: '🇧🇷',
				result: 'D',
				score: '1-1',
				date: '2026-06-17',
				venue: 'SoFi Stadium, Los Angeles',
				scorers: ["Pulisic 78'"],
				cards: [],
			},
			{
				matchday: 3,
				opponent: 'Japan',
				opponentFlag: '🇯🇵',
				result: 'L',
				score: '0-1',
				date: '2026-06-22',
				venue: 'MetLife, New York',
				scorers: [],
				cards: [{ player: 'McKennie', minute: "72'", type: 'red' }],
			},
			{
				matchday: 4,
				opponent: 'Spain',
				opponentFlag: '🇪🇸',
				result: null,
				score: null,
				date: '2026-06-27',
				venue: 'AT&T Stadium, Dallas',
				scorers: [],
				cards: [],
			},
		],
		advanceProbabilities: {
			r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2,
			source: 'market',
		},
		path: {
			group_stage: { status: 'done' },
			r32: { status: 'active' },
			r16: { status: 'upcoming', opponentDesc: 'Winner Group G' },
			qf: { status: 'future' },
			sf: { status: 'future' },
			final: { status: 'future' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

function mockData(overrides: Partial<AppData> = {}): AppData {
	return {
		lastUpdated: '2026-06-15T12:00:00Z',
		snapshotDate: '',
		isHistorical: false,
		tournament: {
			name: 'World Cup 2026',
			currentStage: 'r32',
			stages: {} as AppData['tournament']['stages'],
		},
		groups: {
			A: {
				standings: [
					{ pos: 1, teamId: 'usa', team: 'USA', flag: '🇺🇸', played: 3, w: 2, d: 1, l: 0, gf: 5, ga: 2, gd: 3, pts: 7 },
					{ pos: 2, teamId: 'ger', team: 'Germany', flag: '🇩🇪', played: 3, w: 1, d: 2, l: 0, gf: 4, ga: 3, gd: 1, pts: 5 },
				],
				winProbabilities: { usa: 45, ger: 30 },
			},
			G: {
				standings: [
					{ pos: 1, teamId: 'bra', team: 'Brazil', flag: '🇧🇷', played: 3, w: 2, d: 1, l: 0, gf: 5, ga: 2, gd: 3, pts: 7 },
				],
				winProbabilities: { bra: 55 },
			},
		},
		teams: [
			{ id: 'usa', name: 'USA', flag: '🇺🇸', group: 'A', confederation: 'CONCACAF', fifaRank: 14, eliminated: false, currentStage: 'r32', groupResults: [], advanceProbabilities: { r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2, source: 'market' }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
			{ id: 'ger', name: 'Germany', flag: '🇩🇪', group: 'A', confederation: 'UEFA', fifaRank: 5, eliminated: false, currentStage: 'r32', groupResults: [], advanceProbabilities: { r32: 100, r16: 80, qf: 50, sf: 25, final: 10, winner: 3, source: 'market' }, path: {} as Team['path'], possibleOpponents: { r32: [], r16: [] } },
		],
		...overrides,
	}
}

describe('GroupStage', () => {
	beforeEach(() => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ events: [] }),
		} as Response)
	})

	afterEach(() => {
		vi.restoreAllMocks()
	})

	// ── Group table rendering ──────────────────────────────────────────

	it('renders group table with standings', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByText('Group A')).toBeInTheDocument()
		expect(screen.getAllByText('Standings').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('USA').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Germany').length).toBeGreaterThanOrEqual(1)
	})

	it('highlights the selected team in group table', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(document.querySelector('[aria-current="true"]')).toBeTruthy()
		expect(screen.getByText('YOU')).toBeInTheDocument()
	})

	// ── Match cards ────────────────────────────────────────────────────

	it('renders match cards for all groupResults', () => {
		const team = mockTeam()
		renderWithQuery(<GroupStage team={team} data={mockData()} />)
		expect(screen.getByText(/MD1/)).toBeInTheDocument()
		expect(screen.getByText(/MD2/)).toBeInTheDocument()
		expect(screen.getByText(/MD3/)).toBeInTheDocument()
		expect(screen.getByText(/MD4/)).toBeInTheDocument()
	})

	it('shows W badge for won matches', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByLabelText('Win')).toBeInTheDocument()
	})

	it('shows D badge for drawn matches', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByLabelText('Draw')).toBeInTheDocument()
	})

	it('shows L badge for lost matches', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByLabelText('Loss')).toBeInTheDocument()
	})

	it('shows TBD badge for upcoming matches', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByLabelText('To be played')).toBeInTheDocument()
	})

	it('renders scores for completed matches', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByLabelText('Score: 2-1')).toBeInTheDocument()
		expect(screen.getByLabelText('Score: 1-1')).toBeInTheDocument()
	})

	// ── Scorer details ─────────────────────────────────────────────────

	it('renders goal scorers for team', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByText("Pulisic 34'")).toBeInTheDocument()
		expect(screen.getByText("McKennie 67'")).toBeInTheDocument()
	})

	// ── Card details ───────────────────────────────────────────────────

	it('renders yellow card with screen reader text', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByText(/Adams 45'/)).toBeInTheDocument()
		expect(document.querySelector('[class*="cardYellow"]')).toBeTruthy()
	})

	it('renders red card with screen reader text', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByText(/McKennie 72'/)).toBeInTheDocument()
		expect(document.querySelector('[class*="cardRed"]')).toBeTruthy()
	})

	// ── Venue for upcoming matches ────────────────────────────────────

	it('shows venue for upcoming matches without result', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByText('AT&T Stadium, Dallas')).toBeInTheDocument()
	})

	// ── Feeder group panel ─────────────────────────────────────────────

	it('renders feeder group panel when r16 feeder is found', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r16: { status: 'upcoming', opponentDesc: 'Winner Group G' },
			},
		})
		renderWithQuery(<GroupStage team={team} data={mockData()} />)
		expect(screen.getByText(/if USA wins Group A, the winner of Group G/)).toBeInTheDocument()
	})

	// ── No feeder message ──────────────────────────────────────────────

	it('shows no-feeder message when r16 feeder is not found', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r16: { status: 'upcoming', opponentDesc: 'Winner Match 94' },
			},
		})
		renderWithQuery(<GroupStage team={team} data={mockData()} />)
		expect(screen.getByText(/depends on results from multiple R32 matches/)).toBeInTheDocument()
	})

	// ── Disclaimer ─────────────────────────────────────────────────────

	it('renders disclaimer note with team name', () => {
		renderWithQuery(<GroupStage team={mockTeam()} data={mockData()} />)
		expect(screen.getByText(/Bracket path, opponent scenarios, and venues assume USA finishes 1st/)).toBeInTheDocument()
	})

	// ── Missing group data ─────────────────────────────────────────────

	it('handles missing group data gracefully', () => {
		const data = mockData({ groups: {} })
		renderWithQuery(<GroupStage team={mockTeam()} data={data} />)
		expect(screen.queryByText('Group A')).toBeFalsy()
	})
})
