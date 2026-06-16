import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import RoadBracket from './RoadBracket'
import type { Team, Stage } from '../types'
import { STAGE_ORDER } from '../constants'

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
			group_stage: { status: 'done', city: 'Group A', date: '2026-06-12' },
			r32: { status: 'active', city: 'Los Angeles', date: '2026-07-01' },
			r16: { status: 'upcoming', city: 'Miami', date: '2026-07-05' },
			qf: { status: 'future', city: 'Dallas', date: '2026-07-10' },
			sf: { status: 'future', city: 'Atlanta', date: '2026-07-14' },
			final: { status: 'future', city: 'New York', date: '2026-07-19' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

describe('RoadBracket', () => {
	const onStageSelect = vi.fn()
	const ACTIVE_STAGE: Stage = 'r32'

	beforeEach(() => {
		onStageSelect.mockClear()
	})

	// ── Stage buttons ──────────────────────────────────────────────────

	it('renders a button for each tournament stage', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		STAGE_ORDER.forEach(stage => {
			// Each stage has an aria-label containing the stage name
			// Using querySelector to find buttons within the group
		})
		const buttons = screen.getAllByRole('button')
		expect(buttons).toHaveLength(STAGE_ORDER.length) // 6 stages
	})

	it('calls onStageSelect with correct stage on click', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		const buttons = screen.getAllByRole('button')
		// Click the SF button (index 4)
		fireEvent.click(buttons[4])
		expect(onStageSelect).toHaveBeenCalledWith('sf')
	})

	it('shows active stage as aria-pressed="true"', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		// r32 is at index 1 in STAGE_ORDER (index 0 is group_stage)
		const buttons = screen.getAllByRole('button')
		// The r32 button (index 1) should be pressed
		const r32Btn = buttons.find(b => b.getAttribute('aria-label')?.includes('Round of 32'))
		expect(r32Btn).toBeTruthy()
		expect(r32Btn!.getAttribute('aria-pressed')).toBe('true')
	})

	it('shows inactive stages as aria-pressed="false"', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		const buttons = screen.getAllByRole('button')
		const groupBtn = buttons.find(b => b.getAttribute('aria-label')?.includes('Group Stage'))
		expect(groupBtn).toBeTruthy()
		expect(groupBtn!.getAttribute('aria-pressed')).toBe('false')
	})

	// ── Node icons ─────────────────────────────────────────────────────

	it('renders checkmark node for completed stages', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		// Group stage is done (index 0 < currentIdx 1)
		expect(screen.getByText('✓')).toBeInTheDocument()
	})

	it('renders current stage icon for current stage', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		// r32 is current, icon is '32'
		expect(screen.getByText('32')).toBeInTheDocument()
	})

	it('renders purple node for active (selected) future stage', () => {
		render(<RoadBracket team={mockTeam()} activeStage="qf" onStageSelect={onStageSelect} />)
		// qf is active but not current, should show 'QF'
		expect(screen.getByText('QF')).toBeInTheDocument()
	})

	it('renders star icon for final', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		expect(screen.getByText('★')).toBeInTheDocument()
	})

	// ── Eliminated team rendering ──────────────────────────────────────

	it('renders eliminated X marker for eliminated team', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		render(<RoadBracket team={team} activeStage="r16" onStageSelect={onStageSelect} />)
		expect(screen.getByText('✕')).toBeInTheDocument()
	})

	it('renders checkmarks for stages before elimination', () => {
		const team = mockTeam({ eliminated: true, currentStage: 'r16' })
		render(<RoadBracket team={team} activeStage="r16" onStageSelect={onStageSelect} />)
		// Stages before current (group_stage, r32) should have ✓
		const checks = screen.getAllByText('✓')
		expect(checks.length).toBe(2)
	})

	// ── Connector gradient ─────────────────────────────────────────────

	it('renders connector element with gradient background', () => {
		const { container } = render(
			<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />
		)
		const connector = container.querySelector('[class*="connector"]')
		expect(connector).toBeTruthy()
		expect(connector!.getAttribute('aria-hidden')).toBe('true')
		// The connector should have a gradient style
		expect((connector as HTMLElement).style.background).toContain('linear-gradient')
	})

	it('computes green completion percentage from currentIdx', () => {
		const team = mockTeam({ currentStage: 'sf' }) // index 4
		const { container } = render(
			<RoadBracket team={team} activeStage="sf" onStageSelect={onStageSelect} />
		)
		const connector = container.querySelector('[class*="connector"]') as HTMLElement
		// currentIdx = 4, STAGE_ORDER.length - 1 = 5
		// completePct = Math.min((4 / 5) * 100, 100) = 80
		// gradient has var(--green) 0%, var(--green) 72%, ...
		expect(connector.style.background).toContain('72%')
	})

	// ── BracketNode rendering ──────────────────────────────────────────

	it('renders BracketNode for each stage', () => {
		const { container } = render(
			<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />
		)
		// Each stage button contains a BracketNode div with aria-hidden="true"
		const nodes = container.querySelectorAll('[aria-hidden="true"]')
		// connector + 6 nodes = 7
		expect(nodes.length).toBeGreaterThanOrEqual(6)
	})

	// ── BracketCard rendering ──────────────────────────────────────────

	it('renders BracketCard with city information', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		// BracketCard shows city names
		expect(screen.getByText('Los Angeles')).toBeInTheDocument()
		expect(screen.getByText('Miami')).toBeInTheDocument()
		expect(screen.getByText('New York')).toBeInTheDocument()
	})

	// ── Section structure ──────────────────────────────────────────────

	it('has role="group" on the stage grid for a11y', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		expect(screen.getByRole('group', { name: 'Tournament stages' })).toBeInTheDocument()
	})

	it('renders section label "The Road to the Final"', () => {
		render(<RoadBracket team={mockTeam()} activeStage={ACTIVE_STAGE} onStageSelect={onStageSelect} />)
		expect(screen.getByText('The Road to the Final')).toBeInTheDocument()
	})
})
