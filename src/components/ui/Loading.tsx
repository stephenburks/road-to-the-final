import styles from './Loading.module.css'

/**
 * Centered loading spinner with an optional message.
 * Accessible: role="status" + aria-live="polite"
 */
export default function Loading({ message = 'Loading match data…' }) {
  return (
    <div
      className={styles.container}
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className={styles.spinner} aria-hidden="true" />
      <p className={styles.message}>{message}</p>
    </div>
  )
}
