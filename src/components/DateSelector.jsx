import { useState, useRef, useCallback } from 'react'
import { useClickOutside } from '../hooks/useClickOutside'
import styles from './DateSelector.module.css'

/**
 * Dropdown to switch between live data and historical snapshots.
 * Hidden when no snapshots are available yet.
 *
 * @param {object}   manifest     - { available[], labels{} } from manifest.json
 * @param {string}   selectedDate - 'live' or 'YYYY-MM-DD'
 * @param {function} onChange     - called with new date string or 'live'
 */
export default function DateSelector({ manifest, selectedDate, onChange }) {
	const [open, setOpen] = useState(false)
	const ref = useRef(null)
	const close = useCallback(() => setOpen(false), [])
	useClickOutside(ref, close)

	if (!manifest?.available?.length) return null

	const isLive = selectedDate === 'live'
	const label = isLive ? 'Live' : (manifest.labels?.[selectedDate] ?? selectedDate)

	function handleSelect(value) {
		onChange(value)
		setOpen(false)
	}

	return (
		<div ref={ref} className={styles.wrap}>
			<button
				className={`${styles.trigger} ${isLive ? '' : styles.historical} ${open ? styles.open : ''}`}
				onClick={() => setOpen((o) => !o)}
				aria-haspopup="listbox"
				aria-expanded={open}
				aria-label={`Date view: ${label}`}
			>
				<span aria-hidden="true">{isLive ? '📡' : '📅'}</span>
				<span>{label}</span>
				<span className={styles.arrow} aria-hidden="true">
					▾
				</span>
			</button>

			{open && (
				<div className={styles.dropdown} role="dialog" aria-label="Date selection">
					{/* Live option */}
					<button
						className={`${styles.liveOption} ${isLive ? styles.liveActive : ''}`}
						onClick={() => handleSelect('live')}
						aria-pressed={isLive}
					>
						<span className={styles.liveDot} aria-hidden="true" />
						Live (current)
					</button>

					{/* Historical snapshots */}
					<div className={styles.groupLabel}>Historical snapshots</div>
					<ul className={styles.list} role="listbox" aria-label="Historical snapshots">
						{[...(manifest.available ?? [])].reverse().map((date) => (
							<li
								key={date}
								role="option"
								aria-selected={selectedDate === date}
								className={`${styles.option} ${selectedDate === date ? styles.active : ''}`}
								onClick={() => handleSelect(date)}
							>
								<span aria-hidden="true">📅</span>
								<span className={styles.dateLabel}>{manifest.labels?.[date] ?? date}</span>
							</li>
						))}
					</ul>
				</div>
			)}
		</div>
	)
}
