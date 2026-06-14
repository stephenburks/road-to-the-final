import { STAGE_LABELS } from '../../constants'
import FlagIcon from './FlagIcon'
import styles from './EliminatedView.module.css'

/**
 * Shown when the selected team has been knocked out.
 * Encourages the user to try the historical view.
 */
export default function EliminatedView({ team }) {
  const stage = STAGE_LABELS[team.currentStage] ?? 'the tournament'

  return (
    <div className="wrap">
      <div className={styles.card} role="status">
        <FlagIcon code={team.id} flag={team.flag} name={team.name} />
        <h2 className={styles.title}>{team.name} · Journey Ended</h2>
        <p className={styles.subtitle}>
          Knocked out in the {stage}. Use the date selector above
          to replay their run through the tournament.
        </p>
      </div>
    </div>
  )
}
