import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import HomePage from './HomePage'
import type { AppData, DailyMatch, Team } from '../../types'

const todayStr = (): string => {
	const d = new Date()
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const makeTeam = (overrides: Partial<Team> = {}): Team => ({
	id: 'usa',
	name: 'USA',
	flag: '🇺🇸',
	group: 'D',
	confederation: 'CONCACAF',
	fifaRank: 14,
	eliminated: false,
	currentStage: 'group_stage',
	groupResults: [],
	advanceProbabilities: { r32: 80, r16: 50, qf: 30, sf: 15, final: 5, winner: 2, source: 'market' },
	path: { group_stage: { status: 'active' }, r32: null, r16: null, qf: null, sf: null, final: null },
	possibleOpponents: { r32: [], r16: [] },
	...overrides,
})

const createData = (dailyMatches: Record<string, DailyMatch[]> = {}): AppData => ({
	lastUpdated: new Date().toISOString(),
	snapshotDate: '2026-06-16',
	isHistorical: false,
	tournament: {
		name: 'FIFA World Cup 2026',
		currentStage: 'group_stage',
		stages: {
			group_stage: { status: 'active', label: 'Group Stage', date: 'Jun 11–27' },
			r32: { status: 'upcoming', label: 'R32', date: '' },
			r16: { status: 'future', label: 'R16', date: '' },
			qf: { status: 'future', label: 'QF', date: '' },
			sf: { status: 'future', label: 'SF', date: '' },
			final: { status: 'future', label: 'Final', date: '' },
		},
	},
	groups: {},
	teams: [
		makeTeam({ id: 'usa', name: 'USA', flag: '🇺🇸' }),
		makeTeam({ id: 'paraguay', name: 'Paraguay', flag: '🇵🇾' }),
	],
	dailyMatches,
})

const makeMatch = (overrides: Partial<DailyMatch> = {}): DailyMatch => ({
	homeTeam: 'USA',
	homeFlag: '🇺🇸',
	homeId: 'usa',
	awayTeam: 'Paraguay',
	awayFlag: '🇵🇾',
	awayId: 'paraguay',
	homeScore: 3,
	awayScore: 1,
	status: 'FINISHED',
	date: todayStr(),
	...overrides,
})

describe('HomePage', () => {
	it('renders the hero title and subtitle', () => {
		render(
			<HomePage
				data={createData()}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={vi.fn()}
			/>
		)
		expect(screen.getByText('Road to the Final')).toBeInTheDocument()
		expect(screen.getByText('FIFA World Cup 2026')).toBeInTheDocument()
	})

	it('renders View Your Team and View Standings buttons', () => {
		render(
			<HomePage
				data={createData()}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={vi.fn()}
			/>
		)
		expect(screen.getByText('View Your Team')).toBeInTheDocument()
		expect(screen.getByText('View Standings')).toBeInTheDocument()
	})

	it('calls onTeamChange when View Your Team is clicked', () => {
		const onTeamChange = vi.fn()
		render(
			<HomePage
				data={createData()}
				selectedTeamId="usa"
				onTeamChange={onTeamChange}
				onViewChange={vi.fn()}
			/>
		)
		screen.getByText('View Your Team').click()
		expect(onTeamChange).toHaveBeenCalledWith('usa')
	})

	it('calls onViewChange when View Standings is clicked', () => {
		const onViewChange = vi.fn()
		render(
			<HomePage
				data={createData()}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={onViewChange}
			/>
		)
		screen.getByText('View Standings').click()
		expect(onViewChange).toHaveBeenCalledWith('standings')
	})

	it('renders match cards for matches on today', () => {
		const today = todayStr()
		const data = createData({
			[today]: [makeMatch({ date: today })],
		})
		render(
			<HomePage
				data={data}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={vi.fn()}
			/>
		)
		expect(screen.getByText("Today's Matches")).toBeInTheDocument()
		expect(screen.getAllByText('USA').length).toBeGreaterThan(0)
		expect(screen.getByText('Paraguay')).toBeInTheDocument()
	})

	it('shows empty state when no matches for a day', () => {
		render(
			<HomePage
				data={createData()}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={vi.fn()}
			/>
		)
		expect(screen.getAllByText('No matches scheduled for this date.')).toHaveLength(3)
	})

	it('shows LIVE badge for in-progress matches', () => {
		const today = todayStr()
		const data = createData({
			[today]: [makeMatch({ date: today, status: 'IN_PROGRESS', homeScore: 1, awayScore: 0 })],
		})
		render(
			<HomePage
				data={data}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={vi.fn()}
			/>
		)
		expect(screen.getByText('LIVE')).toBeInTheDocument()
		expect(screen.getByLabelText('Score: 1-0')).toBeInTheDocument()
	})

	it('renders section headings for yesterday, today, tomorrow', () => {
		render(
			<HomePage
				data={createData()}
				selectedTeamId="usa"
				onTeamChange={vi.fn()}
				onViewChange={vi.fn()}
			/>
		)
		expect(screen.getByText("Yesterday's Matches")).toBeInTheDocument()
		expect(screen.getByText("Today's Matches")).toBeInTheDocument()
		expect(screen.getByText("Tomorrow's Matches")).toBeInTheDocument()
	})
})
