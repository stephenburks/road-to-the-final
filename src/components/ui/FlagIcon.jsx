import styles from './FlagIcon.module.css'

const ID_TO_CODE = {
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

export default function FlagIcon({ code, flag, name, small }) {
	const countryCode = ID_TO_CODE[code] || ''
	return (
		<span
			className={styles.wrap}
			aria-label={name ? `${name} flag` : undefined}
		>
			<span aria-hidden="true" style={small ? { fontSize: 15 } : undefined}>
				{flag ?? '🏳️'}
			</span>
			{countryCode && <span className={styles.code}>{countryCode}</span>}
		</span>
	)
}
