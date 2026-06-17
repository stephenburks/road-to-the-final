import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { renderHook, waitFor } from '@testing-library/react'
import { createElement } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useData } from './useData'

const mockLive: unknown = {
	lastUpdated: '2026-06-15T00:00:00Z',
	snapshotDate: 'live',
	isHistorical: false,
	tournament: { name: 'World Cup 2026', currentStage: 'group_stage', stages: {} },
	groups: {},
	teams: [],
}

const mockSnap: unknown = {
	lastUpdated: '2026-06-01T00:00:00Z',
	snapshotDate: '2026-06-01',
	isHistorical: true,
	tournament: { name: 'World Cup 2026', currentStage: 'group_stage', stages: {} },
	groups: {},
	teams: [],
}

const mockManifest = {
	available: ['2026-06-01', '2026-06-08'],
	labels: { '2026-06-01': 'Jun 1', '2026-06-08': 'Jun 8' },
	earliest: '2026-06-01',
	latest: '2026-06-08',
	generated: '2026-06-15T00:00:00Z',
}

function createWrapper() {
	const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
	return function Wrapper({ children }: { children: React.ReactNode }) {
		return createElement(QueryClientProvider, { client }, children)
	}
}

describe('useData', () => {
	beforeEach(() => {
		vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
			ok: true,
			status: 200,
			json: () => Promise.resolve({}),
		}))
	})

	afterEach(() => {
		vi.unstubAllGlobals()
	})

	it('fetches live data and manifest on mount', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockLive) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockManifest) }))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		expect(result.current.manifest).toBeTruthy()
		expect(result.current.error).toBeNull()
	})

	it('sets loadingSnap to true when a snapshot date is selected', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockLive) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockManifest) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockSnap) }))

		const { result, rerender } = renderHook(
			({ date }) => useData(date),
			{ initialProps: { date: 'live' }, wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		rerender({ date: '2026-06-01' })

		await waitFor(() => {
			expect(result.current.loadingSnap).toBe(true)
		})
	})

	it('transitions loadingSnap to false after snapshot resolves', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockLive) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockManifest) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockSnap) }))

		const { result, rerender } = renderHook(
			({ date }) => useData(date),
			{ initialProps: { date: 'live' }, wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		rerender({ date: '2026-06-01' })

		await waitFor(() => {
			expect(result.current.loadingSnap).toBe(false)
		})

		expect(result.current.snapData).toBeTruthy()
	})

	it('handles manifest fetch failure silently (returns null, no error)', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockLive) })
			.mockRejectedValueOnce(new Error('Network error')))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		expect(result.current.manifest).toBeNull()
		expect(result.current.error).toBeNull()
	})

	it('handles live data fetch failure (sets error state)', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockImplementationOnce(() => Promise.reject(new Error('Network failure')))
			.mockImplementationOnce(() => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(mockManifest) })))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.error).toBeTruthy()
		})

		expect(result.current.error).toContain('Could not load match data')
	})

	it('snapData is null when selectedDate is live', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockLive) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockManifest) }))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		expect(result.current.snapData).toBeNull()
	})

	it('deduplicates in-flight snapshot requests (same date, rapid re-renders)', async () => {
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockLive) })
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => Promise.resolve(mockManifest) }))

		const { result, rerender } = renderHook(
			({ date }) => useData(date),
			{ initialProps: { date: 'live' }, wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		let resolveSnap: (value: unknown) => void
		const snapPromise = new Promise<unknown>(resolve => { resolveSnap = resolve })
		vi.stubGlobal('fetch', vi.fn()
			.mockResolvedValueOnce({ ok: true, status: 200, json: () => snapPromise }))

		rerender({ date: '2026-06-15' })
		rerender({ date: '2026-06-15' })
		rerender({ date: '2026-06-15' })

		resolveSnap!(mockSnap)

		await waitFor(() => {
			expect(result.current.snapData).toBeTruthy()
		})
	})
})
