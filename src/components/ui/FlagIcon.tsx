import { CircleFlag } from 'react-circle-flags'
import styles from './FlagIcon.module.css'

const ID_TO_ISO: Record<string, string> = {
	mexico: 'mx', southafrica: 'za', southkorea: 'kr', czechia: 'cz',
	canada: 'ca', bosnia: 'ba', qatar: 'qa', switzerland: 'ch',
	brazil: 'br', morocco: 'ma', haiti: 'ht', scotland: 'gb-sct',
	usa: 'us', paraguay: 'py', australia: 'au', turkey: 'tr',
	germany: 'de', curacao: 'cw', ivorycoast: 'ci', ecuador: 'ec',
	netherlands: 'nl', japan: 'jp', sweden: 'se', tunisia: 'tn',
	belgium: 'be', egypt: 'eg', iran: 'ir', newzealand: 'nz',
	spain: 'es', capeverde: 'cv', saudiarabia: 'sa', uruguay: 'uy',
	france: 'fr', senegal: 'sn', iraq: 'iq', norway: 'no',
	argentina: 'ar', algeria: 'dz', austria: 'at', jordan: 'jo',
	portugal: 'pt', drcongo: 'cd', uzbekistan: 'uz', colombia: 'co',
	england: 'gb-eng', croatia: 'hr', ghana: 'gh', panama: 'pa',
}

const ID_TO_TLA: Record<string, string> = {
	mexico: 'MEX', southafrica: 'RSA', southkorea: 'KOR', czechia: 'CZE',
	canada: 'CAN', bosnia: 'BIH', qatar: 'QAT', switzerland: 'SUI',
	brazil: 'BRA', morocco: 'MAR', haiti: 'HAI', scotland: 'SCO',
	usa: 'USA', paraguay: 'PAR', australia: 'AUS', turkey: 'TUR',
	germany: 'GER', curacao: 'CUW', ivorycoast: 'CIV', ecuador: 'ECU',
	netherlands: 'NED', japan: 'JPN', sweden: 'SWE', tunisia: 'TUN',
	belgium: 'BEL', egypt: 'EGY', iran: 'IRN', newzealand: 'NZL',
	spain: 'ESP', capeverde: 'CPV', saudiarabia: 'KSA', uruguay: 'URU',
	france: 'FRA', senegal: 'SEN', iraq: 'IRQ', norway: 'NOR',
	argentina: 'ARG', algeria: 'ALG', austria: 'AUT', jordan: 'JOR',
	portugal: 'POR', drcongo: 'COD', uzbekistan: 'UZB', colombia: 'COL',
	england: 'ENG', croatia: 'CRO', ghana: 'GHA', panama: 'PAN',
}

const NAME_TO_ID = {
	'Mexico': 'mexico', 'South Africa': 'southafrica', 'South Korea': 'southkorea',
	'Czechia': 'czechia', 'Canada': 'canada', 'Bosnia & Herz.': 'bosnia',
	'Qatar': 'qatar', 'Switzerland': 'switzerland', 'Brazil': 'brazil',
	'Morocco': 'morocco', 'Haiti': 'haiti', 'Scotland': 'scotland',
	'USA': 'usa', 'Paraguay': 'paraguay', 'Australia': 'australia',
	'Türkiye': 'turkey', 'Germany': 'germany', 'Curaçao': 'curacao',
	'Ivory Coast': 'ivorycoast', 'Ecuador': 'ecuador', 'Netherlands': 'netherlands',
	'Japan': 'japan', 'Sweden': 'sweden', 'Tunisia': 'tunisia',
	'Belgium': 'belgium', 'Egypt': 'egypt', 'Iran': 'iran',
	'New Zealand': 'newzealand', 'Spain': 'spain', 'Cape Verde': 'capeverde',
	'Saudi Arabia': 'saudiarabia', 'Uruguay': 'uruguay', 'France': 'france',
	'Senegal': 'senegal', 'Iraq': 'iraq', 'Norway': 'norway',
	'Argentina': 'argentina', 'Algeria': 'algeria', 'Austria': 'austria',
	'Jordan': 'jordan', 'Portugal': 'portugal', 'DR Congo': 'drcongo',
	'Uzbekistan': 'uzbekistan', 'Colombia': 'colombia', 'England': 'england',
	'Croatia': 'croatia', 'Ghana': 'ghana', 'Panama': 'panama',
}

function resolveCode(code?: string, opponentName?: string): string {
	if (code) return code
	if (opponentName) return (NAME_TO_ID as Record<string, string>)[opponentName] || ''
	return ''
}

interface FlagIconProps {
	code?: string
	flag?: string
	name?: string
	small?: boolean
	opponent?: string
}

export default function FlagIcon({ code, flag, name, small, opponent }: FlagIconProps) {
	const resolvedCode = resolveCode(code, opponent)
	const iso = ID_TO_ISO[resolvedCode]
	const tla = ID_TO_TLA[resolvedCode] || ''
	const size = small ? 16 : 22

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