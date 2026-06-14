/** Ordered list of tournament stages */
export const STAGE_ORDER = ['group_stage', 'r32', 'r16', 'qf', 'sf', 'final']

/** Human-readable labels for each stage */
export const STAGE_LABELS = {
  group_stage: 'Group Stage',
  r32:         'Round of 32',
  r16:         'Round of 16',
  qf:          'Quarterfinal',
  sf:          'Semifinal',
  final:       'The Final',
}

/** Short labels for narrow viewports */
export const STAGE_LABELS_SHORT = {
  group_stage: 'Group',
  r32:         'R32',
  r16:         'R16',
  qf:          'QF',
  sf:          'SF',
  final:       'Final',
}

/** FIFA confederation groupings for the team selector */
export const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF', 'AFC', 'CAF', 'OFC']

/** Default team shown on first load */
export const DEFAULT_TEAM = 'usa'

/** API / data endpoints */
export const LIVE_DATA_URL     = '/data/world-cup-2026.json'
export const MANIFEST_URL      = '/data/snapshots/manifest.json'
export const SNAPSHOT_URL      = (date) => `/data/snapshots/${date}.json`

/** Attribution */
export const AUTHOR_NAME       = 'Stephen Burks'
export const AUTHOR_GITHUB_URL = 'https://github.com/stephenburks/'
