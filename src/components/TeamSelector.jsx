import { useState, useRef, useCallback, useMemo } from 'react'
import { CONFEDERATIONS } from '../constants'
import { useClickOutside } from '../hooks/useClickOutside'
import { useTeamSearch } from '../hooks/useTeamSearch'
import styles from './TeamSelector.module.css'

export default function TeamSelector({ teams, selectedId, onChange }) {
	const [open, setOpen]   = useState(false)
	const [query, setQuery] = useState('')
	const [focusedIdx, setFocusedIdx] = useState(-1)
	const ref               = useRef(null)
	const inputRef          = useRef(null)

	const close = useCallback(() => {
		setOpen(false)
		setFocusedIdx(-1)
	}, [])
	useClickOutside(ref, close)

	const selected = useMemo(
		() => teams.find(t => t.id === selectedId),
		[teams, selectedId]
	)

	const { grouped, flatItems } = useTeamSearch(teams, query, CONFEDERATIONS)

	function handleOpen() {
		setOpen(o => !o)
		setQuery('')
		setFocusedIdx(-1)
		setTimeout(() => inputRef.current?.focus(), 50)
	}

	function handleSelect(id) {
		onChange(id)
		setOpen(false)
		setQuery('')
		setFocusedIdx(-1)
	}

	function handleKeyDown(e) {
		if (e.key === 'Escape') {
			setOpen(false)
			setFocusedIdx(-1)
			return
		}

		if (!open) return

		if (e.key === 'ArrowDown') {
			e.preventDefault()
			const selectable = flatItems.filter(t => !t.eliminated)
			setFocusedIdx(prev => {
				const next = prev < 0 ? 0 : prev + 1
				return Math.min(next, selectable.length - 1)
			})
			return
		}

		if (e.key === 'ArrowUp') {
			e.preventDefault()
			const selectable = flatItems.filter(t => !t.eliminated)
			setFocusedIdx(prev => {
				const next = prev <= 0 ? selectable.length - 1 : prev - 1
				return Math.max(next, 0)
			})
			return
		}

		if (e.key === 'Enter' && focusedIdx >= 0) {
			const selectable = flatItems.filter(t => !t.eliminated)
			const team = selectable[focusedIdx]
			if (team) handleSelect(team.id)
		}
	}

	const selectableItems = flatItems.filter(t => !t.eliminated)
	const focusedId = focusedIdx >= 0 ? selectableItems[focusedIdx]?.id : null

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
						onChange={e => { setQuery(e.target.value); setFocusedIdx(-1) }}
						aria-label="Search teams"
						autoComplete="off"
					/>

					<ul
						className={styles.list}
						role="listbox"
						aria-label="Teams"
						aria-activedescendant={focusedId ?? selectedId}
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
										{items.map(team => {
											const isFocused = team.id === focusedId
											const isSelected = team.id === selectedId
											return (
												<li
													key={team.id}
													id={team.id}
													role="option"
													aria-selected={isSelected}
													aria-disabled={team.eliminated}
													className={[
														styles.option,
														isSelected ? styles.active : '',
														team.eliminated ? styles.disabled : '',
														isFocused ? styles.focused : '',
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
											)
										})}
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