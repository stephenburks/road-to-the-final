import { describe, it, expect, vi, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useLiveScores } from './useLiveScores'
import type { AppData } from '../types'

// Fix the date so tests are not time-dependent
vi.mock('../utils', async (importOriginal) => {
	const actual = await importOriginal<typeof import('../utils')>()
	return { ...actual, localDateStr: () => '2026-06-20' }
})

const TODAY = '2026-06-20'

const TEAMS: AppData['teams'] = [
	{
		id: 'usa',
		name: 'United States',
		flag: '🇺🇸',
		group: 'A',
		confederation: 'CONCACAF',
		fifaRank: 11,
		eliminated: false,
		currentStage: 'group_stage',
		groupResults: [],
		advanceProbabilities: { r32: 90, r16: 70, qf: 40, sf: 20, final: 10, winner: 5, source: 'calculated' },
		path: { group_stage: { status: 'active' }, r32: null, r16: null, qf: null, sf: null, final: null },
		possibleOpponents: { r32: [], r16: [] },
	},
	{
		id: 'mexico',
		name: 'Mexico',
		flag: '🇲🇽',
		group: 'A',
		confederation: 'CONCACAF',
		fifaRank: 16,
		eliminated: false,
		currentStage: 'group_stage',
		groupResults: [],
		advanceProbabilities: { r32: 80, r16: 60, qf: 30, sf: 15, final: 8, winner: 4, source: 'calculated' },
		path: { group_stage: { status: 'active' }, r32: null, r16: null, qf: null, sf: null, final: null },
		possibleOpponents: { r32: [], r16: [] },
	},
]

const DAILY_MATCHES_TODAY: AppData['dailyMatches'] = {
	[TODAY]: [
		{
			homeTeam: 'United States',
			homeFlag: '🇺🇸',
			homeId: 'usa',
			awayTeam: 'Mexico',
			awayFlag: '🇲🇽',
			awayId: 'mexico',
			homeScore: 0,
			awayScore: 0,
			status: 'SCHEDULED',
			date: TODAY,
		},
	],
}

function makeESPNEvent(overrides: {
	homeDisplayName?: string
	awayDisplayName?: string
	homeId?: string
	awayId?: string
	homeScore?: string
	awayScore?: string
	statusState?: string
	statusDetail?: string
	details?: unknown[]
	geoBroadcasts?: unknown[]
} = {}) {
	const {
		homeDisplayName = 'United States',
		awayDisplayName = 'Mexico',
		homeId = '660',
		awayId = '472',
		homeScore = '2',
		awayScore = '1',
		statusState = 'post',
		statusDetail = 'Full Time',
		details = [],
		geoBroadcasts = [],
	} = overrides

	return {
		competitions: [{
			competitors: [
				{
					homeAway: 'home',
					score: homeScore,
					team: { id: homeId, displayName: homeDisplayName },
				},
				{
					homeAway: 'away',
					score: awayScore,
					team: { id: awayId, displayName: awayDisplayName },
				},
			],
			status: {
				type: { state: statusState, detail: statusDetail },
			},
			details,
			geoBroadcasts,
		}],
	}
}

function mockFetch(body: unknown) {
	vi.spyOn(globalThis, 'fetch').mockResolvedValue({
		json: () => Promise.resolve(body),
	} as Response)
}

function createWrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client }, children)
	}
}

describe('useLiveScores', () => {
	afterEach(() => {
		vi.restoreAllMocks()
	})

	describe('polling disabled conditions', () => {
		it('returns null when isHistorical is true', () => {
			mockFetch({ events: [makeESPNEvent()] })
			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, true),
				{ wrapper: createWrapper() }
			)
			expect(result.current).toBeNull()
			expect(fetch).not.toHaveBeenCalled()
		})

		it('returns null when there are no matches today', () => {
			mockFetch({ events: [makeESPNEvent()] })
			const { result } = renderHook(
				() => useLiveScores({ '2026-06-19': [] }, TEAMS, false),
				{ wrapper: createWrapper() }
			)
			expect(result.current).toBeNull()
			expect(fetch).not.toHaveBeenCalled()
		})

		it('returns null when dailyMatches is undefined', () => {
			mockFetch({ events: [makeESPNEvent()] })
			const { result } = renderHook(
				() => useLiveScores(undefined, TEAMS, false),
				{ wrapper: createWrapper() }
			)
			expect(result.current).toBeNull()
			expect(fetch).not.toHaveBeenCalled()
		})
	})

	describe('parsing ESPN response', () => {
		it('returns null when ESPN response has no matching team pairs', async () => {
			mockFetch({
				events: [makeESPNEvent({ homeDisplayName: 'Unknown FC', awayDisplayName: 'Other FC' })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalled()
			})

			expect(result.current).toBeNull()
		})

		it('parses home and away scores from a finished match', async () => {
			mockFetch({ events: [makeESPNEvent({ homeScore: '3', awayScore: '1', statusState: 'post' })] })

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.homeScore).toBe(3)
			expect(patch.awayScore).toBe(1)
			expect(patch.status).toBe('FINISHED')
		})

		it('parses an in-progress match with clock', async () => {
			mockFetch({
				events: [makeESPNEvent({ statusState: 'in', statusDetail: "67'", homeScore: '1', awayScore: '0' })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.status).toBe('IN_PROGRESS')
			expect(patch.clock).toBe("67'")
		})

		it('skips SCHEDULED matches and returns null when that is the only event', async () => {
			mockFetch({ events: [makeESPNEvent({ statusState: 'pre' })] })

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalled()
			})

			expect(result.current).toBeNull()
		})

		it('keys the map as both homeId:awayId and awayId:homeId', async () => {
			mockFetch({ events: [makeESPNEvent()] })

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			expect(result.current!.has('usa:mexico')).toBe(true)
			expect(result.current!.has('mexico:usa')).toBe(true)
			expect(result.current!.get('usa:mexico')).toBe(result.current!.get('mexico:usa'))
		})
	})

	describe('goal scorer parsing', () => {
		it('parses a regular goal for the home team', async () => {
			const details = [{
				scoringPlay: true,
				athletesInvolved: [{ displayName: 'Christian Pulisic' }],
				type: { text: 'Goal' },
				clock: { displayValue: "34'" },
				team: { id: '660' }, // ESPN ID for home team
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.homeScorers).toContain("Christian Pulisic 34'")
			expect(patch.awayScorers).toHaveLength(0)
		})

		it('parses an own goal with OG suffix', async () => {
			const details = [{
				scoringPlay: true,
				athletesInvolved: [{ displayName: 'Edson Alvarez' }],
				type: { text: 'Own Goal' },
				clock: { displayValue: "22'" },
				team: { id: '472' }, // own goal credited to away team
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.awayScorers).toContain("Edson Alvarez OG 22'")
		})

		it('parses a penalty goal with (P) suffix', async () => {
			const details = [{
				scoringPlay: true,
				athletesInvolved: [{ displayName: 'Christian Pulisic' }],
				type: { text: 'Penalty' },
				clock: { displayValue: "55'" },
				team: { id: '660' },
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.homeScorers).toContain("Christian Pulisic 55' (P)")
		})

		it('skips scoring plays with no athlete displayName', async () => {
			const details = [{
				scoringPlay: true,
				athletesInvolved: [{}],
				type: { text: 'Goal' },
				clock: { displayValue: "10'" },
				team: { id: '660' },
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.homeScorers).toHaveLength(0)
		})
	})

	describe('card parsing', () => {
		it('parses a yellow card for the away team', async () => {
			const details = [{
				yellowCard: true,
				athletesInvolved: [{ displayName: 'Hirving Lozano' }],
				clock: { displayValue: "45'" },
				team: { id: '472' },
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.awayCards).toHaveLength(1)
			expect(patch.awayCards[0]).toEqual({ player: 'Hirving Lozano', minute: "45'", type: 'yellow' })
			expect(patch.homeCards).toHaveLength(0)
		})

		it('parses a red card for the home team', async () => {
			const details = [{
				redCard: true,
				athletesInvolved: [{ displayName: 'Tyler Adams' }],
				clock: { displayValue: "78'" },
				team: { id: '660' },
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.homeCards).toHaveLength(1)
			expect(patch.homeCards[0]).toEqual({ player: 'Tyler Adams', minute: "78'", type: 'red' })
		})

		it('skips card events with no athlete displayName', async () => {
			const details = [{
				yellowCard: true,
				athletesInvolved: [{}],
				clock: { displayValue: "30'" },
				team: { id: '660' },
			}]

			mockFetch({
				events: [makeESPNEvent({ homeId: '660', awayId: '472', details })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.homeCards).toHaveLength(0)
		})
	})

	describe('broadcasts parsing', () => {
		it('parses broadcast names from geoBroadcasts', async () => {
			const geoBroadcasts = [
				{ media: { shortName: 'FOX' } },
				{ media: { shortName: 'Telemundo' } },
			]

			mockFetch({
				events: [makeESPNEvent({ geoBroadcasts })],
			})

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			const patch = result.current!.get('usa:mexico')!
			expect(patch.broadcasts).toContain('FOX')
			expect(patch.broadcasts).toContain('Telemundo')
		})

		it('returns empty broadcasts array when geoBroadcasts is absent', async () => {
			mockFetch({ events: [makeESPNEvent({ geoBroadcasts: [] })] })

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(result.current).not.toBeNull()
			})

			expect(result.current!.get('usa:mexico')!.broadcasts).toHaveLength(0)
		})
	})

	describe('error handling', () => {
		it('returns null on fetch error', async () => {
			vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('Network error'))

			const { result } = renderHook(
				() => useLiveScores(DAILY_MATCHES_TODAY, TEAMS, false),
				{ wrapper: createWrapper() }
			)

			await waitFor(() => {
				expect(fetch).toHaveBeenCalled()
			})

			expect(result.current).toBeNull()
		})
	})
})
