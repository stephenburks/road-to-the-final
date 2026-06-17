import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import DiffPips from './DiffPips'

function getPipElements(container: HTMLElement) {
	const pipsContainer = container.firstElementChild
	return pipsContainer ? Array.from(pipsContainer.children) : []
}

describe('DiffPips', () => {
	it('renders 5 pips, all empty when level is 0', () => {
		const { container } = render(<DiffPips level={0} />)
		const pips = getPipElements(container)
		expect(pips).toHaveLength(5)
		expect(pips.every(el => el.className.includes('pipEmpty'))).toBe(true)
	})

	it('renders 1 filled pip when level is 1', () => {
		const { container } = render(<DiffPips level={1} />)
		const pips = getPipElements(container)
		expect(pips).toHaveLength(5)
		expect(pips[0].className).not.toContain('pipEmpty')
		expect(pips[0].className).toContain('pipActive')
		expect(pips[1].className).toContain('pipEmpty')
	})

	it('renders all pips filled at max level', () => {
		const { container } = render(<DiffPips level={5} />)
		const pips = getPipElements(container)
		expect(pips.every(el => !el.className.includes('pipEmpty'))).toBe(true)
	})

	it('accepts custom max value', () => {
		const { container } = render(<DiffPips level={2} max={3} />)
		const pips = getPipElements(container)
		expect(pips).toHaveLength(3)
	})

	it('has aria-label describing difficulty level', () => {
		const { container } = render(<DiffPips level={3} />)
		expect(container.firstElementChild?.getAttribute('aria-label')).toBe('Difficulty 3 out of 5')
	})

	it('sets data-diff attribute for CSS color targeting', () => {
		const { container } = render(<DiffPips level={4} />)
		expect(container.firstElementChild?.getAttribute('data-diff')).toBe('4')
	})
})
