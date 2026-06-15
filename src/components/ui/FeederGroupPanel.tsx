import type { GroupData } from '../../types'
import { GroupTable } from './GroupTable'
import styles from './FeederGroupPanel.module.css'

interface FeederGroupPanelProps {
	feeder: { key: string; group: GroupData }
	explanation: string
	marginTop?: number
}

export default function FeederGroupPanel({ feeder, explanation, marginTop }: FeederGroupPanelProps) {
	return (
		<div
			className={styles.panel}
			style={marginTop !== undefined ? { marginTop } : undefined}
		>
			<div className={styles.explanation}>{explanation}</div>
			<GroupTable groupKey={feeder.key} groupData={feeder.group} highlightTeamId={null} />
		</div>
	)
}
