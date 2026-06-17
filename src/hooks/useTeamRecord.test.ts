import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useTeamRecord } from './useTeamRecord'

const MOCK_USA_RESPONSE = {
	team: {
		id: '660',
		slug: 'usa',
		displayName: 'United States',
		standingSummary: '1st in FIFA World Cup',
		record: {
			items: [{
				description: 'Overall Record',
				type: 'total',
				summary: '1-0-0',
				stats: [
					{ name: 'wins', value: 1 },
					{ name: 'ties', value: 0 },
					{ name: 'losses', value: 0 },
					{ name: 'gamesPlayed', value: 1 },
				],
			}],
		},
		nextEvent: [{
			id: '760442',
			date: '2026-06-19T19:00Z',
			competitions: [{
				venue: { fullName: 'Lumen Field' },
				broadcasts: [
					{ media: { shortName: 'FOX' } },
					{ media: { shortName: 'Telemundo' } },
				],
				competitors: [
					{
						homeAway: 'home',
						team: { id: '660', displayName: 'United States', abbreviation: 'USA' },
					},
					{
						homeAway: 'away',
						team: { id: '628', displayName: 'Australia', abbreviation: 'AUS' },
					},
				],
			}],
		}],
	},
}

function createWrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client }, children)
	}
}

describe('useTeamRecord', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns null values initially', () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_USA_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useTeamRecord('usa', false), { wrapper: createWrapper() })

		expect(result.current.record).toBeNull()
		expect(result.current.standingSummary).toBeNull()
		expect(result.current.nextEvent).toBeNull()
	})

	it('fetches and parses record data', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_USA_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useTeamRecord('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.record).not.toBeNull()
		})

		expect(result.current.record?.summary).toBe('1-0-0')
		expect(result.current.record?.stats.wins).toBe(1)
		expect(result.current.standingSummary).toBe('1st in FIFA World Cup')
	})

	it('parses next event correctly', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_USA_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useTeamRecord('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.nextEvent).not.toBeNull()
		})

		expect(result.current.nextEvent?.opponent).toBe('Australia')
		expect(result.current.nextEvent?.venue).toBe('Lumen Field')
		expect(result.current.nextEvent?.broadcasts).toContain('FOX')
		expect(result.current.nextEvent?.isHome).toBe(true)
	})

	it('returns null for historical mode (isHistorical=true)', () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_USA_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useTeamRecord('usa', true), { wrapper: createWrapper() })

		expect(result.current.record).toBeNull()
		expect(result.current.standingSummary).toBeNull()
		expect(result.current.nextEvent).toBeNull()
		expect(fetch).not.toHaveBeenCalled()
	})

	it('returns null when team has no ESPN slug mapping', () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_USA_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useTeamRecord('unknown_team', false), { wrapper: createWrapper() })

		expect(result.current.record).toBeNull()
		expect(fetch).not.toHaveBeenCalled()
	})

	it('handles fetch errors gracefully', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

		const { result } = renderHook(() => useTeamRecord('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.record).toBeNull()
		})

		expect(result.current.nextEvent).toBeNull()
	})
})
