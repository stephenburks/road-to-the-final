import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import Roster from './Roster'
import type { RosterPlayer } from '../types'

function makePlayer(overrides: Partial<RosterPlayer> = {}): RosterPlayer {
	return {
		id: '1',
		displayName: 'Christian Pulisic',
		shortName: 'C. Pulisic',
		jersey: '10',
		position: { abbreviation: 'F', name: 'Forward' },
		age: 27,
		statistics: {
			appearances: 3,
			goals: 0,
			assists: 1,
			shots: 5,
			shotsOnTarget: 2,
			foulsCommitted: 1,
			foulsSuffered: 2,
			yellowCards: 0,
			redCards: 0,
			saves: 0,
			goalsConceded: 0,
		},
		...overrides,
	}
}

describe('Roster', () => {
	// ── Null / no-op state ────────────────────────────────────────────────

	it('returns null when players is null, loading is false, and error is false', () => {
		const { container } = render(<Roster players={null} loading={false} error={false} />)
		expect(container.firstChild).toBeNull()
	})

	it('returns null when players is null and neither loading nor error is set', () => {
		const { container } = render(<Roster players={null} loading={false} />)
		expect(container.firstChild).toBeNull()
	})

	// ── Loading skeleton ──────────────────────────────────────────────────

	it('shows the loading status region when loading is true and players is null', () => {
		render(<Roster players={null} loading={true} />)
		expect(screen.getByRole('status', { name: 'Loading roster' })).toBeInTheDocument()
	})

	it('renders six skeleton cards while loading', () => {
		render(<Roster players={null} loading={true} />)
		const grid = screen.getByRole('status', { name: 'Loading roster' })
		// Each skeleton card contains skelJersey, skelHeadshot, skelName children
		expect(grid.children).toHaveLength(6)
	})

	it('does not show a loading skeleton when players have arrived', () => {
		render(<Roster players={[makePlayer()]} loading={false} />)
		expect(screen.queryByRole('status', { name: 'Loading roster' })).not.toBeInTheDocument()
	})

	// ── Error state ───────────────────────────────────────────────────────

	it('shows the error message when error is true', () => {
		render(<Roster players={null} loading={false} error={true} />)
		expect(screen.getByText("Couldn't load squad data.")).toBeInTheDocument()
	})

	it('does not show the error message when error is false', () => {
		render(<Roster players={[makePlayer()]} loading={false} error={false} />)
		expect(screen.queryByText("Couldn't load squad data.")).not.toBeInTheDocument()
	})

	// ── Position grouping ─────────────────────────────────────────────────

	it('renders the Goalkeepers group heading when a goalkeeper is in the roster', () => {
		const gk = makePlayer({ id: 'gk1', position: { abbreviation: 'G', name: 'Goalkeeper' } })
		render(<Roster players={[gk]} loading={false} />)
		expect(screen.getByText(/Goalkeepers/)).toBeInTheDocument()
	})

	it('renders the Defenders group heading', () => {
		const def = makePlayer({ id: 'def1', position: { abbreviation: 'D', name: 'Defender' } })
		render(<Roster players={[def]} loading={false} />)
		expect(screen.getByText(/Defenders/)).toBeInTheDocument()
	})

	it('renders the Midfielders group heading', () => {
		const mid = makePlayer({ id: 'mid1', position: { abbreviation: 'M', name: 'Midfielder' } })
		render(<Roster players={[mid]} loading={false} />)
		expect(screen.getByText(/Midfielders/)).toBeInTheDocument()
	})

	it('renders the Forwards group heading', () => {
		const fwd = makePlayer({ id: 'fwd1', position: { abbreviation: 'F', name: 'Forward' } })
		render(<Roster players={[fwd]} loading={false} />)
		expect(screen.getByText(/Forwards/)).toBeInTheDocument()
	})

	it('does not render a group heading when no players belong to that position', () => {
		const fwd = makePlayer({ id: 'fwd1', position: { abbreviation: 'F', name: 'Forward' } })
		render(<Roster players={[fwd]} loading={false} />)
		expect(screen.queryByText(/Goalkeepers/)).not.toBeInTheDocument()
		expect(screen.queryByText(/Defenders/)).not.toBeInTheDocument()
		expect(screen.queryByText(/Midfielders/)).not.toBeInTheDocument()
	})

	it('renders all four position groups when the roster contains all positions', () => {
		const players = [
			makePlayer({ id: 'gk1', position: { abbreviation: 'G', name: 'Goalkeeper' } }),
			makePlayer({ id: 'def1', position: { abbreviation: 'D', name: 'Defender' } }),
			makePlayer({ id: 'mid1', position: { abbreviation: 'M', name: 'Midfielder' } }),
			makePlayer({ id: 'fwd1', position: { abbreviation: 'F', name: 'Forward' } }),
		]
		render(<Roster players={players} loading={false} />)
		expect(screen.getByText(/Goalkeepers/)).toBeInTheDocument()
		expect(screen.getByText(/Defenders/)).toBeInTheDocument()
		expect(screen.getByText(/Midfielders/)).toBeInTheDocument()
		expect(screen.getByText(/Forwards/)).toBeInTheDocument()
	})

	it('shows the player count in the group heading', () => {
		const players = [
			makePlayer({ id: 'fwd1', displayName: 'Player One', shortName: 'P. One', position: { abbreviation: 'F', name: 'Forward' } }),
			makePlayer({ id: 'fwd2', displayName: 'Player Two', shortName: 'P. Two', position: { abbreviation: 'F', name: 'Forward' } }),
		]
		render(<Roster players={players} loading={false} />)
		// The heading contains "Forwards" and the count "2" as sibling elements
		const heading = screen.getByText(/Forwards/)
		expect(heading.closest('h3')?.textContent).toContain('2')
	})

	// ── Player name rendering ─────────────────────────────────────────────

	it('renders shortName when available', () => {
		const p = makePlayer({ shortName: 'C. Pulisic', displayName: 'Christian Pulisic' })
		render(<Roster players={[p]} loading={false} />)
		expect(screen.getByText('C. Pulisic')).toBeInTheDocument()
	})

	it('falls back to displayName when shortName is empty', () => {
		const p = makePlayer({ shortName: '', displayName: 'Christian Pulisic' })
		render(<Roster players={[p]} loading={false} />)
		expect(screen.getByText('Christian Pulisic')).toBeInTheDocument()
	})

	// ── Jersey number ─────────────────────────────────────────────────────

	it('renders the jersey number for each player', () => {
		const p = makePlayer({ jersey: '10' })
		render(<Roster players={[p]} loading={false} />)
		expect(screen.getByText('10')).toBeInTheDocument()
	})

	// ── Goal badge ────────────────────────────────────────────────────────

	it('shows a goal badge when a player has scored', () => {
		const p = makePlayer({ statistics: { ...makePlayer().statistics, goals: 3 } })
		render(<Roster players={[p]} loading={false} />)
		expect(screen.getByLabelText('3 goals')).toBeInTheDocument()
		expect(screen.getByLabelText('3 goals').textContent).toBe('3')
	})

	it('does not show a goal badge when a player has zero goals', () => {
		const p = makePlayer({ statistics: { ...makePlayer().statistics, goals: 0 } })
		render(<Roster players={[p]} loading={false} />)
		expect(screen.queryByLabelText(/goals/)).not.toBeInTheDocument()
	})

	it('shows individual goal badges for multiple scorers', () => {
		const players = [
			makePlayer({ id: 'p1', statistics: { ...makePlayer().statistics, goals: 2 } }),
			makePlayer({ id: 'p2', statistics: { ...makePlayer().statistics, goals: 5 } }),
		]
		render(<Roster players={players} loading={false} />)
		expect(screen.getByLabelText('2 goals')).toBeInTheDocument()
		expect(screen.getByLabelText('5 goals')).toBeInTheDocument()
	})

	// ── Section structure ─────────────────────────────────────────────────

	it('renders the Squad section heading', () => {
		render(<Roster players={[makePlayer()]} loading={false} />)
		expect(screen.getByText('Squad')).toBeInTheDocument()
	})

	it('renders each player card with listitem role', () => {
		const players = [
			makePlayer({ id: 'p1' }),
			makePlayer({ id: 'p2', shortName: 'T. Adams', displayName: 'Tyler Adams' }),
		]
		render(<Roster players={players} loading={false} />)
		expect(screen.getAllByRole('listitem')).toHaveLength(2)
	})
})
