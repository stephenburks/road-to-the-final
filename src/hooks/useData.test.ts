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

const mockVersion = { lastUpdated: '2026-06-15T00:00:00Z', hash: 'abc123' }

// URL-routed fetch mock: predictable regardless of which query fires first.
// Each test overrides individual routes via `routes`.
function mockFetch(routes: Record<string, unknown | (() => Promise<unknown>) | Error>) {
	return vi.fn().mockImplementation((url: string | URL) => {
		const u = String(url)
		for (const [pattern, value] of Object.entries(routes)) {
			if (!u.includes(pattern)) continue
			if (value instanceof Error) return Promise.reject(value)
			const data = typeof value === 'function' ? (value as () => Promise<unknown>)() : Promise.resolve(value)
			return Promise.resolve({ ok: true, status: 200, json: () => data })
		}
		return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) })
	})
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
		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': mockLive,
			'manifest.json': mockManifest,
		}))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		expect(result.current.manifest).toBeTruthy()
		expect(result.current.error).toBeNull()
	})

	it('sets loadingSnap to true when a snapshot date is selected', async () => {
		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': mockLive,
			'manifest.json': mockManifest,
			'snapshots/2026-06-01': mockSnap,
		}))

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
		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': mockLive,
			'manifest.json': mockManifest,
			'snapshots/2026-06-01': mockSnap,
		}))

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
		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': mockLive,
			'manifest.json': new Error('Network error'),
		}))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		expect(result.current.manifest).toBeNull()
		expect(result.current.error).toBeNull()
	})

	it('handles live data fetch failure (sets error state)', async () => {
		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': new Error('Network failure'),
			'manifest.json': mockManifest,
		}))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.error).toBeTruthy()
		})

		expect(result.current.error).toContain('Could not load match data')
	})

	it('snapData is null when selectedDate is live', async () => {
		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': mockLive,
			'manifest.json': mockManifest,
		}))

		const { result } = renderHook(() => useData('live'), { wrapper: createWrapper() })

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		expect(result.current.snapData).toBeNull()
	})

	it('deduplicates in-flight snapshot requests (same date, rapid re-renders)', async () => {
		let resolveSnap: (value: unknown) => void
		const snapPromise = new Promise<unknown>(resolve => { resolveSnap = resolve })

		vi.stubGlobal('fetch', mockFetch({
			'version.json': mockVersion,
			'world-cup-2026.json': mockLive,
			'manifest.json': mockManifest,
			'snapshots/2026-06-15': () => snapPromise,
		}))

		const { result, rerender } = renderHook(
			({ date }) => useData(date),
			{ initialProps: { date: 'live' }, wrapper: createWrapper() }
		)

		await waitFor(() => {
			expect(result.current.liveData).toBeTruthy()
		})

		rerender({ date: '2026-06-15' })
		rerender({ date: '2026-06-15' })
		rerender({ date: '2026-06-15' })

		resolveSnap!(mockSnap)

		await waitFor(() => {
			expect(result.current.snapData).toBeTruthy()
		})
	})
})
