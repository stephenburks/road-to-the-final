import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import BracketNode from './BracketNode'

describe('BracketNode', () => {
	it('renders the icon text', () => {
		const { container } = render(
			<BracketNode bg="#000" border="#fff" color="#fff" shadow="none" icon="GS" />
		)
		expect(container.textContent).toBe('GS')
	})

	it('applies inline styles', () => {
		const { container } = render(
			<BracketNode bg="#111" border="#222" color="#333" shadow="0 0 5px red" icon="★" />
		)
		const node = container.firstElementChild as HTMLElement
		expect(node.style.background).toBe('rgb(17, 17, 17)')
		expect(node.style.color).toBe('rgb(51, 51, 51)')
		expect(node.style.boxShadow).toBe('0 0 5px red')
	})

	it('applies large class for X icon', () => {
		const { container } = render(
			<BracketNode bg="#000" border="#f00" color="#f00" shadow="none" icon="✕" />
		)
		expect(container.firstElementChild?.className).toContain('nodeLarge')
	})

	it('applies large class for check icon', () => {
		const { container } = render(
			<BracketNode bg="#000" border="#0f0" color="#0f0" shadow="none" icon="✓" />
		)
		expect(container.firstElementChild?.className).toContain('nodeLarge')
	})

	it('applies large class when color is #052e16 (current stage green)', () => {
		const { container } = render(
			<BracketNode bg="#000" border="#0f0" color="#052e16" shadow="0 0 14px green" icon="QF" />
		)
		expect(container.firstElementChild?.className).toContain('nodeLarge')
	})

	it('does not apply large class for normal stage icon', () => {
		const { container } = render(
			<BracketNode bg="#000" border="#fff" color="#a5b4fc" shadow="none" icon="SF" />
		)
		expect(container.firstElementChild?.className).not.toContain('nodeLarge')
	})

	it('is marked aria-hidden', () => {
		const { container } = render(
			<BracketNode bg="#000" border="#fff" color="#fff" shadow="none" icon="16" />
		)
		expect(container.firstElementChild?.getAttribute('aria-hidden')).toBe('true')
	})
})
