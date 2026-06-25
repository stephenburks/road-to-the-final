import { useQuery } from '@tanstack/react-query'
import { LIVE_DATA_URL, MANIFEST_URL, SNAPSHOT_URL } from '../constants'
import type { AppData, SnapshotManifest } from '../types'

interface UseDataReturn {
	liveData: AppData | null
	manifest: SnapshotManifest | null
	snapData: AppData | null
	loadingSnap: boolean
	error: string | null
}

export function useData(selectedDate: string): UseDataReturn {
	const liveQuery = useQuery<AppData, Error>({
		queryKey: ['liveData'],
		queryFn: async ({ signal }) => {
			const res = await fetch(`${LIVE_DATA_URL}?_=${Date.now()}`, {
				signal,
				cache: 'no-store',
			})
			if (!res.ok) throw new Error(`HTTP ${res.status} loading live data`)
			return res.json() as Promise<AppData>
		},
		// Aggressive refresh: every 3 min in foreground, on tab focus, and on
		// reconnect. Cuts the worst-case staleness window so users don't see
		// outdated standings/scores after a GHA cron + Pages deploy cycle.
		refetchInterval: 3 * 60 * 1000,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		staleTime: 0,
	})

	const manifestQuery = useQuery<SnapshotManifest | null, Error>({
		queryKey: ['manifest'],
		queryFn: async ({ signal }) => {
			const res = await fetch(MANIFEST_URL, { signal })
			return res.ok ? (res.json() as Promise<SnapshotManifest>) : null
		},
		staleTime: 60 * 60 * 1000,
	})

	const snapEnabled = selectedDate !== 'live' && !!selectedDate
	const snapQuery = useQuery<AppData, Error>({
		queryKey: ['snapshot', selectedDate],
		queryFn: async ({ signal }) => {
			const res = await fetch(SNAPSHOT_URL(selectedDate), { signal })
			if (!res.ok) throw new Error(`HTTP ${res.status}`)
			return res.json() as Promise<AppData>
		},
		enabled: snapEnabled,
		staleTime: Infinity,
	})

	const error = liveQuery.error
		? (
			'Could not load match data. ' +
			'Make sure world-cup-2026.json is in the public/data/ folder ' +
			"and you're running via a local server (npx serve . or npm run dev).\n\n" +
			'Details: ' + (liveQuery.error.message ?? 'unknown error')
		)
		: null

	return {
		liveData: liveQuery.data ?? null,
		manifest: manifestQuery.data ?? null,
		snapData: snapEnabled ? (snapQuery.data ?? null) : null,
		loadingSnap: snapEnabled && snapQuery.isLoading,
		error,
	}
}
