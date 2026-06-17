import { describe, it, expect } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import { GroupTable } from './GroupTable'
import type { GroupData } from '../../types'

function makeStanding(overrides: Partial<{
	pos: number
	teamId: string
	team: string
	flag: string
	played: number
	w: number
	d: number
	l: number
	gd: number
	pts: number
}> = {}) {
	return {
		pos: 1,
		teamId: 'usa',
		team: 'United States',
		flag: '🇺🇸',
		played: 0,
		w: 0,
		d: 0,
		l: 0,
		gf: 0,
		ga: 0,
		gd: 0,
		pts: 0,
		...overrides,
	}
}

function makeGroupData(overrides: Partial<GroupData> = {}): GroupData {
	return {
		standings: [
			makeStanding({ pos: 1, teamId: 'usa', team: 'United States', pts: 9, played: 3, w: 3 }),
			makeStanding({ pos: 2, teamId: 'germany', team: 'Germany', pts: 6, played: 3, w: 2, l: 1 }),
			makeStanding({ pos: 3, teamId: 'brazil', team: 'Brazil', pts: 3, played: 3, w: 1, l: 2 }),
			makeStanding({ pos: 4, teamId: 'france', team: 'France', pts: 0, played: 3, l: 3 }),
		],
		winProbabilities: {
			usa: 55,
			germany: 25,
			brazil: 15,
			france: 5,
		},
		...overrides,
	}
}

describe('GroupTable', () => {
	describe('header and structure', () => {
		it('renders the group letter in the header', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId={null} />)
			expect(screen.getByText('Group A')).toBeInTheDocument()
		})

		it('renders all column headers', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId={null} />)
			const table = screen.getByRole('table', { name: 'Group A standings' })
			expect(within(table).getByRole('columnheader', { name: 'Played' })).toBeInTheDocument()
			expect(within(table).getByRole('columnheader', { name: 'Won' })).toBeInTheDocument()
			expect(within(table).getByRole('columnheader', { name: 'Drawn' })).toBeInTheDocument()
			expect(within(table).getByRole('columnheader', { name: 'Lost' })).toBeInTheDocument()
			expect(within(table).getByRole('columnheader', { name: 'Goal difference' })).toBeInTheDocument()
			expect(within(table).getByRole('columnheader', { name: 'Points' })).toBeInTheDocument()
			expect(within(table).getByRole('columnheader', { name: 'Win probability' })).toBeInTheDocument()
		})

		it('renders a row for each team', () => {
			render(<GroupTable groupKey="B" groupData={makeGroupData()} highlightTeamId={null} />)
			expect(screen.getByText('United States')).toBeInTheDocument()
			expect(screen.getByText('Germany')).toBeInTheDocument()
			expect(screen.getByText('Brazil')).toBeInTheDocument()
			expect(screen.getByText('France')).toBeInTheDocument()
		})
	})

	describe('YOU badge', () => {
		it('shows YOU badge for the highlighted team', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId="usa" />)
			expect(screen.getByLabelText('Your selected team')).toBeInTheDocument()
			expect(screen.getByText('YOU')).toBeInTheDocument()
		})

		it('does not show YOU badge when highlightTeamId is null', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId={null} />)
			expect(screen.queryByText('YOU')).not.toBeInTheDocument()
		})

		it('shows YOU badge only for the matching team, not others', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId="germany" />)
			expect(screen.getAllByText('YOU')).toHaveLength(1)
		})

		it('marks the highlighted row with aria-current', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId="usa" />)
			const rows = screen.getAllByRole('row')
			const highlightedRow = rows.find(r => r.getAttribute('aria-current') === 'true')
			expect(highlightedRow).toBeTruthy()
			expect(within(highlightedRow!).getByText('United States')).toBeInTheDocument()
		})
	})

	describe('CLNCH (clinched) badge', () => {
		it('shows CLNCH badge when top-2 team has more pts than 3rd place max possible', () => {
			// 3rd place: 3 pts, played 3 games → maxPossible = 3 + 3*(3-3) = 3
			// 1st place: 9 pts > 3 → clinched
			// 2nd place: 6 pts > 3 → clinched
			const data = makeGroupData()
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			const clnchedBadges = screen.getAllByLabelText('Clinched advancement')
			expect(clnchedBadges).toHaveLength(2)
		})

		it('does not show CLNCH badge when top-2 team cannot be sure yet', () => {
			// 3rd place: 3 pts, played 1 game → maxPossible = 3 + 3*(3-1) = 9
			// 1st place: 6 pts, not > 9
			const data = makeGroupData({
				standings: [
					makeStanding({ pos: 1, teamId: 'usa', team: 'United States', pts: 6, played: 2, w: 2 }),
					makeStanding({ pos: 2, teamId: 'germany', team: 'Germany', pts: 4, played: 2, w: 1, d: 1 }),
					makeStanding({ pos: 3, teamId: 'brazil', team: 'Brazil', pts: 3, played: 1, w: 1 }),
					makeStanding({ pos: 4, teamId: 'france', team: 'France', pts: 0, played: 1, l: 1 }),
				],
			})
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			expect(screen.queryByLabelText('Clinched advancement')).not.toBeInTheDocument()
		})

		it('does not show CLNCH badge for teams in pos > 2 even if they have high points', () => {
			// Make 3rd place have many points but still pos 3 — should not get CLNCH
			const data = makeGroupData({
				standings: [
					makeStanding({ pos: 1, teamId: 'usa', team: 'United States', pts: 9, played: 3, w: 3 }),
					makeStanding({ pos: 2, teamId: 'germany', team: 'Germany', pts: 7, played: 3, w: 2, d: 1 }),
					makeStanding({ pos: 3, teamId: 'brazil', team: 'Brazil', pts: 6, played: 3, w: 2, l: 1 }),
					makeStanding({ pos: 4, teamId: 'france', team: 'France', pts: 0, played: 3, l: 3 }),
				],
			})
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			// 3rd max possible = 6 + 3*(3-3) = 6, pts 1=9>6 ✓, pts 2=7>6 ✓
			const badges = screen.getAllByLabelText('Clinched advancement')
			for (const badge of badges) {
				// badge should be in the row for pos 1 or 2, not pos 3
				const row = badge.closest('tr')
				expect(within(row!).queryByText('Brazil')).not.toBeInTheDocument()
			}
		})
	})

	describe('ELIM badge', () => {
		it('shows ELIM badge for teams in eliminatedTeamIds', () => {
			render(
				<GroupTable
					groupKey="A"
					groupData={makeGroupData()}
					highlightTeamId={null}
					eliminatedTeamIds={new Set(['brazil', 'france'])}
				/>
			)
			expect(screen.getAllByLabelText('Eliminated')).toHaveLength(2)
			expect(screen.getAllByText('ELIM')).toHaveLength(2)
		})

		it('does not show ELIM badge when eliminatedTeamIds is undefined', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId={null} />)
			expect(screen.queryByText('ELIM')).not.toBeInTheDocument()
		})

		it('does not show ELIM badge for teams not in the eliminated set', () => {
			render(
				<GroupTable
					groupKey="A"
					groupData={makeGroupData()}
					highlightTeamId={null}
					eliminatedTeamIds={new Set(['france'])}
				/>
			)
			const elimBadges = screen.getAllByText('ELIM')
			expect(elimBadges).toHaveLength(1)
			expect(elimBadges[0].closest('tr')).toHaveTextContent('France')
		})
	})

	describe('win probability', () => {
		it('renders a progressbar for each team with correct aria-valuenow', () => {
			const data = makeGroupData()
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			const bars = screen.getAllByRole('progressbar')
			expect(bars).toHaveLength(4)
			const valuenows = bars.map(b => Number(b.getAttribute('aria-valuenow')))
			expect(valuenows).toContain(55)
			expect(valuenows).toContain(25)
			expect(valuenows).toContain(15)
			expect(valuenows).toContain(5)
		})

		it('renders win probability percentage labels', () => {
			render(<GroupTable groupKey="A" groupData={makeGroupData()} highlightTeamId={null} />)
			expect(screen.getByText('55%')).toBeInTheDocument()
			expect(screen.getByText('25%')).toBeInTheDocument()
		})

		it('defaults win probability to 0% for teams with no entry in winProbabilities', () => {
			const data = makeGroupData({ winProbabilities: {} })
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			const bars = screen.getAllByRole('progressbar')
			for (const bar of bars) {
				expect(bar.getAttribute('aria-valuenow')).toBe('0')
			}
		})
	})

	describe('stat cells', () => {
		it('renders positive goal difference with a + prefix', () => {
			const data = makeGroupData({
				standings: [
					makeStanding({ pos: 1, teamId: 'usa', team: 'United States', gd: 4, played: 2, w: 2, pts: 6 }),
					makeStanding({ pos: 2, teamId: 'germany', team: 'Germany', gd: 0, played: 2, w: 1, d: 1, l: 0, pts: 4 }),
					makeStanding({ pos: 3, teamId: 'brazil', team: 'Brazil', gd: -1, played: 2, l: 2, pts: 0 }),
					makeStanding({ pos: 4, teamId: 'france', team: 'France', gd: -3, played: 2, l: 2, pts: 0 }),
				],
			})
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			expect(screen.getByText('+4')).toBeInTheDocument()
			expect(screen.getByText('+0')).toBeInTheDocument()
			expect(screen.getByText('-1')).toBeInTheDocument()
		})
	})

	describe('edge cases', () => {
		it('renders without crashing when standings is empty', () => {
			const data: GroupData = { standings: [], winProbabilities: {} }
			render(<GroupTable groupKey="Z" groupData={data} highlightTeamId={null} />)
			expect(screen.getByText('Group Z')).toBeInTheDocument()
		})

		it('renders without crashing when fewer than 3 teams are in standings', () => {
			const data: GroupData = {
				standings: [
					makeStanding({ pos: 1, teamId: 'usa', team: 'United States', pts: 3, played: 1, w: 1 }),
					makeStanding({ pos: 2, teamId: 'germany', team: 'Germany', pts: 0, played: 1, l: 1 }),
				],
				winProbabilities: { usa: 70, germany: 30 },
			}
			render(<GroupTable groupKey="A" groupData={data} highlightTeamId={null} />)
			// With < 3 teams thirdMaxPossible is 0, so pts > 0 clinches
			// USA has 3 pts > 0, should show clinched
			expect(screen.getByLabelText('Clinched advancement')).toBeInTheDocument()
		})
	})
})
