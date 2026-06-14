import { useState, useEffect, useRef } from 'react'
import { LIVE_DATA_URL, MANIFEST_URL, SNAPSHOT_URL } from '../constants'

const snapCache = new Map()

/**
 * Manages all remote data for the app:
 *   - live JSON (always loaded)
 *   - snapshots manifest (always loaded)
 *   - historical snapshot (loaded on demand, cached)
 *
 * Returns:
 *   liveData    – the current world-cup-2026.json
 *   manifest    – { available[], labels{}, earliest, latest }
 *   snapData    – a historical snapshot (or null)
 *   loadingSnap – true while a snapshot is being fetched
 *   error       – string if initial load failed
 *
 * Usage:
 *   const { liveData, manifest, snapData, loadingSnap, error } = useData(selectedDate)
 */
export function useData(selectedDate) {
	const [liveData, setLiveData]   = useState(null)
	const [manifest, setManifest]   = useState(null)
	const [snapData, setSnapData]   = useState(null)
	const [loadingSnap, setLoadSnap] = useState(false)
	const [error, setError]         = useState(null)
	const inFlight = useRef(new Map())

	useEffect(() => {
		Promise.all([
			fetch(LIVE_DATA_URL).then(r => {
				if (!r.ok) throw new Error(`HTTP ${r.status} loading live data`)
				return r.json()
			}),
			fetch(MANIFEST_URL)
				.then(r => r.ok ? r.json() : null)
				.catch(() => null),
		])
			.then(([live, mf]) => {
				setLiveData(live)
				setManifest(mf)
			})
			.catch(err => {
				console.error('[useData] initial load failed:', err)
				setError(
					'Could not load match data. ' +
					'Make sure world-cup-2026.json is in the public/data/ folder ' +
					"and you're running via a local server (npx serve . or npm run dev)."
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
			setSnapData(snapCache.get(selectedDate))
			setLoadSnap(false)
			return
		}

		if (inFlight.current.has(selectedDate)) return

		setLoadSnap(true)
		const promise = fetch(SNAPSHOT_URL(selectedDate))
			.then(r => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`)
				return r.json()
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