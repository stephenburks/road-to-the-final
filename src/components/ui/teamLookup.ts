const TEAM_MAPPINGS = [
	{ id: 'mexico',      iso: 'mx',     tla: 'MEX', name: 'Mexico' },
	{ id: 'southafrica', iso: 'za',     tla: 'RSA', name: 'South Africa' },
	{ id: 'southkorea',  iso: 'kr',     tla: 'KOR', name: 'South Korea' },
	{ id: 'czechia',     iso: 'cz',     tla: 'CZE', name: 'Czechia' },
	{ id: 'canada',      iso: 'ca',     tla: 'CAN', name: 'Canada' },
	{ id: 'bosnia',      iso: 'ba',     tla: 'BIH', name: 'Bosnia & Herz.' },
	{ id: 'qatar',       iso: 'qa',     tla: 'QAT', name: 'Qatar' },
	{ id: 'switzerland', iso: 'ch',     tla: 'SUI', name: 'Switzerland' },
	{ id: 'brazil',      iso: 'br',     tla: 'BRA', name: 'Brazil' },
	{ id: 'morocco',     iso: 'ma',     tla: 'MAR', name: 'Morocco' },
	{ id: 'haiti',       iso: 'ht',     tla: 'HAI', name: 'Haiti' },
	{ id: 'scotland',    iso: 'gb-sct', tla: 'SCO', name: 'Scotland' },
	{ id: 'usa',         iso: 'us',     tla: 'USA', name: 'USA' },
	{ id: 'paraguay',    iso: 'py',     tla: 'PAR', name: 'Paraguay' },
	{ id: 'australia',   iso: 'au',     tla: 'AUS', name: 'Australia' },
	{ id: 'turkey',      iso: 'tr',     tla: 'TUR', name: 'Türkiye' },
	{ id: 'germany',     iso: 'de',     tla: 'GER', name: 'Germany' },
	{ id: 'curacao',     iso: 'cw',     tla: 'CUW', name: 'Curaçao' },
	{ id: 'ivorycoast',  iso: 'ci',     tla: 'CIV', name: 'Ivory Coast' },
	{ id: 'ecuador',     iso: 'ec',     tla: 'ECU', name: 'Ecuador' },
	{ id: 'netherlands', iso: 'nl',     tla: 'NED', name: 'Netherlands' },
	{ id: 'japan',       iso: 'jp',     tla: 'JPN', name: 'Japan' },
	{ id: 'sweden',      iso: 'se',     tla: 'SWE', name: 'Sweden' },
	{ id: 'tunisia',     iso: 'tn',     tla: 'TUN', name: 'Tunisia' },
	{ id: 'belgium',     iso: 'be',     tla: 'BEL', name: 'Belgium' },
	{ id: 'egypt',       iso: 'eg',     tla: 'EGY', name: 'Egypt' },
	{ id: 'iran',        iso: 'ir',     tla: 'IRN', name: 'Iran' },
	{ id: 'newzealand',  iso: 'nz',     tla: 'NZL', name: 'New Zealand' },
	{ id: 'spain',       iso: 'es',     tla: 'ESP', name: 'Spain' },
	{ id: 'capeverde',   iso: 'cv',     tla: 'CPV', name: 'Cape Verde' },
	{ id: 'saudiarabia', iso: 'sa',     tla: 'KSA', name: 'Saudi Arabia' },
	{ id: 'uruguay',     iso: 'uy',     tla: 'URU', name: 'Uruguay' },
	{ id: 'france',      iso: 'fr',     tla: 'FRA', name: 'France' },
	{ id: 'senegal',     iso: 'sn',     tla: 'SEN', name: 'Senegal' },
	{ id: 'iraq',        iso: 'iq',     tla: 'IRQ', name: 'Iraq' },
	{ id: 'norway',      iso: 'no',     tla: 'NOR', name: 'Norway' },
	{ id: 'argentina',   iso: 'ar',     tla: 'ARG', name: 'Argentina' },
	{ id: 'algeria',     iso: 'dz',     tla: 'ALG', name: 'Algeria' },
	{ id: 'austria',     iso: 'at',     tla: 'AUT', name: 'Austria' },
	{ id: 'jordan',      iso: 'jo',     tla: 'JOR', name: 'Jordan' },
	{ id: 'portugal',    iso: 'pt',     tla: 'POR', name: 'Portugal' },
	{ id: 'drcongo',     iso: 'cd',     tla: 'COD', name: 'DR Congo' },
	{ id: 'uzbekistan',  iso: 'uz',     tla: 'UZB', name: 'Uzbekistan' },
	{ id: 'colombia',    iso: 'co',     tla: 'COL', name: 'Colombia' },
	{ id: 'england',     iso: 'gb-eng', tla: 'ENG', name: 'England' },
	{ id: 'croatia',     iso: 'hr',     tla: 'CRO', name: 'Croatia' },
	{ id: 'ghana',       iso: 'gh',     tla: 'GHA', name: 'Ghana' },
	{ id: 'panama',      iso: 'pa',     tla: 'PAN', name: 'Panama' },
] as const

export const ID_TO_ISO  = Object.fromEntries(TEAM_MAPPINGS.map(t => [t.id,  t.iso]))
export const ID_TO_TLA  = Object.fromEntries(TEAM_MAPPINGS.map(t => [t.id,  t.tla]))
export const NAME_TO_ID = Object.fromEntries(TEAM_MAPPINGS.map(t => [t.name, t.id]))
export const TLA_TO_ID  = Object.fromEntries(TEAM_MAPPINGS.map(t => [t.tla,  t.id]))

export function getTeamTLA(id?: string, name?: string): string {
	const resolvedId = id || (name ? NAME_TO_ID[name] : '') || ''
	return ID_TO_TLA[resolvedId] || ''
}

export function getTeamIdByTLA(tla?: string): string | undefined {
	if (!tla) return undefined
	return TLA_TO_ID[tla.toUpperCase()]
}
