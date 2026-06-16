import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import DailyMatchCard from './DailyMatchCard'
import type { DailyMatch } from '../../types'

const finishedMatch: DailyMatch = {
	homeTeam: 'USA',
	homeFlag: '🇺🇸',
	homeId: 'usa',
	awayTeam: 'Paraguay',
	awayFlag: '🇵🇾',
	awayId: 'paraguay',
	homeScore: 3,
	awayScore: 1,
	status: 'FINISHED',
	date: '2026-06-12',
}

const upcomingMatch: DailyMatch = {
	homeTeam: 'Mexico',
	homeFlag: '🇲🇽',
	homeId: 'mexico',
	awayTeam: 'South Korea',
	awayFlag: '🇰🇷',
	awayId: 'southkorea',
	homeScore: 0,
	awayScore: 0,
	status: 'SCHEDULED',
	date: '2026-06-18',
}

describe('DailyMatchCard', () => {
	it('renders both team names', () => {
		render(<DailyMatchCard match={finishedMatch} />)
		expect(screen.getByText('USA')).toBeInTheDocument()
		expect(screen.getByText('Paraguay')).toBeInTheDocument()
	})

	it('renders score for finished match', () => {
		render(<DailyMatchCard match={finishedMatch} />)
		expect(screen.getByText('3 – 1')).toBeInTheDocument()
		expect(screen.getByText('FT')).toBeInTheDocument()
	})

	it('renders vs for upcoming match', () => {
		render(<DailyMatchCard match={upcomingMatch} />)
		expect(screen.getByText('vs')).toBeInTheDocument()
		expect(screen.getByText('Upcoming')).toBeInTheDocument()
	})

	it('renders date in formatted form', () => {
		render(<DailyMatchCard match={finishedMatch} />)
		expect(screen.getByText(/Jun/)).toBeInTheDocument()
	})
})
