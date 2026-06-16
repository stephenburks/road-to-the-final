import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import BracketCard from './BracketCard'
import type { CardStyle } from './bracketStyles'

const baseCard: CardStyle = {
	bg: 'var(--green-lo)',
	border: 'var(--green-b)',
	titleColor: '#86efac',
	detColor: 'var(--green)',
}

describe('BracketCard', () => {
	it('renders stage label', () => {
		render(<BracketCard path={null} card={baseCard} isAct={false} stage="r16" />)
		expect(screen.getByText('Round of 16')).toBeInTheDocument()
	})

	it('renders path city and date', () => {
		render(
			<BracketCard
				path={{ status: 'active', city: 'Los Angeles', date: '2026-07-15T12:00:00Z' }}
				card={baseCard}
				isAct={false}
				stage="r16"
			/>
		)
		expect(screen.getByText('Los Angeles')).toBeInTheDocument()
		// formatDate should produce something like 'Jul 15' (timezone-dependent)
		expect(screen.getByText(/Jul 1[45]/)).toBeInTheDocument()
	})

	it('renders em-dash for missing path fields', () => {
		render(<BracketCard path={null} card={baseCard} isAct={false} stage="qf" />)
		const dashes = screen.getAllByText('—')
		expect(dashes).toHaveLength(3) // date, city, detail
	})

	it('renders detail from path.detail', () => {
		render(
			<BracketCard
				path={{ status: 'active', detail: 'Qualified' }}
				card={baseCard}
				isAct={false}
				stage="r32"
			/>
		)
		expect(screen.getByText('Qualified')).toBeInTheDocument()
	})

	it('falls back to opponentDesc when detail is missing', () => {
		render(
			<BracketCard
				path={{ status: 'upcoming', opponentDesc: 'Winner Group B' }}
				card={baseCard}
				isAct={false}
				stage="r16"
			/>
		)
		expect(screen.getByText('Winner Group B')).toBeInTheDocument()
	})

	it('shows conditional badge when path.conditional is true', () => {
		render(
			<BracketCard
				path={{ status: 'active', conditional: true, conditionNote: 'Based on position' }}
				card={baseCard}
				isAct={false}
				stage="qf"
			/>
		)
		expect(screen.getByText('Conditional')).toBeInTheDocument()
		const condEl = screen.getByLabelText('Based on position')
		expect(condEl).toBeTruthy()
	})

	it('does not show conditional badge when path.conditional is false', () => {
		render(
			<BracketCard
				path={{ status: 'active' }}
				card={baseCard}
				isAct={false}
				stage="sf"
			/>
		)
		expect(screen.queryByText('Conditional')).toBeFalsy()
	})

	it('applies active city class when isAct is true', () => {
		const { container } = render(
			<BracketCard
				path={{ status: 'active', city: 'New York' }}
				card={baseCard}
				isAct={true}
				stage="sf"
			/>
		)
		expect(container.querySelector('[class*="cardCityActive"]')).toBeTruthy()
	})

	it('applies inline styles from card prop', () => {
		const { container } = render(
			<BracketCard
				path={null}
				card={{ bg: '#123', border: '#456', titleColor: '#789', detColor: '#abc' }}
				isAct={false}
				stage="final"
			/>
		)
		const cardEl = container.firstElementChild as HTMLElement
		expect(cardEl.style.background).toBe('rgb(17, 34, 51)')
	})
})
