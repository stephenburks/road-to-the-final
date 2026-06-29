import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/react'
import TournamentBracket from './TournamentBracket'
import type { AppData, ActualBracket } from '../types'
import { renderWithQuery } from '../test-utils'

function emptyBracket(): ActualBracket {
	return { r32: [], r16: [], qf: [], sf: [], final: [] }
}

function baseData(ab?: ActualBracket): AppData {
	return {
		lastUpdated: '2026-06-28T00:00:00Z',
		snapshotDate: '2026-06-28',
		isHistorical: false,
		tournament: {
			name: 'WC2026',
			currentStage: 'r32',
			stages: {
				group_stage: { status: 'done', label: 'Group Stage', date: '' },
				r32: { status: 'active', label: 'R32', date: '' },
				r16: { status: 'upcoming', label: 'R16', date: '' },
				qf: { status: 'future', label: 'QF', date: '' },
				sf: { status: 'future', label: 'SF', date: '' },
				final: { status: 'future', label: 'Final', date: '' },
			},
		},
		groups: {},
		teams: [],
		dailyMatches: {},
		actualBracket: ab,
	}
}

describe('TournamentBracket', () => {
	it('renders an empty-state message when bracket has no data', () => {
		renderWithQuery(
			<TournamentBracket data={baseData(emptyBracket())} selectedTeamId="usa" />
		)
		expect(screen.getByText(/bracket will appear/i)).toBeInTheDocument()
	})

	it('renders 5 stage labels when bracket has any matches', () => {
		const ab = emptyBracket()
		ab.r32 = [{
			date: '2026-06-28', homeId: 'southafrica', awayId: 'canada',
			homeTeam: 'South Africa', awayTeam: 'Canada', homeFlag: '🇿🇦', awayFlag: '🇨🇦',
			homeScore: 0, awayScore: 1, status: 'FINISHED', winnerId: 'canada',
		}]
		renderWithQuery(<TournamentBracket data={baseData(ab)} selectedTeamId="usa" />)
		expect(screen.getByRole('heading', { name: /Tournament Bracket/i })).toBeInTheDocument()
		expect(screen.getByText(/Round of 32/i)).toBeInTheDocument()
		expect(screen.getByText(/Round of 16/i)).toBeInTheDocument()
		expect(screen.getByText(/Quarterfinals/i)).toBeInTheDocument()
		expect(screen.getByText(/Semifinals/i)).toBeInTheDocument()
		expect(screen.getByText('Final')).toBeInTheDocument()
	})

	it('renders a real R32 match with both team names', () => {
		const ab = emptyBracket()
		ab.r32 = [{
			date: '2026-06-28', homeId: 'southafrica', awayId: 'canada',
			homeTeam: 'South Africa', awayTeam: 'Canada', homeFlag: '🇿🇦', awayFlag: '🇨🇦',
			homeScore: 0, awayScore: 1, status: 'FINISHED', winnerId: 'canada',
		}]
		renderWithQuery(<TournamentBracket data={baseData(ab)} selectedTeamId="usa" />)
		// South Africa lost so only appears in R32; Canada also propagates into
		// the predicted R16 slot, so multiple matches are expected.
		expect(screen.getByText('South Africa')).toBeInTheDocument()
		expect(screen.getAllByText('Canada').length).toBeGreaterThan(0)
	})
})
