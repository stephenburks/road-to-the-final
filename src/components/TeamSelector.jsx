import { useState, useRef, useCallback, useMemo } from 'react'
import { CONFEDERATIONS } from '../constants'
import { useClickOutside } from '../hooks/useClickOutside'
import styles from './TeamSelector.module.css'

/**
 * Dropdown that lists all 48 teams grouped by confederation.
 * Eliminated teams appear greyed at the bottom.
 * Supports keyboard navigation: Escape closes, ArrowUp/Down moves focus.
 *
 * @param {object[]} teams - full teams array from data
 * @param {string}   selectedId - currently selected team id
 * @param {function} onChange - called with new team id
 */
export default function TeamSelector({ teams, selectedId, onChange }) {
  const [open, setOpen]   = useState(false)
  const [query, setQuery] = useState('')
  const ref               = useRef(null)
  const inputRef          = useRef(null)
  const listRef           = useRef(null)

  const close = useCallback(() => setOpen(false), [])
  useClickOutside(ref, close)

  const selected = useMemo(
    () => teams.find(t => t.id === selectedId),
    [teams, selectedId]
  )

  // Group teams by confederation, sorted by win probability descending
  const grouped = useMemo(() => {
    const q = query.toLowerCase()
    const byConf = {}
    CONFEDERATIONS.forEach(c => { byConf[c] = [] })
    byConf['Eliminated'] = []

    teams.forEach(t => {
      if (q && !t.name.toLowerCase().includes(q) && !(t.confederation ?? '').toLowerCase().includes(q)) return
      if (t.eliminated) {
        byConf['Eliminated'].push(t)
      } else {
        const key = t.confederation ?? 'Other'
        if (!byConf[key]) byConf[key] = []
        byConf[key].push(t)
      }
    })

    // Sort each group by tournament win probability
    Object.values(byConf).forEach(arr => {
      arr.sort((a, b) => (b.advanceProbabilities?.winner ?? 0) - (a.advanceProbabilities?.winner ?? 0))
    })

    return byConf
  }, [teams, query])

  function handleOpen() {
    setOpen(o => !o)
    setQuery('')
    // Focus search input after render
    setTimeout(() => inputRef.current?.focus(), 50)
  }

  function handleSelect(id) {
    onChange(id)
    setOpen(false)
    setQuery('')
  }

  function handleKeyDown(e) {
    if (e.key === 'Escape') setOpen(false)
  }

  return (
    <div
      ref={ref}
      className={styles.wrap}
      onKeyDown={handleKeyDown}
    >
      <button
        className={`${styles.trigger} ${open ? styles.open : ''}`}
        onClick={handleOpen}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={`Select team, current: ${selected?.name ?? 'none'}`}
      >
        <span className={styles.flag} aria-hidden="true">{selected?.flag ?? '🏳️'}</span>
        <span className={styles.name}>{selected?.name ?? 'Select team'}</span>
        <span className={styles.arrow} aria-hidden="true">▾</span>
      </button>

      {open && (
        <div className={styles.dropdown} role="dialog" aria-label="Team selection">
          <input
            ref={inputRef}
            className={styles.search}
            type="search"
            placeholder="Search team or confederation…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            aria-label="Search teams"
            autoComplete="off"
          />

          <ul
            ref={listRef}
            className={styles.list}
            role="listbox"
            aria-label="Teams"
            aria-activedescendant={selectedId}
          >
            {[...CONFEDERATIONS, 'Eliminated'].map(conf => {
              const items = grouped[conf] ?? []
              if (!items.length) return null

              return (
                <li key={conf} role="presentation">
                  <div className={styles.groupLabel} aria-hidden="true">
                    {conf === 'Eliminated' ? '⛔ Eliminated' : `${conf} (${items.length})`}
                  </div>
                  <ul role="group" aria-label={conf}>
                    {items.map(team => (
                      <li
                        key={team.id}
                        id={team.id}
                        role="option"
                        aria-selected={team.id === selectedId}
                        aria-disabled={team.eliminated}
                        className={[
                          styles.option,
                          team.id === selectedId ? styles.active : '',
                          team.eliminated        ? styles.disabled : '',
                        ].join(' ')}
                        onClick={() => !team.eliminated && handleSelect(team.id)}
                      >
                        <span className={styles.optFlag} aria-hidden="true">{team.flag}</span>
                        <span className={styles.optName}>{team.name}</span>
                        {team.eliminated ? (
                          <span className={styles.elimTag} aria-label="Eliminated">OUT</span>
                        ) : (
                          <span className={styles.rank} aria-label={`FIFA rank ${team.fifaRank}`}>
                            #{team.fifaRank}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </div>
  )
}
