import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useRoster } from './useRoster'

function createWrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client }, children)
	}
}

function makeAthleteRaw(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		id: '100',
		displayName: 'Christian Pulisic',
		shortName: 'C. Pulisic',
		jersey: '10',
		position: { abbreviation: 'F', name: 'Forward' },
		age: 27,
		headshot: { href: 'https://example.com/pulisic.png' },
		statistics: {
			splits: {
				categories: [
					{
						stats: [
							{ name: 'totalGoals', value: 5 },
							{ name: 'goalAssists', value: 3 },
							{ name: 'totalShots', value: 20 },
							{ name: 'shotsOnTarget', value: 10 },
							{ name: 'foulsCommitted', value: 4 },
							{ name: 'foulsSuffered', value: 6 },
							{ name: 'yellowCards', value: 1 },
							{ name: 'redCards', value: 0 },
							{ name: 'saves', value: 0 },
							{ name: 'goalsConceded', value: 0 },
							{ name: 'appearances', value: 4 },
						],
					},
				],
			},
		},
		...overrides,
	}
}

const MOCK_ROSTER_RESPONSE = {
	athletes: [
		makeAthleteRaw({ id: '1', displayName: 'Turner', shortName: 'M. Turner', jersey: '1', position: { abbreviation: 'G', name: 'Goalkeeper' }, age: 29 }),
		makeAthleteRaw({ id: '2', displayName: 'Dest', shortName: 'S. Dest', jersey: '2', position: { abbreviation: 'D', name: 'Defender' }, age: 23 }),
		makeAthleteRaw({ id: '3', displayName: 'Pulisic', shortName: 'C. Pulisic', jersey: '10', position: { abbreviation: 'F', name: 'Forward' }, age: 27 }),
		makeAthleteRaw({ id: '4', displayName: 'Adams', shortName: 'T. Adams', jersey: '4', position: { abbreviation: 'M', name: 'Midfielder' }, age: 25 }),
	],
}

describe('useRoster', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn())
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('returns players: null, loading: false, error: false when isHistorical is true', () => {
		// fetch should never be called — no need to mock a response
		const { result } = renderHook(() => useRoster('usa', true), { wrapper: createWrapper() })

		expect(result.current.players).toBeNull()
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBe(false)
		expect(fetch).not.toHaveBeenCalled()
	})

	it('returns players: null, loading: false, error: false when teamId has no ESPN slug mapping', () => {
		const { result } = renderHook(() => useRoster('unknown_team_xyz', false), { wrapper: createWrapper() })

		expect(result.current.players).toBeNull()
		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBe(false)
		expect(fetch).not.toHaveBeenCalled()
	})

	it('returns loading: true initially when a valid team is queried', () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => new Promise(() => {}), // never resolves
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		expect(result.current.loading).toBe(true)
		expect(result.current.players).toBeNull()
	})

	it('fetches roster from ESPN and returns parsed players', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_ROSTER_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		expect(result.current.loading).toBe(false)
		expect(result.current.error).toBe(false)
		expect(result.current.players).toHaveLength(4)
	})

	it('sorts players by position order GK → DEF → MID → FWD then by jersey number', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_ROSTER_RESPONSE),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		const players = result.current.players!
		expect(players[0].position.abbreviation).toBe('G')
		expect(players[1].position.abbreviation).toBe('D')
		expect(players[2].position.abbreviation).toBe('M')
		expect(players[3].position.abbreviation).toBe('F')
	})

	it('sorts players of the same position by jersey number ascending', async () => {
		const response = {
			athletes: [
				makeAthleteRaw({ id: '5', jersey: '23', position: { abbreviation: 'D', name: 'Defender' } }),
				makeAthleteRaw({ id: '6', jersey: '3', position: { abbreviation: 'D', name: 'Defender' } }),
				makeAthleteRaw({ id: '7', jersey: '15', position: { abbreviation: 'D', name: 'Defender' } }),
			],
		}
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(response),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		const jerseys = result.current.players!.map(p => parseInt(p.jersey, 10))
		expect(jerseys).toEqual([3, 15, 23])
	})

	it('parses player fields correctly', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve({ athletes: [makeAthleteRaw()] }),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		const player = result.current.players![0]
		expect(player.id).toBe('100')
		expect(player.displayName).toBe('Christian Pulisic')
		expect(player.shortName).toBe('C. Pulisic')
		expect(player.jersey).toBe('10')
		expect(player.position.abbreviation).toBe('F')
		expect(player.position.name).toBe('Forward')
		expect(player.age).toBe(27)
		expect(player.headshot?.href).toBe('https://example.com/pulisic.png')
	})

	it('parses all statistics fields from the ESPN response', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve({ athletes: [makeAthleteRaw()] }),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		const stats = result.current.players![0].statistics
		expect(stats.goals).toBe(5)
		expect(stats.assists).toBe(3)
		expect(stats.shots).toBe(20)
		expect(stats.shotsOnTarget).toBe(10)
		expect(stats.foulsCommitted).toBe(4)
		expect(stats.foulsSuffered).toBe(6)
		expect(stats.yellowCards).toBe(1)
		expect(stats.redCards).toBe(0)
		expect(stats.saves).toBe(0)
		expect(stats.goalsConceded).toBe(0)
		expect(stats.appearances).toBe(4)
	})

	it('returns zeroed statistics when athlete has no statistics data', async () => {
		const athlete = makeAthleteRaw({ statistics: undefined })
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve({ athletes: [athlete] }),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		const stats = result.current.players![0].statistics
		expect(stats.goals).toBe(0)
		expect(stats.assists).toBe(0)
		expect(stats.appearances).toBe(0)
	})

	it('returns headshot as undefined when athlete has no headshot', async () => {
		const athlete = makeAthleteRaw({ headshot: undefined })
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve({ athletes: [athlete] }),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.players).not.toBeNull()
		})

		expect(result.current.players![0].headshot).toBeUndefined()
	})

	it('returns an empty array when ESPN response has an empty athletes array', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve({ athletes: [] }),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.loading).toBe(false)
		})

		expect(result.current.players).toEqual([])
		expect(result.current.error).toBe(false)
	})

	it('returns an empty array when ESPN response has no athletes key', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve({}),
		} as Response)

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.loading).toBe(false)
		})

		expect(result.current.players).toEqual([])
		expect(result.current.error).toBe(false)
	})

	it('returns error: true when fetch rejects', async () => {
		vi.mocked(fetch).mockRejectedValue(new Error('Network error'))

		const { result } = renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.error).toBe(true)
		})

		expect(result.current.players).toBeNull()
		expect(result.current.loading).toBe(false)
	})

	it('fetches from the correct ESPN URL using the slug for the given teamId', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_ROSTER_RESPONSE),
		} as Response)

		renderHook(() => useRoster('usa', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(fetch).toHaveBeenCalled()
		})

		const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
		expect(calledUrl).toContain('/usa/roster')
		expect(calledUrl).toContain('season=2026')
	})

	it('uses different ESPN slugs for different team IDs', async () => {
		vi.mocked(fetch).mockResolvedValue({
			json: () => Promise.resolve(MOCK_ROSTER_RESPONSE),
		} as Response)

		// 'brazil' → ESPN slug 'bra'
		renderHook(() => useRoster('brazil', false), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(fetch).toHaveBeenCalled()
		})

		const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
		expect(calledUrl).toContain('/bra/roster')
	})
})
