import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import EliminatedView from './EliminatedView'
import type { Team } from '../../types'

function makeTeam(overrides: Partial<Team> = {}): Team {
	return {
		id: 'usa',
		name: 'USA',
		flag: '🇺🇸',
		group: 'A',
		confederation: 'CONCACAF',
		fifaRank: 14,
		eliminated: true,
		currentStage: 'r16',
		groupResults: [],
		advanceProbabilities: {
			r32: 100, r16: 0, qf: 0, sf: 0, final: 0, winner: 0,
			source: 'market',
		},
		path: {
			group_stage: { status: 'done' },
			r32: { status: 'done' },
			r16: { status: 'done' },
			qf: { status: 'future' },
			sf: { status: 'future' },
			final: { status: 'future' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

describe('EliminatedView', () => {
	// ── Team name ─────────────────────────────────────────────────────────

	it('renders the team name', () => {
		render(<EliminatedView team={makeTeam({ name: 'USA' })} />)
		expect(screen.getByText(/USA/)).toBeInTheDocument()
	})

	it('renders the correct name for a different team', () => {
		render(<EliminatedView team={makeTeam({ id: 'brazil', name: 'Brazil', flag: '🇧🇷' })} />)
		expect(screen.getByText(/Brazil/)).toBeInTheDocument()
	})

	// ── Stage label ───────────────────────────────────────────────────────

	it('shows the human-readable stage label for the currentStage', () => {
		render(<EliminatedView team={makeTeam({ currentStage: 'r16' })} />)
		// STAGE_LABELS['r16'] === 'Round of 16'
		expect(screen.getByText(/Round of 16/)).toBeInTheDocument()
	})

	it('shows Group Stage label when eliminated in group_stage', () => {
		render(<EliminatedView team={makeTeam({ currentStage: 'group_stage' })} />)
		expect(screen.getByText(/Group Stage/)).toBeInTheDocument()
	})

	it('shows Quarterfinal label when eliminated in qf', () => {
		render(<EliminatedView team={makeTeam({ currentStage: 'qf' })} />)
		expect(screen.getByText(/Quarterfinal/)).toBeInTheDocument()
	})

	it('shows Semifinal label when eliminated in sf', () => {
		render(<EliminatedView team={makeTeam({ currentStage: 'sf' })} />)
		expect(screen.getByText(/Semifinal/)).toBeInTheDocument()
	})

	it('shows The Final label when eliminated in final', () => {
		render(<EliminatedView team={makeTeam({ currentStage: 'final' })} />)
		expect(screen.getByText(/The Final/)).toBeInTheDocument()
	})

	// ── Messaging ─────────────────────────────────────────────────────────

	it('renders the "Journey Ended" heading text alongside the team name', () => {
		render(<EliminatedView team={makeTeam({ name: 'USA' })} />)
		expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('USA · Journey Ended')
	})

	it('mentions using the date selector to replay their run', () => {
		render(<EliminatedView team={makeTeam()} />)
		expect(screen.getByText(/date selector/i)).toBeInTheDocument()
	})

	// ── Flag ──────────────────────────────────────────────────────────────

	it('renders a flag for the team by name', () => {
		render(<EliminatedView team={makeTeam({ id: 'usa', name: 'USA' })} />)
		// FlagIcon renders an aria-label like "<name> flag" when name is provided
		// EliminatedView passes team.id, team.flag, team.name — USA maps to ISO 'us'
		// so CircleFlag renders; FlagIcon wraps it in a span with aria-label "USA flag"
		expect(screen.getByLabelText('USA flag')).toBeInTheDocument()
	})

	it('renders a flag for Brazil', () => {
		render(<EliminatedView team={makeTeam({ id: 'brazil', name: 'Brazil', flag: '🇧🇷' })} />)
		expect(screen.getByLabelText('Brazil flag')).toBeInTheDocument()
	})

	// ── Status role ───────────────────────────────────────────────────────

	it('renders the card with role="status"', () => {
		render(<EliminatedView team={makeTeam()} />)
		expect(screen.getByRole('status')).toBeInTheDocument()
	})
})
