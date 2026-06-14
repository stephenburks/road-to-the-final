import { useState, useEffect } from 'react'
import { LIVE_DATA_URL, MANIFEST_URL, SNAPSHOT_URL } from '../constants'

/**
 * Manages all remote data for the app:
 *   - live JSON (always loaded)
 *   - snapshots manifest (always loaded)
 *   - historical snapshot (loaded on demand when selectedDate !== 'live')
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
  const [liveData, setLiveData]     = useState(null)
  const [manifest, setManifest]     = useState(null)
  const [snapData, setSnapData]     = useState(null)
  const [loadingSnap, setLoadSnap]  = useState(false)
  const [error, setError]           = useState(null)

  // Load live data + manifest once on mount
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
          'and you\'re running via a local server (npx serve . or npm run dev).'
        )
      })
  }, [])

  // Load snapshot when selectedDate changes
  useEffect(() => {
    if (selectedDate === 'live' || !selectedDate) {
      setSnapData(null)
      return
    }
    setLoadSnap(true)
    fetch(SNAPSHOT_URL(selectedDate))
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(d => {
        setSnapData(d)
        setLoadSnap(false)
      })
      .catch(err => {
        console.error('[useData] snapshot load failed:', err)
        setSnapData(null)
        setLoadSnap(false)
      })
  }, [selectedDate])

  return { liveData, manifest, snapData, loadingSnap, error }
}
