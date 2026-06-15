import { STAGE_ORDER } from './constants'
import type { Stage, Team, AppData, GroupData } from './types'

/**
 * Days until a given date string (YYYY-MM-DD or ISO).
 * Returns null if the string doesn't look like a full date.
 */
export function daysUntil(dateStr?: string): number | null {
  if (!dateStr?.match(/^\d{4}/)) return null
  return Math.ceil((new Date(dateStr).getTime() - Date.now()) / 864e5)
}

/**
 * Format a date string as "Jun 13"
 */
export function formatDate(dateStr?: string): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
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
}

/**
 * Read team, date, stage from the URL search params.
 */
export function readURLParams(): URLParams {
  const p = new URLSearchParams(window.location.search)
  return {
    team:  p.get('team')  ?? null,
    date:  p.get('date')  ?? null,
    stage: p.get('stage') ?? null,
  }
}

/**
 * Push team, date, stage into the URL (replaceState — no history entry).
 * Omits defaults to keep URLs clean.
 */
export function writeURLParams(team: string, date: string, stage: string, defaultTeam = 'usa'): void {
  const p = new URLSearchParams()
  if (team  && team  !== defaultTeam) p.set('team',  team)
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