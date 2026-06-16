import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ScheduledMatches from './ScheduledMatches'
import type { Team } from '../types'

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
				venue: 'Los Angeles',
				scorers: ['Pulisic 34\'', 'McKennie 67\''],
				cards: [{ player: 'Adams', minute: '45\'', type: 'yellow' }],
			},
			{
				matchday: 2,
				opponent: 'Brazil',
				opponentFlag: '🇧🇷',
				result: 'D',
				score: '1-1',
				date: '2026-06-17',
				venue: 'Los Angeles',
				scorers: ['Pulisic 78\''],
				cards: [],
			},
			{
				matchday: 3,
				opponent: 'Japan',
				opponentFlag: '🇯🇵',
				result: null,
				score: null,
				date: '2026-06-22',
				venue: 'Los Angeles',
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
			r32: { status: 'active', date: '2026-07-01', city: 'Los Angeles', venue: 'SoFi Stadium', match: 1 },
			r16: { status: 'upcoming', city: 'Miami', date: '2026-07-05', opponentDesc: 'Winner Group G' },
			qf: { status: 'future', city: 'Dallas', date: '2026-07-10' },
			sf: { status: 'future', city: 'Atlanta', date: '2026-07-14' },
			final: { status: 'future', city: 'New York', date: '2026-07-19' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

describe('ScheduledMatches', () => {
	// ── Group stage matches ────────────────────────────────────────────

	it('renders group stage results from groupResults', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(screen.getByText('Germany')).toBeInTheDocument()
		expect(screen.getByText('Brazil')).toBeInTheDocument()
		expect(screen.getByText('Japan')).toBeInTheDocument()
	})

	it('shows win status icon for won matches', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		// The status icon for W is ✓
		expect(document.querySelector('[class*="statusWin"]')).toBeTruthy()
	})

	it('shows draw status icon for drawn matches', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(document.querySelector('[class*="statusDraw"]')).toBeTruthy()
	})

	it('shows upcoming status for matches without result', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(document.querySelector('[class*="statusUpcoming"]')).toBeTruthy()
	})

	it('shows score for completed matches', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(screen.getByLabelText('Score: 2-1')).toBeInTheDocument()
		expect(screen.getByLabelText('Score: 1-1')).toBeInTheDocument()
	})

	// ── Past/current/future stage states ───────────────────────────────

	it('marks past stages with ✓ prefix CSS class', () => {
		const { container } = render(<ScheduledMatches team={mockTeam()} />)
		// Group stage is in the past (currentStage is r32) — should have stageDone class
		const doneStage = container.querySelector('[class*="stageDone"]')
		expect(doneStage).toBeTruthy()
		expect(doneStage!.textContent).toContain('Group Stage')
	})

	it('marks current stage with ● prefix CSS class', () => {
		const { container } = render(<ScheduledMatches team={mockTeam()} />)
		// r32 is current — should have stageCurrent class
		const currentStage = container.querySelector('[class*="stageCurrent"]')
		expect(currentStage).toBeTruthy()
		expect(currentStage!.textContent).toContain('Round of 32')
	})

	it('marks future stages with ❓ prefix CSS class', () => {
		const { container } = render(<ScheduledMatches team={mockTeam()} />)
		// Quarterfinal is future — should have stageFuture class
		const futureStages = container.querySelectorAll('[class*="stageFuture"]')
		expect(futureStages.length).toBeGreaterThan(0)
	})

	it('applies stageDone class to completed stages', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(document.querySelector('[class*="stageDone"]')).toBeTruthy()
	})

	it('applies stageCurrent class to current stage', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(document.querySelector('[class*="stageCurrent"]')).toBeTruthy()
	})

	it('applies stageFuture class to future stages', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(document.querySelector('[class*="stageFuture"]')).toBeTruthy()
	})

	// ── Knockout stages from path data ─────────────────────────────────

	it('renders knockout stage city labels', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		// "Los Angeles" appears in both group stage venues and knockout stage city header
		const laElements = screen.getAllByText('Los Angeles')
		expect(laElements.length).toBeGreaterThan(0)
		expect(screen.getByText('Miami')).toBeInTheDocument()
		expect(screen.getByText('New York')).toBeInTheDocument()
	})

	it('shows conditional opponentDesc for future matches', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(screen.getByText('Winner Group G')).toBeInTheDocument()
	})

	it('shows TBD when no opponentDesc is available', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r16: { status: 'upcoming', city: 'Miami', date: '2026-07-05' },
			},
		})
		render(<ScheduledMatches team={team} />)
		// Multiple future stages will have "TBD" — verify at least one exists
		const tbdElements = screen.getAllByText('TBD')
		expect(tbdElements.length).toBeGreaterThanOrEqual(1)
	})

	// ── Conditional future match class ─────────────────────────────────

	it('applies conditional class to future knockout match rows', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		// The r16 match is upcoming/conditional
		expect(document.querySelector('[class*="conditional"]')).toBeTruthy()
	})

	// ── Section note ───────────────────────────────────────────────────

	it('renders the future matches note', () => {
		render(<ScheduledMatches team={mockTeam()} />)
		expect(screen.getByText(/Future matches are conditional/)).toBeInTheDocument()
	})

	// ── Empty groupResults ─────────────────────────────────────────────

	it('handles empty groupResults gracefully', () => {
		const team = mockTeam({ groupResults: [], currentStage: 'r16' })
		render(<ScheduledMatches team={team} />)
		// Should not render group stage block at all
		expect(screen.queryByText(/MD1/)).toBeFalsy()
	})

	// ── Eliminated team ────────────────────────────────────────────────

	it('renders correctly for eliminated team', () => {
		const team = mockTeam({
			eliminated: true,
			currentStage: 'r16',
			groupResults: [mockTeam().groupResults[0]],
			path: {
				...mockTeam().path,
				r32: { status: 'done', city: 'Los Angeles', date: '2026-07-01', opponentDesc: 'vs Germany' },
				r16: { status: 'done', city: 'Miami', date: '2026-07-05', opponentDesc: 'vs Brazil' },
				qf: null,
				sf: null,
				final: null,
			},
		})
		render(<ScheduledMatches team={team} />)
		// Section header contains team name; use regex for substring match
		expect(screen.getByText(/Full Schedule.*USA/)).toBeInTheDocument()
	})
})
