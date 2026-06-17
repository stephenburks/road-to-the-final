import { CircleFlag } from 'react-circle-flags'
import { ID_TO_ISO, ID_TO_TLA, NAME_TO_ID } from './teamLookup'
import styles from './FlagIcon.module.css'

function resolveCode(code?: string, opponentName?: string): string {
	if (code) return code
	if (opponentName) return NAME_TO_ID[opponentName] || ''
	return ''
}

interface FlagIconProps {
	code?: string
	flag?: string
	name?: string
	small?: boolean
	size?: number
	opponent?: string
}

export default function FlagIcon({ code, flag, name, small, size: sizeProp, opponent }: FlagIconProps) {
	const resolvedCode = resolveCode(code, opponent)
	const iso = ID_TO_ISO[resolvedCode]
	const tla = ID_TO_TLA[resolvedCode] || ''
	const size = sizeProp ?? (small ? 16 : 22)

	if (iso) {
		return (
			<span
				className={styles.wrap}
				aria-label={name ? `${name} flag` : undefined}
			>
				<CircleFlag countryCode={iso} height={size} width={size} />
				{small && tla && <span className={styles.code}>{tla}</span>}
			</span>
		)
	}

	return (
		<span
			className={styles.wrap}
			aria-label={name ? `${name} flag` : undefined}
		>
			<span aria-hidden="true" style={small ? { fontSize: 15 } : undefined}>
				{flag ?? '🏳️'}
			</span>
			{tla && <span className={styles.code}>{tla}</span>}
		</span>
	)
}
