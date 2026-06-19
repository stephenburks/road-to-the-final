import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { screen } from '@testing-library/react'
import { renderWithQuery } from '../test-utils'
import Hero from './Hero'
import type { Team, Stage } from '../types'

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
			r16: { status: 'upcoming' },
			qf: { status: 'future' },
			sf: { status: 'future' },
			final: { status: 'future' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

const ACTIVE_STAGE: Stage = 'r32'

describe('Hero', () => {
	beforeEach(() => {
		vi.setSystemTime(new Date('2026-06-15T12:00:00Z'))
		vi.spyOn(globalThis, 'fetch').mockResolvedValue({
			ok: true,
			json: () => Promise.resolve({ team: null }),
		} as Response)
	})

	afterEach(() => {
		vi.useRealTimers()
		vi.restoreAllMocks()
	})

	// ── Active team rendering ──────────────────────────────────────────

	it('renders team name as heading for active team', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByRole('heading', { name: /USA/ })).toBeInTheDocument()
	})

	it('renders stage label in eyebrow for active team', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText('Round of 32')).toBeInTheDocument()
	})

	it('renders city and date as subhead for active team', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/Los Angeles/)).toBeInTheDocument()
	})

	it('shows stat grid with advancement probabilities for active team', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByRole('list', { name: /advancement probabilities/i })).toBeInTheDocument()
		expect(screen.getByText('100%')).toBeInTheDocument()
		expect(screen.getByText('70%')).toBeInTheDocument()
		expect(screen.getByText('40%')).toBeInTheDocument()
		expect(screen.getByText('5%')).toBeInTheDocument()
	})

	it('shows Polymarket as source label when source is market', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getAllByText('Polymarket')).toHaveLength(7)
	})

	it('shows calculated as source label when source is calculated', () => {
		const team = mockTeam({
			advanceProbabilities: {
				r32: 100, r16: 80, qf: 50, sf: 25, final: 10, winner: 3,
				source: 'calculated',
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getAllByText('Calculated')).toHaveLength(6)
	})

	it('shows historical source label when isHistorical is true', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={true} />)
		expect(screen.getAllByText('As of snapshot')).toHaveLength(6)
	})

	it('shows historical suffix in eyebrow when isHistorical', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={true} />)
		expect(screen.getByText(/Historical/)).toBeInTheDocument()
	})

	// ── Group win probability card ─────────────────────────────────────

	it('renders group win probability card when groupWinProb is provided', () => {
		const groupWinProb = { probability: 7, groupLetter: 'D' }
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} groupWinProb={groupWinProb} />)
		expect(screen.getByText('7%')).toBeInTheDocument()
		expect(screen.getByText('Win Group D')).toBeInTheDocument()
	})

	it('renders correct aria-label on group win card', () => {
		const groupWinProb = { probability: 12, groupLetter: 'A' }
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} groupWinProb={groupWinProb} />)
		expect(screen.getByRole('listitem', { name: /Win Group A: 12%/ })).toBeInTheDocument()
	})

	it('shows group win card placeholder when groupWinProb is undefined', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText('Win Group')).toBeInTheDocument()
		expect(screen.getByText('—%')).toBeInTheDocument()
	})

	it('does not render group win card for eliminated team even if groupWinProb provided', () => {
		const groupWinProb = { probability: 5, groupLetter: 'A' }
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} groupWinProb={groupWinProb} />)
		expect(screen.queryByText(/Win Group/)).not.toBeInTheDocument()
	})

	// ── Days-until edge cases ──────────────────────────────────────────

	it('shows days-until count when path date is in the future', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', date: '2026-07-01' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/16 days away/)).toBeInTheDocument()
	})

	it('shows "0 days away" when path date is today', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', date: '2026-06-15' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/0 days away/)).toBeInTheDocument()
	})

	it('uses singular "day" for exactly 1 day away', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', date: '2026-06-16' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/1 day away/)).toBeInTheDocument()
	})

	it('clamps negative days to 0 in display text', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', date: '2026-06-01' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/0 days away/)).toBeInTheDocument()
	})

	it('falls back to path date text when days is null (no valid date)', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', date: 'TBD' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/Next:/)).toBeInTheDocument()
	})

	// ── Eliminated team rendering ──────────────────────────────────────

	it('renders "Journey Ended" heading for eliminated team', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} />)
		expect(screen.getByRole('heading', { name: /Journey Ended/ })).toBeInTheDocument()
	})

	it('renders eliminated eyebrow text for eliminated team', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} />)
		expect(screen.getByText(/Eliminated/)).toBeInTheDocument()
	})

	it('does not render stat grid for eliminated team', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} />)
		expect(screen.queryByRole('list', { name: /advancement/i })).toBeFalsy()
	})

	it('does not render subhead for eliminated team', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} />)
		expect(screen.queryByText(/Los Angeles/)).toBeFalsy()
	})

	it('shows knockout stage in subtext for eliminated team', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} />)
		expect(screen.getByText(/knocked out in the Round of 16/)).toBeInTheDocument()
	})

	// ── Conditional note ───────────────────────────────────────────────

	it('renders conditional note when path.conditional is true', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', conditional: true, conditionNote: 'Venue TBD' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByRole('note')).toBeInTheDocument()
		expect(screen.getByText('Venue TBD')).toBeInTheDocument()
	})

	it('shows default conditional note when conditionNote is missing', () => {
		const team = mockTeam({
			path: {
				...mockTeam().path,
				r32: { status: 'active', conditional: true },
			},
		})
		renderWithQuery(<Hero team={team} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.getByText(/Venue assumes current group standing/)).toBeInTheDocument()
	})

	it('does not render conditional note when not conditional', () => {
		renderWithQuery(<Hero team={mockTeam()} activeStage={ACTIVE_STAGE} isHistorical={false} />)
		expect(screen.queryByRole('note')).toBeFalsy()
	})

	it('does not render conditional note for eliminated team even if conditional', () => {
		const team = mockTeam({
			eliminated: true,
			path: {
				...mockTeam().path,
				r16: { status: 'done', conditional: true, conditionNote: 'Should not show' },
			},
		})
		renderWithQuery(<Hero team={team} activeStage="r16" isHistorical={false} />)
		expect(screen.queryByRole('note')).toBeFalsy()
	})
})
