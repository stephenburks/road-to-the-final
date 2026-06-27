import { useQuery } from '@tanstack/react-query'
import { LIVE_DATA_URL, MANIFEST_URL, SNAPSHOT_URL, VERSION_URL } from '../constants'
import type { AppData, SnapshotManifest } from '../types'

interface UseDataReturn {
	liveData: AppData | null
	manifest: SnapshotManifest | null
	snapData: AppData | null
	loadingSnap: boolean
	error: string | null
}

interface Version {
	lastUpdated: string
	hash: string
}

// When the version sidecar is missing (older deploy or local dev with stale
// assets), fall back to a longer poll on the heavy file so we still self-heal.
const FALLBACK_HASH = 'no-version'

export function useData(selectedDate: string): UseDataReturn {
	// Cheap (~80 byte) poll: drives invalidation of the heavy data query.
	// Cache-busted because version.json itself sits behind the same CDN edge.
	const versionQuery = useQuery<Version | null, Error>({
		queryKey: ['liveDataVersion'],
		queryFn: async ({ signal }) => {
			const res = await fetch(`${VERSION_URL}?_=${Date.now()}`, { signal, cache: 'no-store' })
			if (!res.ok) return null
			return res.json() as Promise<Version>
		},
		refetchInterval: 60 * 1000,
		refetchOnWindowFocus: true,
		refetchOnReconnect: true,
		staleTime: 30 * 1000,
	})

	const versionHash = versionQuery.data?.hash ?? FALLBACK_HASH

	const liveQuery = useQuery<AppData, Error>({
		// Hash in the key → automatic refetch when the sidecar reports a new build.
		queryKey: ['liveData', versionHash],
		queryFn: async ({ signal }) => {
			// Let the CDN cache normally — version sidecar drives freshness.
			const res = await fetch(LIVE_DATA_URL, { signal })
			if (!res.ok) throw new Error(`HTTP ${res.status} loading live data`)
			return res.json() as Promise<AppData>
		},
		staleTime: Infinity,
		// Last-resort safety net for the no-sidecar case: refetch every 5min
		// in the foreground even without a version change.
		refetchInterval: versionHash === FALLBACK_HASH ? 5 * 60 * 1000 : false,
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
