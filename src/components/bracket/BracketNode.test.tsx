import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BracketNode from './BracketNode'

describe('BracketNode', () => {
	it('renders the icon text via data attribute', () => {
		const { container } = render(<BracketNode state="default" icon="GS" />)
		expect(container.firstElementChild?.getAttribute('data-icon')).toBe('GS')
	})

	it('sets data-state attribute for CSS-driven styling', () => {
		const { container } = render(<BracketNode state="current" icon="QF" />)
		expect(container.firstElementChild?.getAttribute('data-state')).toBe('current')
	})

	it('applies large class for elim state', () => {
		const { container } = render(<BracketNode state="elim" icon="✕" />)
		expect(container.firstElementChild?.className).toContain('nodeLarge')
	})

	it('applies large class for done state', () => {
		const { container } = render(<BracketNode state="done" icon="✓" />)
		expect(container.firstElementChild?.className).toContain('nodeLarge')
	})

	it('applies large class for current state', () => {
		const { container } = render(<BracketNode state="current" icon="QF" />)
		expect(container.firstElementChild?.className).toContain('nodeLarge')
	})

	it('does not apply large class for active or default state', () => {
		const { container } = render(<BracketNode state="active" icon="SF" />)
		expect(container.firstElementChild?.className).not.toContain('nodeLarge')
	})

	it('is marked aria-hidden', () => {
		const { container } = render(<BracketNode state="default" icon="16" />)
		expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
	})
})
