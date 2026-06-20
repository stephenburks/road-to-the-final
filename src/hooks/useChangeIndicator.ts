import { useEffect, useRef, useState } from 'react'

export type ChangeDelta = 'up' | 'down' | null

/**
 * Tracks value changes and returns a transient 'up'/'down' indicator that
 * auto-clears after a short window. Returns null on first render so no arrow
 * shows when the value initially loads.
 */
export function useChangeIndicator(value: number | undefined, holdMs = 1800): ChangeDelta {
	const prev = useRef<number | undefined>(undefined)
	const [delta, setDelta] = useState<ChangeDelta>(null)

	useEffect(() => {
		if (value == null) return
		if (prev.current != null && prev.current !== value) {
			setDelta(value > prev.current ? 'up' : 'down')
			const t = setTimeout(() => setDelta(null), holdMs)
			prev.current = value
			return () => clearTimeout(t)
		}
		prev.current = value
	}, [value, holdMs])

	return delta
}
