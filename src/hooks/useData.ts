import { useState, useEffect, useRef } from 'react'
import { LIVE_DATA_URL, MANIFEST_URL, SNAPSHOT_URL } from '../constants'
import type { AppData, SnapshotManifest } from '../types'

const snapCache = new Map<string, AppData>()

interface UseDataReturn {
	liveData: AppData | null
	manifest: SnapshotManifest | null
	snapData: AppData | null
	loadingSnap: boolean
	error: string | null
}

/**
 * Manages all remote data for the app:
 *   - live JSON (always loaded)
 *   - snapshots manifest (always loaded)
 *   - historical snapshot (loaded on demand, cached)
 */
export function useData(selectedDate: string): UseDataReturn {
	const [liveData, setLiveData]   = useState<AppData | null>(null)
	const [manifest, setManifest]   = useState<SnapshotManifest | null>(null)
	const [snapData, setSnapData]   = useState<AppData | null>(null)
	const [loadingSnap, setLoadSnap] = useState(false)
	const [error, setError]         = useState<string | null>(null)
	const inFlight = useRef<Map<string, Promise<unknown>>>(new Map())

	useEffect(() => {
		Promise.all([
			fetch(LIVE_DATA_URL).then(r => {
				if (!r.ok) throw new Error(`HTTP ${r.status} loading live data`)
				return r.json() as Promise<AppData>
			}),
			fetch(MANIFEST_URL)
				.then(r => r.ok ? r.json() as Promise<SnapshotManifest> : null)
				.catch(() => null),
		])
			.then(([live, mf]) => {
				setLiveData(live)
				setManifest(mf)
			})
			.catch(err => {
				console.error('[useData] initial load failed:', err)
				const e = err as Error
				setError(
					'Could not load match data. ' +
					'Make sure world-cup-2026.json is in the public/data/ folder ' +
					"and you're running via a local server (npx serve . or npm run dev).\n\n" +
					'Details: ' + (e.message ?? 'unknown error')
				)
			})
	}, [])

	useEffect(() => {
		if (selectedDate === 'live' || !selectedDate) {
			// eslint-disable-next-line react-hooks/set-state-in-effect
			setSnapData(null)
			return
		}

		if (snapCache.has(selectedDate)) {
			setSnapData(snapCache.get(selectedDate) ?? null)
			setLoadSnap(false)
			return
		}

		if (inFlight.current.has(selectedDate)) return

		setLoadSnap(true)
		const promise = fetch(SNAPSHOT_URL(selectedDate))
			.then(r => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`)
				return r.json() as Promise<AppData>
			})
			.then(d => {
				snapCache.set(selectedDate, d)
				setSnapData(d)
				setLoadSnap(false)
				inFlight.current.delete(selectedDate)
			})
			.catch(err => {
				console.error('[useData] snapshot load failed:', err)
				setSnapData(null)
				setLoadSnap(false)
				inFlight.current.delete(selectedDate)
			})

		inFlight.current.set(selectedDate, promise)
	}, [selectedDate])

	return { liveData, manifest, snapData, loadingSnap, error }
}