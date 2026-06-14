import { STAGE_ORDER } from './constants'

/**
 * Days until a given date string (YYYY-MM-DD or ISO).
 * Returns null if the string doesn't look like a full date.
 */
export function daysUntil(dateStr) {
  if (!dateStr?.match(/^\d{4}/)) return null
  return Math.ceil((new Date(dateStr) - new Date()) / 864e5)
}

/**
 * Format a date string as "Jun 13"
 */
export function formatDate(dateStr) {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

/**
 * Format an ISO timestamp as "Jun 13 · 2:30 PM"
 */
export function formatUpdated(isoStr) {
  if (!isoStr) return '—'
  const d = new Date(isoStr)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' · ' +
    d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
  )
}

/**
 * Format a goal difference as "+3" or "-1"
 */
export function formatGD(n) {
  return n > 0 ? `+${n}` : `${n}`
}

/**
 * Index of a stage in STAGE_ORDER, or -1
 */
export function stageIndex(stage) {
  return STAGE_ORDER.indexOf(stage)
}

/**
 * Returns the current "active" stage for the app:
 * - if selectedStage is 'auto', use the team's currentStage
 * - otherwise use selectedStage
 */
export function resolveActiveStage(selectedStage, team) {
  return selectedStage === 'auto' ? (team?.currentStage ?? 'group_stage') : selectedStage
}

/**
 * Read team, date, stage from the URL search params.
 */
export function readURLParams() {
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
export function writeURLParams(team, date, stage, defaultTeam = 'usa') {
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
export function lsGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

/**
 * Safely write a value to localStorage. Silently fails if unavailable.
 */
export function lsSet(key, value) {
  try { localStorage.setItem(key, value) } catch { /* noop */ }
}
