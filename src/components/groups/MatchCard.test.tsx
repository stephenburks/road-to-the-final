import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import MatchCard from './MatchCard'
import type { GroupMatch, Team, Card } from '../../types'

// ── Factories ──────────────────────────────────────────────────────────────

function makeNeutralProps(overrides: Record<string, unknown> = {}) {
	return {
		mode: 'neutral' as const,
		homeTeam: 'USA',
		homeFlag: '🇺🇸',
		homeId: 'usa',
		awayTeam: 'Germany',
		awayFlag: '🇩🇪',
		awayId: 'ger',
		score: null,
		status: 'upcoming' as const,
		date: '2026-06-15',
		homeScorers: [],
		awayScorers: [],
		homeCards: [],
		awayCards: [],
		...overrides,
	}
}

function makeGroupMatch(overrides: Partial<GroupMatch> = {}): GroupMatch {
	return {
		matchday: 1,
		opponent: 'Mexico',
		opponentFlag: '🇲🇽',
		result: null,
		score: null,
		date: '2026-06-15',
		venue: 'SoFi Stadium',
		scorers: [],
		cards: [],
		...overrides,
	}
}

function makeTeam(name: string, groupResults: GroupMatch[] = []): Team {
	return {
		id: name.toLowerCase(),
		name,
		flag: '🏴',
		group: 'A',
		confederation: 'CONCACAF',
		fifaRank: 10,
		eliminated: false,
		currentStage: 'group_stage',
		groupResults,
		advanceProbabilities: { r32: 80, r16: 50, qf: 25, sf: 10, final: 3, winner: 1, source: 'market' },
		path: {
			group_stage: { status: 'active' },
			r32: { status: 'upcoming' },
			r16: { status: 'future' },
			qf: { status: 'future' },
			sf: { status: 'future' },
			final: { status: 'future' },
		},
		possibleOpponents: { r32: [], r16: [] },
	}
}

// ── Neutral mode ───────────────────────────────────────────────────────────

describe('MatchCard — neutral mode', () => {
	it('renders both team names', () => {
		render(<MatchCard {...makeNeutralProps()} />)
		expect(screen.getAllByText('USA').length).toBeGreaterThanOrEqual(1)
		expect(screen.getAllByText('Germany').length).toBeGreaterThanOrEqual(1)
	})

	it('shows "FT" badge for finished matches', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'finished' })} />)
		expect(screen.getByText('FT')).toBeInTheDocument()
	})

	it('shows "LIVE" badge for in_progress matches without clock', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'in_progress' })} />)
		expect(screen.getByText('LIVE')).toBeInTheDocument()
	})

	it('shows "LIVE" badge with clock when clock prop is set', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'in_progress', clock: "67'" })} />)
		expect(screen.getByText("LIVE 67'")).toBeInTheDocument()
	})

	it('shows "Upcoming" badge for upcoming matches', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'upcoming' })} />)
		expect(screen.getByText('Upcoming')).toBeInTheDocument()
	})

	it('shows score when provided', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'finished', score: '2-1' })} />)
		expect(screen.getByLabelText('Score: 2-1')).toBeInTheDocument()
	})

	it('shows broadcasters when broadcasts is non-empty and match is not finished', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'upcoming', broadcasts: ['FOX', 'Telemundo'] })} />)
		expect(screen.getByText('FOX / Telemundo')).toBeInTheDocument()
	})

	it('does not show broadcasters for finished matches', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'finished', broadcasts: ['FOX', 'Telemundo'] })} />)
		expect(screen.queryByText('FOX / Telemundo')).not.toBeInTheDocument()
	})

	it('shows venue for upcoming matches', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'upcoming', venue: 'MetLife Stadium' })} />)
		expect(screen.getByText('MetLife Stadium')).toBeInTheDocument()
	})

	it('does not show venue for finished matches', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'finished', venue: 'MetLife Stadium' })} />)
		expect(screen.queryByText('MetLife Stadium')).not.toBeInTheDocument()
	})

	it('renders scorer list for home team when homeScorers is non-empty', () => {
		render(<MatchCard {...makeNeutralProps({
			status: 'finished',
			homeScorers: ["Pulisic 45'"],
		})} />)
		const list = screen.getByRole('list', { name: 'USA goal scorers' })
		expect(within(list).getByText("Pulisic 45'")).toBeInTheDocument()
	})

	it('renders scorer list for away team when awayScorers is non-empty', () => {
		render(<MatchCard {...makeNeutralProps({
			status: 'finished',
			awayScorers: ["Müller 78'"],
		})} />)
		const list = screen.getByRole('list', { name: 'Germany goal scorers' })
		expect(within(list).getByText("Müller 78'")).toBeInTheDocument()
	})

	it('does not render scorer list when scorers array is empty', () => {
		render(<MatchCard {...makeNeutralProps({ status: 'finished' })} />)
		expect(screen.queryByRole('list', { name: 'USA goal scorers' })).not.toBeInTheDocument()
	})

	it('renders yellow card sr-only text in CardList', () => {
		const cards: Card[] = [{ player: 'Adams', minute: "45'", type: 'yellow' }]
		render(<MatchCard {...makeNeutralProps({ status: 'finished', homeCards: cards })} />)
		expect(screen.getByText(/Yellow card:/)).toBeInTheDocument()
	})

	it('renders red card sr-only text in CardList', () => {
		const cards: Card[] = [{ player: 'McKennie', minute: "72'", type: 'red' }]
		render(<MatchCard {...makeNeutralProps({ status: 'finished', homeCards: cards })} />)
		expect(screen.getByText(/Red card:/)).toBeInTheDocument()
	})
})

// ── Team mode ──────────────────────────────────────────────────────────────

describe('MatchCard — team mode', () => {
	it('renders opponent name', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ opponent: 'Mexico' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByText('Mexico')).toBeInTheDocument()
	})

	it('shows "W" badge for a won match', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: 'W', score: '2-0' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByLabelText('Win')).toBeInTheDocument()
		expect(screen.getByLabelText('Win')).toHaveTextContent('W')
	})

	it('shows "D" badge for a drawn match', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: 'D', score: '1-1' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByLabelText('Draw')).toHaveTextContent('D')
	})

	it('shows "L" badge for a lost match', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: 'L', score: '0-1' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByLabelText('Loss')).toHaveTextContent('L')
	})

	it('shows "TBD" badge when match has no result and no score', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: null, score: null })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByLabelText('To be played')).toHaveTextContent('TBD')
	})

	it('shows score from match.score when set', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: 'W', score: '3-1' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByLabelText('Score: 3-1')).toBeInTheDocument()
	})

	it('overrides match.score with liveData.score when liveData is provided', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: null, score: '1-0' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
				liveData={{ score: '2-0', clock: "55'", status: 'IN_PROGRESS' }}
			/>
		)
		expect(screen.getByLabelText('Score: 2-0')).toBeInTheDocument()
		expect(screen.queryByLabelText('Score: 1-0')).not.toBeInTheDocument()
	})

	it('shows live clock badge when liveData.status is IN_PROGRESS and clock is set', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: null, score: null })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
				liveData={{ score: '1-0', clock: "67'", status: 'IN_PROGRESS' }}
			/>
		)
		expect(screen.getByLabelText('Live')).toHaveTextContent("LIVE 67'")
	})

	it('shows plain "LIVE" badge when liveData.status is IN_PROGRESS but no clock', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: null, score: null })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
				liveData={{ score: '0-0', clock: '', status: 'IN_PROGRESS' }}
			/>
		)
		expect(screen.getByLabelText('Live')).toHaveTextContent('LIVE')
	})

	it('shows venue for upcoming matches with no result', () => {
		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ result: null, score: null, venue: 'AT&T Stadium' })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[]}
			/>
		)
		expect(screen.getByText('AT&T Stadium')).toBeInTheDocument()
	})

	it('uses opponent team groupResults for opponent scorers when no liveData', () => {
		const oppMatch = makeGroupMatch({ matchday: 2, opponent: 'USA', result: 'L', score: '0-1', scorers: ["Hernandez 60'"] })
		const oppTeam = makeTeam('Mexico', [oppMatch])

		render(
			<MatchCard
				mode='team'
				match={makeGroupMatch({ matchday: 2, opponent: 'Mexico', result: 'W', score: '1-0', scorers: ["Pulisic 30'"] })}
				teamFlag='🇺🇸'
				teamId='usa'
				teams={[oppTeam]}
			/>
		)

		expect(screen.getByText("Pulisic 30'")).toBeInTheDocument()
		expect(screen.getByText("Hernandez 60'")).toBeInTheDocument()
	})
})
