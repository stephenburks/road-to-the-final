import { useEffect, useMemo, useState } from 'react'
import type { DailyMatches } from '../types'

/**
 * Returns whether we're inside the "polling-worth" window for any of today's
 * matches. True if any match is IN_PROGRESS, in its 5-min pre-kickoff window,
 * or within 3 hr after kickoff (covers regulation + extra time).
 *
 * Re-evaluates once per minute via setInterval so polling auto-engages when
 * kickoff approaches without requiring a user-driven re-render.
 */
export function useActiveMatchWindow(dailyMatches: DailyMatches | undefined, today: string): boolean {
	const [now, setNow] = useState(() => Date.now())

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 60_000)
		return () => clearInterval(id)
	}, [])

	return useMemo(() => {
		const matches = dailyMatches?.[today] ?? []
		for (const m of matches) {
			if (m.status === 'IN_PROGRESS') return true
			if (!m.time) continue
			const kickoff = new Date(m.time).getTime()
			if (isNaN(kickoff)) continue
			const start = kickoff - 5 * 60_000
			const end = kickoff + 3 * 60 * 60_000
			if (now >= start && now <= end) return true
		}
		return false
	}, [dailyMatches, today, now])
}
