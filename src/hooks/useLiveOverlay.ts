import { useMemo } from 'react'
import type { AppData, MatchupOdds } from '../types'
import type { LiveMatchPatch } from './useLiveScores'
import { useLiveScores } from './useLiveScores'
import { useLiveOdds } from './useLiveOdds'
import { useLiveTournamentProbs, type LiveTournamentProbs } from './useLiveTournamentProbs'
import { deriveLiveAppData } from '../data/deriveLive'

export interface LiveOverlay {
	/** AppData with groups[].standings + team.currentStage + team.eliminated
	 *  recomputed from live scores. Falls back to the static input when no
	 *  patches are present (historical mode, no active matches). */
	data: AppData
	patches: Map<string, LiveMatchPatch> | null
	odds: Map<string, MatchupOdds> | null
	probs: LiveTournamentProbs | null
}

/**
 * The single live-data composition point. Owns the three live hooks so
 * downstream consumers share TanStack Query caches by always sharing the
 * same derived query keys, and so live overlays only get applied once per
 * render tree.
 */
export function useLiveOverlay(staticData: AppData | null, isHistorical: boolean): LiveOverlay {
	const dailyMatches = staticData?.dailyMatches ?? {}
	const teams = staticData?.teams ?? []

	const patches = useLiveScores(dailyMatches, teams, isHistorical)
	const odds    = useLiveOdds(dailyMatches, patches, isHistorical)
	const probs   = useLiveTournamentProbs(dailyMatches, patches, isHistorical)

	const data = useMemo(() => {
		if (!staticData) return staticData as unknown as AppData
		return deriveLiveAppData(staticData, patches)
	}, [staticData, patches])

	return { data, patches, odds, probs }
}
