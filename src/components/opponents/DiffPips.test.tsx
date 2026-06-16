import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DiffPips from './DiffPips'

/** Get pip children (not the container with class "pips") */
function getPipElements(container: HTMLElement) {
	const pipsContainer = container.firstElementChild
	return pipsContainer ? Array.from(pipsContainer.children) : []
}

describe('DiffPips', () => {
	it('renders 5 pips, all empty when level is 0', () => {
		const { container } = render(<DiffPips level={0} color="var(--amber)" />)
		const pips = getPipElements(container)
		expect(pips).toHaveLength(5)
		expect(pips.every(el => el.className.includes('pipEmpty'))).toBe(true)
	})

	it('renders 1 filled pip when level is 1', () => {
		const { container } = render(<DiffPips level={1} color="var(--amber)" />)
		const pips = getPipElements(container)
		expect(pips).toHaveLength(5)
		expect(pips[0].className).not.toContain('pipEmpty')
		expect(pips[1].className).toContain('pipEmpty')
	})

	it('renders all pips filled at max level', () => {
		const { container } = render(<DiffPips level={5} color="#ef4444" />)
		const pips = getPipElements(container)
		expect(pips.every(el => !el.className.includes('pipEmpty'))).toBe(true)
	})

	it('accepts custom max value', () => {
		const { container } = render(<DiffPips level={2} color="var(--amber)" max={3} />)
		const pips = getPipElements(container)
		expect(pips).toHaveLength(3)
	})

	it('has aria-label describing difficulty level', () => {
		const { container } = render(<DiffPips level={3} color="var(--amber)" />)
		expect(container.firstElementChild?.getAttribute('aria-label')).toBe('Difficulty 3 out of 5')
	})

	it('applies color as inline style to filled pips', () => {
		const { container } = render(<DiffPips level={2} color="#ff0000" />)
		const pips = getPipElements(container)
		// First 2 are filled, last 3 are empty
		expect((pips[0] as HTMLElement).style.background).toBe('rgb(255, 0, 0)')
		expect((pips[1] as HTMLElement).style.background).toBe('rgb(255, 0, 0)')
	})
})
