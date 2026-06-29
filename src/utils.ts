import { STAGE_ORDER } from './constants'
import type { Stage, Team, AppData, GroupData, Opponent, Scenario } from './types'

/**
 * Days until a given date string (YYYY-MM-DD or ISO).
 * Returns null if the string doesn't look like a full date.
 */
export function daysUntil(dateStr?: string): number | null {
  if (!dateStr?.match(/^\d{4}/)) return null
  // Compare UTC noon of target vs UTC noon of today — avoids off-by-one from
  // local timezone offsets against the UTC midnight the bare date string parses to.
  const target = Date.parse(dateStr.slice(0, 10) + 'T12:00:00Z')
  const now = new Date()
  const todayNoon = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate(), 12)
  return Math.round((target - todayNoon) / 864e5)
}

/**
 * Returns today's date as "YYYY-MM-DD" in local time.
 */
export function localDateStr(date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

/**
 * Format a date string as "Jun 13". Handles both date-only ("YYYY-MM-DD")
 * and ISO timestamps. Date-only strings are parsed as LOCAL midnight (not
 * UTC) so that a Pacific user viewing "2026-06-25" sees "Jun 25" rather
 * than "Jun 24" (UTC midnight = previous evening west of GMT).
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  let d: Date
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const [y, m, day] = dateStr.split('-').map(Number)
    d = new Date(y, m - 1, day)
  } else {
    d = new Date(dateStr)
  }
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format an ISO timestamp as "Jun 13 · 2:30 PM"
 */
export function formatUpdated(isoStr?: string): string {
  if (!isoStr) return '\u2014'
  const d = new Date(isoStr)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' \u00B7 ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

/**
 * Index of a stage in STAGE_ORDER, or -1
 */
export function stageIndex(stage: Stage): number {
  return STAGE_ORDER.indexOf(stage)
}

/**
 * Returns the current "active" stage for the app:
 * - if selectedStage is 'auto', use the team's currentStage
 * - otherwise use selectedStage
 */
export function resolveActiveStage(selectedStage: string, team: Team | null | undefined): Stage {
  return (selectedStage === 'auto' ? (team?.currentStage ?? 'group_stage') : selectedStage) as Stage
}

interface URLParams {
  team: string | null
  date: string | null
  stage: string | null
  view: string | null
}

/**
 * Read team, date, stage, view from the URL search params.
 */
export function readURLParams(): URLParams {
  const p = new URLSearchParams(window.location.search)
  return {
    team:  p.get('team')  ?? null,
    date:  p.get('date')  ?? null,
    stage: p.get('stage') ?? null,
    view:  p.get('view')  ?? null,
  }
}

/**
 * Push team, date, stage, view into the URL (replaceState — no history entry).
 * Omits defaults to keep URLs clean.
 * - view='home' with default team: no params
 * - view='standings': ?view=standings
 * - view='team': ?team=usa (backward compatible — no view param needed)
 */
export function writeURLParams(team: string, date: string, stage: string, view: string, defaultTeam = 'usa'): void {
  const p = new URLSearchParams()
  if (view === 'standings') {
    p.set('view', 'standings')
  } else if (view === 'bracket') {
    p.set('view', 'bracket')
  } else if (view === 'team') {
    if (team && team !== defaultTeam) p.set('team', team)
    // team view is implied by team param — no explicit view param needed
  }
  // view === 'home': no params needed (unless we want explicit ?view=home)
  if (date  && date  !== 'live')      p.set('date',  date)
  if (stage && stage !== 'auto')      p.set('stage', stage)
  const qs = p.toString()
  history.replaceState(null, '', qs ? `?${qs}` : window.location.pathname)
}

/**
 * Safely read a value from localStorage. Returns null on error.
 */
export function lsGet(key: string): string | null {
  try { return localStorage.getItem(key) } catch { return null }
}

/**
 * Safely write a value to localStorage. Silently fails if unavailable.
 */
export function lsSet(key: string, value: string): void {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}

export function getGroupTag(teamName: string, data: AppData | null): { group: string; pos: number } | null {
	if (!data?.groups || !teamName) return null
	for (const [key, g] of Object.entries(data.groups)) {
		const s = g.standings?.find(r => r.team === teamName)
		if (s) return { group: key, pos: s.pos }
	}
	return null
}

const DIFF_LABELS: Record<number, string> = { 1: 'Easy', 2: 'Favorable', 3: 'Moderate', 4: 'Tough', 5: 'Gauntlet' }

interface Entry { difficulty: number; rank: number | null; weight: number }

function extractOpponents(opps: Opponent[], baseWeight = 1): Entry[] {
	return opps
		.filter(o => o.difficulty != null)
		.map(o => ({
			difficulty: o.difficulty!,
			rank: typeof o.fifaRank === 'number' ? o.fifaRank : null,
			weight: (o.pct ?? 100) * baseWeight,
		}))
}

/**
 * Compute a weighted difficulty score and average opponent FIFA rank across all
 * possible r32 + r16 opponents. Weights are proportional to matchup probability.
 */
export function computeScheduleDifficulty(
	team: Team
): { score: number; label: string; avgRank: number | null } | null {
	const entries: Entry[] = []

	for (const bucket of [team.possibleOpponents?.r32, team.possibleOpponents?.r16]) {
		if (!bucket) continue
		if (Array.isArray(bucket)) {
			entries.push(...extractOpponents(bucket as Opponent[]))
		} else if ('scenarios' in bucket) {
			for (const s of (bucket as { scenarios: Scenario[] }).scenarios) {
				entries.push(...extractOpponents(s.opponents, s.probability ?? 1))
			}
		}
	}

	if (entries.length === 0) return null

	const totalWeight = entries.reduce((sum, e) => sum + e.weight, 0)
	if (totalWeight === 0) return null

	const avg = entries.reduce((sum, e) => sum + e.difficulty * e.weight, 0) / totalWeight
	const score = Math.min(5, Math.max(1, Math.round(avg)))

	const rankEntries = entries.filter(e => e.rank != null)
	const rankWeight = rankEntries.reduce((sum, e) => sum + e.weight, 0)
	const avgRank = rankWeight > 0
		? Math.round(rankEntries.reduce((sum, e) => sum + (e.rank! * e.weight), 0) / rankWeight)
		: null

	return { score, label: DIFF_LABELS[score] ?? 'Moderate', avgRank }
}

export function getFeederGroup(team: Team, stage: Stage, data: AppData | null): { key: string; group: GroupData } | null {
  if (!data?.groups) return null

  const desc = team.path?.[stage]?.opponentDesc ?? ''
  const m = desc.match(/Winner\s+Group\s+([A-L])|Runner-up\s+Group\s+([A-L])/i)
  const parsed = (m?.[1] ?? m?.[2])?.toUpperCase()
  if (parsed && parsed !== team.group && data.groups[parsed]) {
    return { key: parsed, group: data.groups[parsed] }
  }

  if (stage === 'r16') {
    const r16Opps = team.possibleOpponents?.r16
    if (Array.isArray(r16Opps) && r16Opps.length) {
      const r16Names = new Set(r16Opps.map(o => o.opponent).filter(Boolean))
      for (const [key, g] of Object.entries(data.groups)) {
        if (key === team.group) continue
        if (g.standings?.some(s => r16Names.has(s.team))) {
          return { key, group: g }
        }
      }
    }
  }

  return null
}