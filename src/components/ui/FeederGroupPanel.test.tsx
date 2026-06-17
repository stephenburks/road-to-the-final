import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import FeederGroupPanel from './FeederGroupPanel'
import type { GroupData } from '../../types'

function makeGroupData(overrides: Partial<GroupData> = {}): GroupData {
	return {
		standings: [
			{ pos: 1, teamId: 'brazil', team: 'Brazil', flag: '🇧🇷', played: 3, w: 2, d: 1, l: 0, gf: 5, ga: 2, gd: 3, pts: 7 },
			{ pos: 2, teamId: 'germany', team: 'Germany', flag: '🇩🇪', played: 3, w: 1, d: 2, l: 0, gf: 4, ga: 3, gd: 1, pts: 5 },
			{ pos: 3, teamId: 'france', team: 'France', flag: '🇫🇷', played: 3, w: 1, d: 0, l: 2, gf: 3, ga: 4, gd: -1, pts: 3 },
			{ pos: 4, teamId: 'mexico', team: 'Mexico', flag: '🇲🇽', played: 3, w: 0, d: 1, l: 2, gf: 2, ga: 5, gd: -3, pts: 1 },
		],
		winProbabilities: { brazil: 40, germany: 30, france: 20, mexico: 10 },
		...overrides,
	}
}

function makeFeeder(keyOverride = 'B', groupOverride?: Partial<GroupData>) {
	return { key: keyOverride, group: makeGroupData(groupOverride) }
}

describe('FeederGroupPanel', () => {
	// ── Rendering ─────────────────────────────────────────────────────────

	it('renders the panel with the group letter in the header', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Winner of Group B advances"
			/>
		)
		expect(screen.getByText('Group B')).toBeInTheDocument()
	})

	it('renders a different group letter when feeder key changes', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('G')}
				explanation="Winner of Group G advances"
			/>
		)
		expect(screen.getByText('Group G')).toBeInTheDocument()
	})

	it('renders all team names from feeder.group.standings', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder group info"
			/>
		)
		expect(screen.getByText('Brazil')).toBeInTheDocument()
		expect(screen.getByText('Germany')).toBeInTheDocument()
		expect(screen.getByText('France')).toBeInTheDocument()
		expect(screen.getByText('Mexico')).toBeInTheDocument()
	})

	it('renders the explanation text', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Winner of Group B will face you in the R16"
			/>
		)
		expect(screen.getByText('Winner of Group B will face you in the R16')).toBeInTheDocument()
	})

	// ── YOU badge — FeederGroupPanel passes highlightTeamId={null} to GroupTable ──

	it('does not show a YOU badge because FeederGroupPanel always passes highlightTeamId as null', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
			/>
		)
		expect(screen.queryByText('YOU')).not.toBeInTheDocument()
	})

	// ── eliminatedTeamIds passthrough ─────────────────────────────────────

	it('shows ELIM badges for teams in eliminatedTeamIds', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
				eliminatedTeamIds={new Set(['france', 'mexico'])}
			/>
		)
		expect(screen.getAllByText('ELIM')).toHaveLength(2)
	})

	it('shows no ELIM badges when eliminatedTeamIds is undefined', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
			/>
		)
		expect(screen.queryByText('ELIM')).not.toBeInTheDocument()
	})

	it('shows no ELIM badges when eliminatedTeamIds is an empty set', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
				eliminatedTeamIds={new Set()}
			/>
		)
		expect(screen.queryByText('ELIM')).not.toBeInTheDocument()
	})

	it('shows ELIM badge only for the eliminated team, not others', () => {
		render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
				eliminatedTeamIds={new Set(['germany'])}
			/>
		)
		const elimBadges = screen.getAllByText('ELIM')
		expect(elimBadges).toHaveLength(1)
		expect(elimBadges[0].closest('tr')).toHaveTextContent('Germany')
	})

	// ── marginTop style ───────────────────────────────────────────────────

	it('applies marginTop style when the prop is provided', () => {
		const { container } = render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
				marginTop={24}
			/>
		)
		const panel = container.firstChild as HTMLElement
		expect(panel.style.marginTop).toBe('24px')
	})

	it('does not apply inline marginTop style when the prop is omitted', () => {
		const { container } = render(
			<FeederGroupPanel
				feeder={makeFeeder('B')}
				explanation="Feeder"
			/>
		)
		const panel = container.firstChild as HTMLElement
		expect(panel.style.marginTop).toBe('')
	})
})
