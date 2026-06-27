import { createContext, useContext } from 'react'
import type { LiveOverlay } from './useLiveOverlay'
import type { MatchupOdds } from '../types'
import type { LiveMatchPatch } from './useLiveScores'

export const LiveOverlayContext = createContext<LiveOverlay | null>(null)

/**
 * Read the live overlay (patches / odds / probs / derived AppData) from any
 * descendant of <LiveOverlayProvider>. Throws if used outside — fail loud
 * rather than silently render stale data.
 */
export function useLiveOverlayContext(): LiveOverlay {
	const ctx = useContext(LiveOverlayContext)
	if (!ctx) throw new Error('useLiveOverlayContext() used outside <LiveOverlayProvider>')
	return ctx
}

export function useLivePatch(homeId?: string, awayId?: string): LiveMatchPatch | undefined {
	const { patches } = useLiveOverlayContext()
	if (!patches || !homeId || !awayId) return undefined
	return patches.get(`${homeId}:${awayId}`)
}

export function useLiveMatchOdds(homeId?: string, awayId?: string): MatchupOdds | undefined {
	const { odds } = useLiveOverlayContext()
	if (!odds || !homeId || !awayId) return undefined
	return odds.get(`${homeId}:${awayId}`)
}
