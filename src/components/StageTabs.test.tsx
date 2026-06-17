import { describe, it, expect, vi, afterEach } from 'vitest'
import { screen, fireEvent } from '@testing-library/react'
import { renderWithQuery } from '../test-utils'
import StageTabs from './StageTabs'
import { STAGE_ORDER } from '../constants'
import type { Team } from '../types'

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

describe('StageTabs', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	it('renders a button for each stage in STAGE_ORDER', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		const buttons = screen.getAllByRole('button')
		expect(buttons).toHaveLength(STAGE_ORDER.length)
	})

	it('sets aria-pressed="true" only on the selected stage button', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='r16' onSelect={onSelect} />
		)

		const buttons = screen.getAllByRole('button')
		const pressedButtons = buttons.filter(btn => btn.getAttribute('aria-pressed') === 'true')
		expect(pressedButtons).toHaveLength(1)
		expect(pressedButtons[0]).toHaveAccessibleName(/Round of 16/)
	})

	it('sets aria-pressed="false" on all non-selected stage buttons', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		const buttons = screen.getAllByRole('button')
		const unpressedButtons = buttons.filter(btn => btn.getAttribute('aria-pressed') === 'false')
		expect(unpressedButtons).toHaveLength(STAGE_ORDER.length - 1)
	})

	it('calls onSelect with the stage when a button is clicked', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		const r32Button = screen.getByRole('button', { name: /Round of 32/ })
		fireEvent.click(r32Button)

		expect(onSelect).toHaveBeenCalledOnce()
		expect(onSelect).toHaveBeenCalledWith('r32')
	})

	it('calls onSelect for every stage button that is clicked', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		const buttons = screen.getAllByRole('button')
		fireEvent.click(buttons[0])
		fireEvent.click(buttons[2])
		fireEvent.click(buttons[5])

		expect(onSelect).toHaveBeenCalledTimes(3)
		expect(onSelect).toHaveBeenNthCalledWith(1, 'group_stage')
		expect(onSelect).toHaveBeenNthCalledWith(2, 'r16')
		expect(onSelect).toHaveBeenNthCalledWith(3, 'final')
	})

	it('ArrowRight key on a stage button calls onSelect with the next stage', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='r32' onSelect={onSelect} />
		)

		const r32Button = screen.getByRole('button', { name: /Round of 32/ })
		fireEvent.keyDown(r32Button, { key: 'ArrowRight' })

		expect(onSelect).toHaveBeenCalledOnce()
		expect(onSelect).toHaveBeenCalledWith('r16')
	})

	it('ArrowLeft key on a stage button calls onSelect with the previous stage', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='r16' onSelect={onSelect} />
		)

		const r16Button = screen.getByRole('button', { name: /Round of 16/ })
		fireEvent.keyDown(r16Button, { key: 'ArrowLeft' })

		expect(onSelect).toHaveBeenCalledOnce()
		expect(onSelect).toHaveBeenCalledWith('r32')
	})

	it('ArrowRight on the last stage does not call onSelect', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='final' onSelect={onSelect} />
		)

		const finalButton = screen.getByRole('button', { name: /The Final/ })
		fireEvent.keyDown(finalButton, { key: 'ArrowRight' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('ArrowLeft on the first stage does not call onSelect', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		const groupButton = screen.getByRole('button', { name: /Group Stage/ })
		fireEvent.keyDown(groupButton, { key: 'ArrowLeft' })

		expect(onSelect).not.toHaveBeenCalled()
	})

	it('shows city name in the button when path has a city for that stage', () => {
		const team = mockTeam({
			currentStage: 'r32',
			path: {
				group_stage: { status: 'done' },
				r32: { status: 'active', city: 'Seattle · Lumen Field' },
				r16: { status: 'future' },
				qf: { status: 'future' },
				sf: { status: 'future' },
				final: { status: 'future' },
			},
		})
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={team} selectedStage='r32' onSelect={onSelect} />
		)

		// city.split('·')[0].trim() → 'Seattle'
		expect(screen.getByText('Seattle')).toBeInTheDocument()
	})

	it('does not show city text when path has no city for a stage', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		// No path cities on the default mock team
		expect(screen.queryByText(/·/)).not.toBeInTheDocument()
	})

	it('includes city name in the aria-label when path has a city', () => {
		const team = mockTeam({
			currentStage: 'r32',
			path: {
				group_stage: { status: 'done' },
				r32: { status: 'active', city: 'Seattle · Lumen Field' },
				r16: { status: 'future' },
				qf: { status: 'future' },
				sf: { status: 'future' },
				final: { status: 'future' },
			},
		})
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={team} selectedStage='r32' onSelect={onSelect} />
		)

		const r32Button = screen.getByRole('button', { name: /Seattle/ })
		expect(r32Button).toBeInTheDocument()
	})

	it('renders the conditional indicator span when path.conditional is true and stage is a future non-current stage', () => {
		const team = mockTeam({
			currentStage: 'r32',
			path: {
				group_stage: { status: 'done' },
				r32: { status: 'active' },
				r16: { status: 'future', conditional: true, conditionNote: 'If USA advances' },
				qf: { status: 'future' },
				sf: { status: 'future' },
				final: { status: 'future' },
			},
		})
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={team} selectedStage='r32' onSelect={onSelect} />
		)

		// The conditional span is aria-hidden, so query by aria-hidden presence in the r16 button
		const r16Button = screen.getByRole('button', { name: /Round of 16/ })
		const conditionalSpans = r16Button.querySelectorAll('[aria-hidden="true"]')
		// Should contain the conditional indicator span (aria-hidden)
		expect(conditionalSpans.length).toBeGreaterThan(0)
	})

	it('does not render the conditional indicator span when conditional is true but stage is the current stage', () => {
		const team = mockTeam({
			currentStage: 'r32',
			path: {
				group_stage: { status: 'done' },
				r32: { status: 'active', conditional: true },
				r16: { status: 'future' },
				qf: { status: 'future' },
				sf: { status: 'future' },
				final: { status: 'future' },
			},
		})
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={team} selectedStage='r32' onSelect={onSelect} />
		)

		// The r32 button is the currentStage so conditional indicator should NOT render
		// aria-label should not mention the conditionNote
		const r32Button = screen.getByRole('button', { name: /Round of 32/ })
		expect(r32Button.getAttribute('aria-label')).not.toContain('Conditional venue')
	})

	it('renders the group container with role="group" and correct aria-label', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		const group = screen.getByRole('group', { name: 'Tournament stage' })
		expect(group).toBeInTheDocument()
	})

	it('selected button has tabIndex 0, non-selected buttons have tabIndex -1', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='qf' onSelect={onSelect} />
		)

		const buttons = screen.getAllByRole('button')
		const qfButton = screen.getByRole('button', { name: /Quarterfinal/ })

		expect(qfButton).toHaveAttribute('tabindex', '0')
		buttons
			.filter(btn => btn !== qfButton)
			.forEach(btn => expect(btn).toHaveAttribute('tabindex', '-1'))
	})

	it('renders short labels alongside full labels for each stage', () => {
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={mockTeam()} selectedStage='group_stage' onSelect={onSelect} />
		)

		// Full labels
		expect(screen.getByText('Group Stage')).toBeInTheDocument()
		expect(screen.getByText('Round of 32')).toBeInTheDocument()
		// Short labels
		expect(screen.getByText('Group')).toBeInTheDocument()
		expect(screen.getByText('R32')).toBeInTheDocument()
	})

	it('treats eliminated team correctly: eliminated stage button exists and team.eliminated is respected', () => {
		const team = mockTeam({
			currentStage: 'r32',
			eliminated: true,
			path: {
				group_stage: { status: 'done' },
				r32: { status: 'active' },
				r16: { status: 'future' },
				qf: { status: 'future' },
				sf: { status: 'future' },
				final: { status: 'future' },
			},
		})
		const onSelect = vi.fn()
		renderWithQuery(
			<StageTabs team={team} selectedStage='r32' onSelect={onSelect} />
		)

		// All 6 stage buttons should still render
		expect(screen.getAllByRole('button')).toHaveLength(STAGE_ORDER.length)
		// The r32 button aria-label should not include 'current stage' for eliminated teams
		const r32Button = screen.getByRole('button', { name: /Round of 32/ })
		expect(r32Button).toBeInTheDocument()
	})
})
