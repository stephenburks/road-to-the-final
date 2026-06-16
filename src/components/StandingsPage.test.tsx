import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import StandingsPage from './StandingsPage'
import type { AppData, Team, StandingRow } from '../../types'

const makeTeam = (id: string, name: string, flag: string, group: string): Team => ({
	id, name, flag, group, confederation: 'UEFA', fifaRank: 10,
	eliminated: false, currentStage: 'group_stage' as Stage,
	groupResults: [],
	advanceProbabilities: { r32: 80, r16: 50, qf: 30, sf: 15, final: 5, winner: 2, source: 'market' },
	path: {
		group_stage: { status: 'active', date: '2026-06-11', city: 'Test', venue: 'Test' },
		r32: null, r16: null, qf: null, sf: null, final: null,
	},
	possibleOpponents: { r32: [], r16: [] },
})

const createData = (): AppData => {
	const groups: Record<string, { standings: StandingRow[]; winProbabilities: Record<string, number> }> = {}
	const teams: Team[] = []

	'ABCDEFGHIJKL'.split('').forEach(g => {
		const groupTeams = [
			makeTeam(`${g.toLowerCase()}1`, `Team ${g}1`, '🇺🇸', g),
			makeTeam(`${g.toLowerCase()}2`, `Team ${g}2`, '🇧🇷', g),
			makeTeam(`${g.toLowerCase()}3`, `Team ${g}3`, '🇫🇷', g),
			makeTeam(`${g.toLowerCase()}4`, `Team ${g}4`, '🇩🇪', g),
		]
		teams.push(...groupTeams)

		groups[g] = {
			standings: groupTeams.map((t, i) => ({
				pos: i + 1,
				teamId: t.id,
				team: t.name,
				flag: t.flag,
				played: 0,
				w: 0, d: 0, l: 0,
				gf: 0, ga: 0, gd: 0,
				pts: 0,
			})),
			winProbabilities: Object.fromEntries(groupTeams.map(t => [t.id, 25])),
		}
	})

	return {
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
		groups,
		teams,
	}
}

describe('StandingsPage', () => {
	it('renders the page title', () => {
		render(<StandingsPage data={createData()} selectedTeamId="usa" />)
		expect(screen.getByText('Group Standings')).toBeInTheDocument()
	})

	it('renders data source subtitle', () => {
		render(<StandingsPage data={createData()} selectedTeamId="usa" />)
		expect(screen.getByText('FIFA World Cup 2026')).toBeInTheDocument()
	})

	it('renders all 12 group tables', () => {
		render(<StandingsPage data={createData()} selectedTeamId="usa" />)
		for (const letter of 'ABCDEFGHIJKL') {
			expect(screen.getByText(`Group ${letter}`)).toBeInTheDocument()
		}
	})

	it('renders team names in tables', () => {
		render(<StandingsPage data={createData()} selectedTeamId="usa" />)
		expect(screen.getByText('Team A1')).toBeInTheDocument()
		expect(screen.getByText('Team L4')).toBeInTheDocument()
	})
})
