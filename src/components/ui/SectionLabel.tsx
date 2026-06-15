import styles from './SectionLabel.module.css'

/**
 * A decorative section heading with flanking lines.
 * Usage: <SectionLabel text="Group Stage Tracker" />
 */
export default function SectionLabel({ text }: { text: string }) {
  return (
    <div className={styles.label}>
      <div className={styles.lineShort} aria-hidden="true" />
      <span>{text}</span>
      <div className={styles.lineLong} aria-hidden="true" />
    </div>
  )
}
