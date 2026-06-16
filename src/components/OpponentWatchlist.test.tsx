import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OpponentWatchlist from './OpponentWatchlist'
import type { Team, AppData, Opponent } from '../types'

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
		groupResults: [],
		advanceProbabilities: {
			r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2,
			source: 'market',
		},
		path: {
			group_stage: { status: 'done' },
			r32: { status: 'active', date: '2026-07-01', city: 'Los Angeles', venue: 'SoFi Stadium' },
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
			G: {
				standings: [
					{ pos: 1, teamId: 'bra', team: 'Brazil', flag: '🇧🇷', played: 3, w: 2, d: 1, l: 0, gf: 5, ga: 2, gd: 3, pts: 7 },
				],
				winProbabilities: { bra: 45 },
			},
		},
		teams: [],
		...overrides,
	}
}

const FLAT_OPPONENTS: Opponent[] = [
	{ opponent: 'Brazil', flag: '🇧🇷', fifaRank: 3, difficulty: 4, color: 'var(--amber)', label: 'Tough', pct: 55 },
	{ opponent: 'Germany', flag: '🇩🇪', fifaRank: 5, difficulty: 3, color: 'var(--purple)', label: 'Moderate', pct: 30 },
	{ opponent: 'Spain', flag: '🇪🇸', fifaRank: 8, difficulty: 2, color: 'var(--green)', label: 'Favorable', pct: 15 },
]

describe('OpponentWatchlist', () => {
	// ── R32: flat list ─────────────────────────────────────────────────

	it('renders flat opponent grid for r32 with flat data', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: { r32: FLAT_OPPONENTS, r16: [] },
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		expect(screen.getByText('Brazil')).toBeInTheDocument()
		expect(screen.getByText('Germany')).toBeInTheDocument()
		expect(screen.getByText('Spain')).toBeInTheDocument()
	})

	it('shows venue banner when stage path exists for r32', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: { r32: FLAT_OPPONENTS, r16: [] },
			path: {
				...mockTeam().path,
				r32: { status: 'active', city: 'Los Angeles', venue: 'SoFi Stadium', match: 1, date: '2026-07-01' },
			},
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		expect(screen.getByText(/Los Angeles/)).toBeInTheDocument()
		expect(screen.getByText(/SoFi Stadium/)).toBeInTheDocument()
	})

	it('renders legend for r32 with difficulty key', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: { r32: FLAT_OPPONENTS, r16: [] },
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		// Legend labels appear alongside opponent card labels — use getAllByText
		expect(screen.getAllByText('Favorable').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Moderate').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Tough').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Danger').length).toBeGreaterThanOrEqual(1)
	})

	// ── R16: MatchupMatrix ─────────────────────────────────────────────

	it('renders MatchupMatrix for r16 with pct data', () => {
		const team = mockTeam({
			currentStage: 'r16',
			possibleOpponents: { r32: [], r16: FLAT_OPPONENTS },
		})
		render(<OpponentWatchlist team={team} activeStage="r16" data={mockData()} />)
		// MatchupMatrix renders progress bars
		const bars = document.querySelectorAll('[role="progressbar"]')
		expect(bars.length).toBeGreaterThan(0)
	})

	it('renders flat grid for r16 without pct data', () => {
		const noPctOpps: Opponent[] = [
			{ opponent: 'Brazil', flag: '🇧🇷' },
			{ opponent: 'Germany', flag: '🇩🇪' },
		]
		const team = mockTeam({
			currentStage: 'r16',
			possibleOpponents: { r32: [], r16: noPctOpps },
			path: {
				...mockTeam().path,
				r16: { status: 'upcoming', opponentDesc: 'Winner Match 94' },
			},
		})
		render(<OpponentWatchlist team={team} activeStage="r16" data={mockData({ groups: {} })} />)
		// Opponent names appear in opponent cards
		expect(screen.getByText('Brazil')).toBeInTheDocument()
		expect(screen.getByText('Germany')).toBeInTheDocument()
	})

	// ── group_stage: returns null ─────────────────────────────────────

	it('returns null for group_stage', () => {
		const team = mockTeam({ currentStage: 'group_stage' })
		const { container } = render(
			<OpponentWatchlist team={team} activeStage="group_stage" data={mockData()} />
		)
		expect(container.innerHTML).toBe('')
	})

	// ── Late stage: FutureStagePlaceholder ─────────────────────────────

	it('renders FutureStagePlaceholder for qf', () => {
		const team = mockTeam({ currentStage: 'qf' })
		render(<OpponentWatchlist team={team} activeStage="qf" data={mockData()} />)
		expect(screen.getByText(/Quarterfinal opponents update live/)).toBeInTheDocument()
	})

	it('renders FutureStagePlaceholder for sf', () => {
		const team = mockTeam({ currentStage: 'sf' })
		render(<OpponentWatchlist team={team} activeStage="sf" data={mockData()} />)
		expect(screen.getByText(/Semifinal opponents update live/)).toBeInTheDocument()
	})

	it('renders FutureStagePlaceholder for final', () => {
		const team = mockTeam({ currentStage: 'final' })
		render(<OpponentWatchlist team={team} activeStage="final" data={mockData()} />)
		expect(screen.getByText(/The Final opponents update live/)).toBeInTheDocument()
	})

	// ── Scenario path ──────────────────────────────────────────────────

	it('renders scenario blocks when oppData has scenarios', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: {
				r32: { scenarios: [{ condition: 'If group winner', probability: 60, opponents: [{ opponent: 'Norway' }] }] },
				r16: [],
			},
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		expect(screen.getByText('If group winner')).toBeInTheDocument()
		expect(screen.getByText('60% likely')).toBeInTheDocument()
	})

	// ── Feeder group ──────────────────────────────────────────────────

	it('shows feeder group panel when feeder is found', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: { r32: [], r16: [] },
			path: {
				...mockTeam().path,
				r32: { status: 'active', opponentDesc: 'Runner-up Group G', city: 'Los Angeles' },
			},
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		// FeederGroupPanel renders the explanation text with "based on current standings"
		expect(screen.getByText(/based on current standings/)).toBeInTheDocument()
	})

	// ── No feeder message ──────────────────────────────────────────────

	it('shows "no feeder" message when r32 has no feeder group', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: { r32: FLAT_OPPONENTS, r16: [] },
			path: {
				...mockTeam().path,
				r32: { status: 'active', opponentDesc: 'Winner Match 94' },
			},
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		expect(screen.getByText(/Opponent pool spans multiple groups/)).toBeInTheDocument()
	})

	// ── Section heading ────────────────────────────────────────────────

	it('shows "Opponent Watchlist" label for r32', () => {
		const team = mockTeam({
			currentStage: 'r32',
			possibleOpponents: { r32: FLAT_OPPONENTS, r16: [] },
		})
		render(<OpponentWatchlist team={team} activeStage="r32" data={mockData()} />)
		expect(screen.getByText(/Opponent Watchlist/)).toBeInTheDocument()
	})

	it('shows "Path Ahead" label for qf', () => {
		const team = mockTeam({ currentStage: 'qf' })
		render(<OpponentWatchlist team={team} activeStage="qf" data={mockData()} />)
		expect(screen.getByText(/Path Ahead/)).toBeInTheDocument()
	})
})
