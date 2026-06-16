import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import TeamSelector from './TeamSelector'
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
		groupResults: [],
		advanceProbabilities: {
			r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2,
			source: 'market',
		},
		path: {
			group_stage: { status: 'done' },
			r32: { status: 'active' },
			r16: { status: 'upcoming' },
			qf: { status: 'future' },
			sf: { status: 'future' },
			final: { status: 'future' },
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

const MOCK_TEAMS: Team[] = [
	mockTeam({ id: 'usa', name: 'USA', confederation: 'CONCACAF', fifaRank: 14 }),
	mockTeam({ id: 'ger', name: 'Germany', confederation: 'UEFA', fifaRank: 5, advanceProbabilities: { ...mockTeam().advanceProbabilities, winner: 15 } }),
	mockTeam({ id: 'bra', name: 'Brazil', confederation: 'CONMEBOL', fifaRank: 3, advanceProbabilities: { ...mockTeam().advanceProbabilities, winner: 20 } }),
	mockTeam({ id: 'jpn', name: 'Japan', confederation: 'AFC', fifaRank: 20, advanceProbabilities: { ...mockTeam().advanceProbabilities, winner: 2 } }),
	mockTeam({ id: 'out', name: 'Out Team', confederation: 'UEFA', fifaRank: 50, eliminated: true, currentStage: 'r32' }),
]

describe('TeamSelector', () => {
	const onChange = vi.fn()

	beforeEach(() => {
		onChange.mockClear()
	})

	function renderSelector(selectedId = 'usa') {
		return render(
			<TeamSelector teams={MOCK_TEAMS} selectedId={selectedId} onChange={onChange} />
		)
	}

	// ── Trigger button ─────────────────────────────────────────────────

	it('renders trigger button with selected team name', () => {
		renderSelector()
		expect(screen.getByLabelText(/Select team, current: USA/)).toBeInTheDocument()
		expect(screen.getByText('USA')).toBeInTheDocument()
	})

	it('shows "Select team" when no team is selected', () => {
		render(<TeamSelector teams={MOCK_TEAMS} selectedId="nonexistent" onChange={onChange} />)
		expect(screen.getByText('Select team')).toBeInTheDocument()
	})

	it('has aria-haspopup="listbox" and aria-expanded="false" initially', () => {
		renderSelector()
		const trigger = screen.getByLabelText(/Select team/)
		expect(trigger).toHaveAttribute('aria-haspopup', 'listbox')
		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})

	// ── Dropdown open/close ────────────────────────────────────────────

	it('opens dropdown on trigger click', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team, current: USA/))
		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})
	})

	it('closes dropdown on Escape key', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		fireEvent.keyDown(screen.getByRole('listbox').closest('[class*="wrap"]')!, { key: 'Escape' })
		await waitFor(() => {
			expect(screen.queryByRole('listbox')).toBeFalsy()
		})
	})

	it('closes dropdown on click outside', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		// click outside triggers useClickOutside via mousedown
		fireEvent.mouseDown(document.body)
		await waitFor(() => {
			expect(screen.queryByRole('listbox')).toBeFalsy()
		})
	})

	it('closes dropdown and calls onChange when selecting a team', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const germanyOption = screen.getByText('Germany').closest('[role="option"]')!
		fireEvent.click(germanyOption)

		expect(onChange).toHaveBeenCalledWith('ger')
		await waitFor(() => {
			expect(screen.queryByRole('listbox')).toBeFalsy()
		})
	})

	// ── Confederation grouping ─────────────────────────────────────────

	it('renders confederation group labels in dropdown', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		// Group labels (aria-hidden) contain confederation names + counts
		expect(screen.getByText(/UEFA/)).toBeInTheDocument()
		expect(screen.getByText(/CONMEBOL/)).toBeInTheDocument()
		expect(screen.getByText(/CONCACAF/)).toBeInTheDocument()
		expect(screen.getByText(/AFC/)).toBeInTheDocument()
		expect(screen.getByText(/Eliminated/)).toBeInTheDocument()
	})

	it('sorts teams within confederation by winner probability', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		// UEFA has only Germany (Out Team is in Eliminated group)
		const uefaGroup = screen.getByRole('group', { name: 'UEFA' })
		const uefaOptions = uefaGroup.querySelectorAll('[role="option"]')
		expect(uefaOptions).toHaveLength(1)
		expect(uefaOptions[0].textContent).toContain('Germany')

		// Eliminated group has Out Team
		const elimGroup = screen.getByRole('group', { name: 'Eliminated' })
		const elimOptions = elimGroup.querySelectorAll('[role="option"]')
		expect(elimOptions).toHaveLength(1)
		expect(elimOptions[0].textContent).toContain('Out Team')
	})

	// ── Eliminated team exclusion ──────────────────────────────────────

	it('marks eliminated teams with aria-disabled and OUT tag', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const outOption = screen.getByText('Out Team').closest('[role="option"]')!
		expect(outOption).toHaveAttribute('aria-disabled', 'true')
		expect(outOption.querySelector('[class*="elimTag"]')).toBeTruthy()

		// Clicking eliminated team does NOT trigger onChange
		fireEvent.click(outOption)
		expect(onChange).not.toHaveBeenCalled()
	})

	it('excludes eliminated teams from keyboard navigation', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const wrap = screen.getByRole('listbox').closest('[class*="wrap"]')!
		const listbox = screen.getByRole('listbox')

		// flatItems order: UEFA(Germany[15]), CONMEBOL(Brazil[20]), CONCACAF(USA), AFC(Japan), Eliminated(Out)
		// selectable (non-eliminated): Germany, Brazil, USA, Japan
		// First ArrowDown -> index 0 (Germany)
		fireEvent.keyDown(wrap, { key: 'ArrowDown' })
		await waitFor(() => {
			const gerOption = listbox.querySelector('#ger')
			expect(gerOption?.className).toContain('focused')
		})

		// Second ArrowDown -> index 1 (Brazil)
		fireEvent.keyDown(wrap, { key: 'ArrowDown' })
		await waitFor(() => {
			const braOption = listbox.querySelector('#bra')
			expect(braOption?.className).toContain('focused')
		})
	})

	// ── Search filtering ───────────────────────────────────────────────

	it('filters teams by search query', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const searchInput = screen.getByPlaceholderText(/Search team/)
		fireEvent.change(searchInput, { target: { value: 'brazil' } })

		await waitFor(() => {
			const listbox = screen.getByRole('listbox')
			expect(listbox).toHaveTextContent('Brazil')
			expect(listbox).not.toHaveTextContent('Germany')
		})
	})

	it('filters by confederation name', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const searchInput = screen.getByPlaceholderText(/Search team/)
		fireEvent.change(searchInput, { target: { value: 'CONCACAF' } })

		await waitFor(() => {
			const listbox = screen.getByRole('listbox')
			expect(listbox).toHaveTextContent('USA')
			expect(listbox).not.toHaveTextContent('Germany')
		})
	})

	it('resets focus when search query changes', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const wrap = screen.getByRole('listbox').closest('[class*="wrap"]')!
		fireEvent.keyDown(wrap, { key: 'ArrowDown' }) // focus USA

		const searchInput = screen.getByPlaceholderText(/Search team/)
		fireEvent.change(searchInput, { target: { value: 'germ' } })

		// focusedIdx resets to -1 on search change
		await waitFor(() => {
			expect(screen.getByText('Germany')).toBeInTheDocument()
		})
	})

	// ── Keyboard navigation ────────────────────────────────────────────

	it('selects focused item on Enter', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const wrap = screen.getByRole('listbox').closest('[class*="wrap"]')!
		// flatItems order: Germany, Brazil, USA, Japan, Out
		// ArrowDown -> index 0 (Germany)
		fireEvent.keyDown(wrap, { key: 'ArrowDown' })
		fireEvent.keyDown(wrap, { key: 'Enter' })

		expect(onChange).toHaveBeenCalledWith('ger')
	})

	it('wraps ArrowUp from first item to last selectable', async () => {
		renderSelector()
		fireEvent.click(screen.getByLabelText(/Select team/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const wrap = screen.getByRole('listbox').closest('[class*="wrap"]')!
		// ArrowUp from -1 wraps to last selectable (Japan, index 3)
		fireEvent.keyDown(wrap, { key: 'ArrowUp' })

		await waitFor(() => {
			const jpnOption = screen.getByText('Japan').closest('[role="option"]')!
			expect(jpnOption.className).toContain('focused')
		})
	})

	it('marks currently selected team with aria-selected', async () => {
		renderSelector('bra')
		fireEvent.click(screen.getByLabelText(/Select team, current: Brazil/))

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		const braOption = document.getElementById('bra')
		expect(braOption).toHaveAttribute('aria-selected', 'true')
	})

	it('toggles dropdown closed on second trigger click', async () => {
		renderSelector()
		const trigger = screen.getByLabelText(/Select team/)
		fireEvent.click(trigger)

		await waitFor(() => {
			expect(screen.getByRole('listbox')).toBeInTheDocument()
		})

		fireEvent.click(trigger)
		await waitFor(() => {
			expect(screen.queryByRole('listbox')).toBeFalsy()
		})
	})
})
