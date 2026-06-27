import type { Stage } from './types'

/** Ordered list of tournament stages */
export const STAGE_ORDER: readonly Stage[] = ['group_stage', 'r32', 'r16', 'qf', 'sf', 'final']

/** Human-readable labels for each stage */
export const STAGE_LABELS: Record<Stage, string> = {
  group_stage: 'Group Stage',
  r32:         'Round of 32',
  r16:         'Round of 16',
  qf:          'Quarterfinal',
  sf:          'Semifinal',
  final:       'The Final',
}

/** Short labels for narrow viewports */
export const STAGE_LABELS_SHORT: Record<Stage, string> = {
  group_stage: 'Group',
  r32:         'R32',
  r16:         'R16',
  qf:          'QF',
  sf:          'SF',
  final:       'Final',
}

/** FIFA confederation groupings for the team selector */
export const CONFEDERATIONS: readonly string[] = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']

/** Default team shown on first load */
export const DEFAULT_TEAM = 'usa'

const BASE = import.meta.env.BASE_URL

export const LIVE_DATA_URL  = `${BASE}data/world-cup-2026.json`
export const VERSION_URL    = `${BASE}data/version.json`
export const MANIFEST_URL   = `${BASE}data/snapshots/manifest.json`
export const SNAPSHOT_URL   = (date: string) => `${BASE}data/snapshots/${date}.json`

export const ESPN_BASE           = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world'
export const ESPN_SCOREBOARD_URL = `${ESPN_BASE}/scoreboard`
export const ESPN_TEAM_URL       = `${ESPN_BASE}/teams`
export const ESPN_NEWS_URL       = `${ESPN_BASE}/news`

/** Attribution */
export const AUTHOR_NAME       = 'Stephen Burks'
export const AUTHOR_GITHUB_URL = 'https://github.com/stephenburks/'

/** Polymarket event URLs — one event per stage (and one per group winner).
 * Slugs match scripts/update-data.js — update both if Polymarket renames. */
const POLYMARKET_EVENT = (slug: string) => `https://polymarket.com/event/${slug}`

export const POLYMARKET_STAGE_URLS: Partial<Record<Stage | 'winner', string>> = {
  r32:    POLYMARKET_EVENT('world-cup-team-to-advance-to-knockout-stages'),
  r16:    POLYMARKET_EVENT('world-cup-nation-to-reach-round-of-16'),
  qf:     POLYMARKET_EVENT('world-cup-nation-to-reach-quarterfinals'),
  sf:     POLYMARKET_EVENT('world-cup-nation-to-reach-semifinals'),
  final:  POLYMARKET_EVENT('world-cup-nation-to-reach-final'),
  winner: POLYMARKET_EVENT('world-cup-winner'),
}

export const polymarketGroupUrl = (groupLetter: string) =>
  POLYMARKET_EVENT(`world-cup-group-${groupLetter.toLowerCase()}-winner`)
