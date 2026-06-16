import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import MatchupMatrix from './MatchupMatrix'
import type { Opponent, Team, AppData } from '../../types'

const mockTeam: Team = {
	id: 'usa',
	name: 'USA',
	flag: '🇺🇸',
	group: 'A',
	confederation: 'CONCACAF',
	fifaRank: 14,
	eliminated: false,
	currentStage: 'r16',
	groupResults: [],
	advanceProbabilities: { r32: 100, r16: 70, qf: 40, sf: 20, final: 5, winner: 2, source: 'market' },
	path: { group_stage: { status: 'done' }, r32: { status: 'done' }, r16: { status: 'active' }, qf: { status: 'upcoming' }, sf: { status: 'future' }, final: { status: 'future' } },
	possibleOpponents: { r32: [], r16: [] },
}

const mockData: AppData = {
	lastUpdated: '',
	snapshotDate: '',
	isHistorical: false,
	tournament: { name: 'World Cup', currentStage: 'r16', stages: {} as AppData['tournament']['stages'] },
	groups: {},
	teams: [],
}

const makeOpp = (overrides: Partial<Opponent> = {}): Opponent => ({
	opponent: 'Team',
	pct: 50,
	...overrides,
})

describe('MatchupMatrix', () => {
	it('renders sorted rows by pct descending', () => {
		const flatList: Opponent[] = [
			makeOpp({ opponent: 'Brazil', pct: 30 }),
			makeOpp({ opponent: 'Germany', pct: 55 }),
			makeOpp({ opponent: 'Spain', pct: 15 }),
		]
		render(<MatchupMatrix flatList={flatList} team={mockTeam} maxPct={55} data={mockData} />)
		const rows = document.querySelectorAll('[class*="matchupRow"]')
		expect(rows).toHaveLength(3)
		// First row should be highest pct (Germany 55%)
		expect(rows[0].textContent).toContain('Germany')
		expect(rows[0].textContent).toContain('55%')
		// Last row should be lowest
		expect(rows[2].textContent).toContain('Spain')
		expect(rows[2].textContent).toContain('15%')
	})

	it('filters out opponents without pct', () => {
		const flatList: Opponent[] = [
			makeOpp({ opponent: 'Brazil', pct: 30 }),
			makeOpp({ opponent: 'TBD', pct: null }),
			makeOpp({ opponent: 'Spain', pct: 15 }),
		]
		render(<MatchupMatrix flatList={flatList} team={mockTeam} maxPct={30} data={mockData} />)
		const rows = document.querySelectorAll('[class*="matchupRow"]')
		expect(rows).toHaveLength(2)
	})

	it('renders top 4 callout cards', () => {
		const flatList: Opponent[] = Array.from({ length: 6 }, (_, i) =>
			makeOpp({ opponent: `Team ${i + 1}`, pct: 60 - i * 8 })
		)
		render(<MatchupMatrix flatList={flatList} team={mockTeam} maxPct={60} data={mockData} />)
		const callouts = document.querySelectorAll('[class*="calloutCard"]')
		expect(callouts).toHaveLength(4)
	})

	it('handles empty flatList', () => {
		const { container } = render(
			<MatchupMatrix flatList={[]} team={mockTeam} maxPct={1} data={mockData} />
		)
		expect(container.querySelector('[class*="matchupRow"]')).toBeFalsy()
		expect(container.querySelector('[class*="calloutCard"]')).toBeFalsy()
	})

	it('marks top callout card with special class', () => {
		const flatList: Opponent[] = [
			makeOpp({ opponent: 'Brazil', pct: 55 }),
			makeOpp({ opponent: 'Germany', pct: 30 }),
		]
		render(<MatchupMatrix flatList={flatList} team={mockTeam} maxPct={55} data={mockData} />)
		const callouts = document.querySelectorAll('[class*="calloutCard"]')
		expect(callouts[0].className).toContain('calloutCardTop')
		expect(callouts[1].className).not.toContain('calloutCardTop')
	})

	it('renders progress bars with correct aria attributes', () => {
		const flatList: Opponent[] = [makeOpp({ opponent: 'Brazil', pct: 50 })]
		render(<MatchupMatrix flatList={flatList} team={mockTeam} maxPct={50} data={mockData} />)
		const bar = document.querySelector('[role="progressbar"]')
		expect(bar).toBeTruthy()
		expect(bar?.getAttribute('aria-valuenow')).toBe('50')
	})
})
