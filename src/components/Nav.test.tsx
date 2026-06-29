import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Nav from './Nav'
import type { View } from '../hooks/useAppState'

// Stub IntersectionObserver — Nav uses it inside a useEffect when view === 'team'
vi.stubGlobal('IntersectionObserver', class {
	observe() {}
	disconnect() {}
	unobserve() {}
})

function renderNav(props: { view?: View; onViewChange?: (v: View) => void; isHistorical?: boolean } = {}) {
	const onViewChange = props.onViewChange ?? vi.fn()
	render(
		<Nav
			view={props.view ?? 'home'}
			onViewChange={onViewChange}
			isHistorical={props.isHistorical ?? false}
		/>
	)
	return { onViewChange }
}

describe('Nav', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	// ── Button presence ───────────────────────────────────────────────────

	it('renders the Today button', () => {
		renderNav()
		expect(screen.getByRole('button', { name: 'Today' })).toBeInTheDocument()
	})

	it('renders the Standings button', () => {
		renderNav()
		expect(screen.getByRole('button', { name: 'Standings' })).toBeInTheDocument()
	})

	it('renders Team, Path, Groups, Opponents, Schedule, Squad section buttons', () => {
		renderNav()
		expect(screen.getByRole('button', { name: 'Team' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Path' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Groups' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Opponents' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Schedule' })).toBeInTheDocument()
		expect(screen.getByRole('button', { name: 'Squad' })).toBeInTheDocument()
	})

	it('renders a top-level Bracket button', () => {
		renderNav()
		expect(screen.getByRole('button', { name: 'Bracket' })).toBeInTheDocument()
	})

	// ── aria-current on Today ─────────────────────────────────────────────

	it('sets aria-current="page" on Today when view is home', () => {
		renderNav({ view: 'home' })
		expect(screen.getByRole('button', { name: 'Today' })).toHaveAttribute('aria-current', 'page')
	})

	it('does not set aria-current on Today when view is not home', () => {
		renderNav({ view: 'standings' })
		expect(screen.getByRole('button', { name: 'Today' })).not.toHaveAttribute('aria-current')
	})

	// ── aria-current on Standings ─────────────────────────────────────────

	it('sets aria-current="page" on Standings when view is standings', () => {
		renderNav({ view: 'standings' })
		expect(screen.getByRole('button', { name: 'Standings' })).toHaveAttribute('aria-current', 'page')
	})

	it('does not set aria-current on Standings when view is home', () => {
		renderNav({ view: 'home' })
		expect(screen.getByRole('button', { name: 'Standings' })).not.toHaveAttribute('aria-current')
	})

	// ── Clicking Today ────────────────────────────────────────────────────

	it('calls onViewChange("home") when Today is clicked', () => {
		const { onViewChange } = renderNav({ view: 'standings' })
		fireEvent.click(screen.getByRole('button', { name: 'Today' }))
		expect(onViewChange).toHaveBeenCalledWith('home')
	})

	// ── Clicking Standings ────────────────────────────────────────────────

	it('calls onViewChange("standings") when Standings is clicked', () => {
		const { onViewChange } = renderNav({ view: 'home' })
		fireEvent.click(screen.getByRole('button', { name: 'Standings' }))
		expect(onViewChange).toHaveBeenCalledWith('standings')
	})

	// ── Section link navigation from a non-team view ──────────────────────

	it('calls onViewChange("team") when a section button is clicked while not on team view', () => {
		const { onViewChange } = renderNav({ view: 'home' })
		fireEvent.click(screen.getByRole('button', { name: 'Team' }))
		expect(onViewChange).toHaveBeenCalledWith('team')
	})

	it('calls onViewChange("team") for any section button when currently on home view', () => {
		const { onViewChange } = renderNav({ view: 'home' })
		fireEvent.click(screen.getByRole('button', { name: 'Squad' }))
		expect(onViewChange).toHaveBeenCalledWith('team')
	})

	// ── Section link scroll behavior when already on team view ───────────

	it('calls scrollIntoView when a section button is clicked while already on team view', () => {
		const scrollIntoView = vi.fn()
		const fakeEl = { scrollIntoView } as unknown as HTMLElement
		vi.spyOn(document, 'getElementById').mockReturnValue(fakeEl)

		renderNav({ view: 'team' })
		fireEvent.click(screen.getByRole('button', { name: 'Groups' }))

		// When view === 'team', scrollToSection is called synchronously (no setTimeout)
		expect(scrollIntoView).toHaveBeenCalledWith({ behavior: 'smooth' })
	})

	it('does not call onViewChange when clicking a section button already on team view', () => {
		vi.spyOn(document, 'getElementById').mockReturnValue({ scrollIntoView: vi.fn() } as unknown as HTMLElement)
		const { onViewChange } = renderNav({ view: 'team' })
		fireEvent.click(screen.getByRole('button', { name: 'Schedule' }))
		expect(onViewChange).not.toHaveBeenCalled()
	})

	// ── Live / Historical badge ───────────────────────────────────────────

	it('shows "Live" text when isHistorical is false', () => {
		renderNav({ isHistorical: false })
		expect(screen.getByText('Live')).toBeInTheDocument()
	})

	it('shows "Historical" text when isHistorical is true', () => {
		renderNav({ isHistorical: true })
		expect(screen.getByText('Historical')).toBeInTheDocument()
	})

	it('does not show "Historical" when isHistorical is false', () => {
		renderNav({ isHistorical: false })
		expect(screen.queryByText('Historical')).not.toBeInTheDocument()
	})

	it('does not show "Live" when isHistorical is true', () => {
		renderNav({ isHistorical: true })
		expect(screen.queryByText('Live')).not.toBeInTheDocument()
	})

	// ── Nav landmark ──────────────────────────────────────────────────────

	it('renders a nav element with accessible label', () => {
		renderNav()
		expect(screen.getByRole('navigation', { name: 'Site navigation' })).toBeInTheDocument()
	})
})
