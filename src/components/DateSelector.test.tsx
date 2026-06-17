import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import DateSelector from './DateSelector'
import type { SnapshotManifest } from '../types'

function makeManifest(overrides: Partial<SnapshotManifest> = {}): SnapshotManifest {
	return {
		available: ['2026-06-12', '2026-06-13', '2026-06-14'],
		labels: {
			'2026-06-12': 'Jun 12',
			'2026-06-13': 'Jun 13',
			'2026-06-14': 'Jun 14',
		},
		earliest: '2026-06-12',
		latest: '2026-06-14',
		generated: '2026-06-14T23:59:00Z',
		...overrides,
	}
}

describe('DateSelector', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	// ── Null / empty guards ────────────────────────────────────────────────

	it('returns null when manifest is null', () => {
		const { container } = render(
			<DateSelector manifest={null} selectedDate='live' onChange={vi.fn()} />
		)
		expect(container.firstChild).toBeNull()
	})

	it('returns null when manifest.available is empty', () => {
		const { container } = render(
			<DateSelector
				manifest={makeManifest({ available: [] })}
				selectedDate='live'
				onChange={vi.fn()}
			/>
		)
		expect(container.firstChild).toBeNull()
	})

	// ── Label display ──────────────────────────────────────────────────────

	it('shows "Live" label when selectedDate is "live"', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='live' onChange={vi.fn()} />
		)
		expect(screen.getByRole('button', { name: /Date view: Live/ })).toBeInTheDocument()
		expect(screen.getByText('Live')).toBeInTheDocument()
	})

	it('shows manifest label for a historical selectedDate', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='2026-06-13' onChange={vi.fn()} />
		)
		expect(screen.getByRole('button', { name: /Date view: Jun 13/ })).toBeInTheDocument()
		expect(screen.getByText('Jun 13')).toBeInTheDocument()
	})

	it('falls back to raw date string when labels entry is missing', () => {
		render(
			<DateSelector
				manifest={makeManifest({ labels: {} })}
				selectedDate='2026-06-12'
				onChange={vi.fn()}
			/>
		)
		expect(screen.getByText('2026-06-12')).toBeInTheDocument()
	})

	// ── Open / close ───────────────────────────────────────────────────────

	it('dropdown is closed initially (aria-expanded="false")', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='live' onChange={vi.fn()} />
		)
		expect(screen.getByRole('button', { name: /Date view:/ })).toHaveAttribute('aria-expanded', 'false')
	})

	it('clicking the trigger button opens the dropdown', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='live' onChange={vi.fn()} />
		)
		const trigger = screen.getByRole('button', { name: /Date view:/ })
		fireEvent.click(trigger)
		expect(trigger).toHaveAttribute('aria-expanded', 'true')
		expect(screen.getByRole('listbox')).toBeInTheDocument()
	})

	it('clicking outside the dropdown closes it', () => {
		render(
			<div>
				<DateSelector manifest={makeManifest()} selectedDate='live' onChange={vi.fn()} />
				<div data-testid='outside'>Outside</div>
			</div>
		)
		const trigger = screen.getByRole('button', { name: /Date view:/ })
		fireEvent.click(trigger)
		expect(trigger).toHaveAttribute('aria-expanded', 'true')

		// useClickOutside listens to mousedown, not click
		fireEvent.mouseDown(screen.getByTestId('outside'))
		expect(trigger).toHaveAttribute('aria-expanded', 'false')
	})

	// ── Selection callbacks ────────────────────────────────────────────────

	it('clicking "Live (current)" calls onChange("live") and closes dropdown', () => {
		const onChange = vi.fn()
		render(
			<DateSelector manifest={makeManifest()} selectedDate='2026-06-13' onChange={onChange} />
		)
		fireEvent.click(screen.getByRole('button', { name: /Date view:/ }))
		fireEvent.click(screen.getByText('Live (current)'))

		expect(onChange).toHaveBeenCalledOnce()
		expect(onChange).toHaveBeenCalledWith('live')
		expect(screen.getByRole('button', { name: /Date view:/ })).toHaveAttribute('aria-expanded', 'false')
	})

	it('clicking a historical snapshot option calls onChange(date) and closes dropdown', () => {
		const onChange = vi.fn()
		render(
			<DateSelector manifest={makeManifest()} selectedDate='live' onChange={onChange} />
		)
		fireEvent.click(screen.getByRole('button', { name: /Date view:/ }))
		// Labels are shown in dropdown list items
		const options = screen.getAllByRole('option')
		fireEvent.click(options[0])

		expect(onChange).toHaveBeenCalledOnce()
		// Most recent first — available reversed → '2026-06-14' is index 0
		expect(onChange).toHaveBeenCalledWith('2026-06-14')
		expect(screen.getByRole('button', { name: /Date view:/ })).toHaveAttribute('aria-expanded', 'false')
	})

	// ── Order ──────────────────────────────────────────────────────────────

	it('historical options appear in reverse order (most recent first)', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='live' onChange={vi.fn()} />
		)
		fireEvent.click(screen.getByRole('button', { name: /Date view:/ }))

		const options = screen.getAllByRole('option')
		expect(options).toHaveLength(3)
		// available = ['2026-06-12', '2026-06-13', '2026-06-14'], reversed:
		expect(options[0]).toHaveTextContent('Jun 14')
		expect(options[1]).toHaveTextContent('Jun 13')
		expect(options[2]).toHaveTextContent('Jun 12')
	})

	// ── aria-selected ──────────────────────────────────────────────────────

	it('active option has aria-selected="true" for the current selectedDate', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='2026-06-13' onChange={vi.fn()} />
		)
		fireEvent.click(screen.getByRole('button', { name: /Date view:/ }))

		const options = screen.getAllByRole('option')
		const selected = options.filter(o => o.getAttribute('aria-selected') === 'true')
		expect(selected).toHaveLength(1)
		expect(selected[0]).toHaveTextContent('Jun 13')
	})

	it('no option has aria-selected="true" when selectedDate is "live"', () => {
		render(
			<DateSelector manifest={makeManifest()} selectedDate='live' onChange={vi.fn()} />
		)
		fireEvent.click(screen.getByRole('button', { name: /Date view:/ }))

		const options = screen.getAllByRole('option')
		const selected = options.filter(o => o.getAttribute('aria-selected') === 'true')
		expect(selected).toHaveLength(0)
	})
})
