import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import OpponentCard from './OpponentCard'
import type { Opponent } from '../../types'

const baseOpp: Opponent = {
	opponent: 'Brazil',
	flag: '🇧🇷',
	fifaRank: 3,
	difficulty: 4,
	color: 'var(--amber)',
	label: 'Tough',
	pct: 55,
}

describe('OpponentCard', () => {
	it('renders team name and FIFA rank', () => {
		render(<OpponentCard opp={baseOpp} />)
		expect(screen.getByText('Brazil')).toBeInTheDocument()
		expect(screen.getByText('FIFA #3')).toBeInTheDocument()
	})

	it('renders difficulty label and pips', () => {
		render(<OpponentCard opp={baseOpp} />)
		expect(screen.getByText('Tough')).toBeInTheDocument()
		expect(document.querySelector('[aria-label="Difficulty 4 out of 5"]')).toBeTruthy()
	})

	it('shows percentage chance when pct is provided', () => {
		render(<OpponentCard opp={baseOpp} />)
		expect(screen.getByText('55% chance')).toBeInTheDocument()
		expect(screen.getByText('55% chance').textContent).toBe('55% chance')
	})

	it('renders compact variant', () => {
		const { container } = render(<OpponentCard opp={{ opponent: 'Brazil' }} compact />)
		expect(container.querySelector('[class*="cardCompact"]')).toBeTruthy()
	})

	it('renders without difficulty info gracefully', () => {
		render(<OpponentCard opp={{ opponent: 'Norway', flag: '🇳🇴' }} />)
		expect(screen.getByText('Norway')).toBeInTheDocument()
		// No difficulty label or pips should render
		expect(document.querySelector('[class*="diffRow"]')).toBeFalsy()
	})

	it('renders alt team when provided', () => {
		render(<OpponentCard opp={{ opponent: 'Germany', altTeam: 'Netherlands', altFlag: '🇳🇱' }} />)
		expect(screen.getByText('Germany')).toBeInTheDocument()
		expect(screen.getByText('Netherlands')).toBeInTheDocument()
	})

	it('renders pct probability even without difficulty', () => {
		render(<OpponentCard opp={{ opponent: 'Spain', pct: 30 }} />)
		expect(screen.getByText('30% chance')).toBeInTheDocument()
	})

	it('renders group tag and note', () => {
		render(<OpponentCard opp={{ opponent: 'France', group: 'D', note: 'If 2nd place' }} />)
		expect(screen.getByText('Grp D')).toBeInTheDocument()
		expect(screen.getByText('If 2nd place')).toBeInTheDocument()
	})

	it('renders likelyTeam over opponent when both present', () => {
		render(<OpponentCard opp={{ opponent: 'TBD', likelyTeam: 'Argentina', flag: '🇦🇷' }} />)
		expect(screen.getByText('Argentina')).toBeInTheDocument()
		expect(screen.queryByText('TBD')).toBeFalsy()
	})

	it('applies danger border at difficulty 5', () => {
		const { container } = render(<OpponentCard opp={{ opponent: 'England', difficulty: 5, color: 'var(--red)' }} />)
		expect(container.querySelector('[class*="borderDanger"]')).toBeTruthy()
	})

	it('renders top color bar when color is provided', () => {
		const { container } = render(<OpponentCard opp={baseOpp} />)
		expect(container.querySelector('[class*="topBar"]')).toBeTruthy()
	})
})
