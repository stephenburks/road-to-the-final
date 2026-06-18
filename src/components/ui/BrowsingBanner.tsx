import FlagIcon from './FlagIcon'
import type { Team } from '../../types'
import styles from './BrowsingBanner.module.css'

interface BrowsingBannerProps {
	viewing: Team
	preferred: Team
	onReturn: () => void
}

export default function BrowsingBanner({ viewing, preferred, onReturn }: BrowsingBannerProps) {
	return (
		<div className={styles.banner} role="status" aria-live="polite">
			<div className={`wrap ${styles.inner}`}>
				<span className={styles.label}>Browsing</span>
				<FlagIcon code={viewing.id} flag={viewing.flag} name={viewing.name} />
				<span className={styles.viewingName}>{viewing.name}</span>
				<button type="button" onClick={onReturn} className={styles.btn} aria-label={`Return to ${preferred.name}`}>
					{'←'} Back to <FlagIcon code={preferred.id} flag={preferred.flag} small />
				</button>
			</div>
		</div>
	)
}
