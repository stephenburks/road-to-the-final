'use strict';

/**
 * Canonical registry for all 48 World Cup 2026 teams.
 *
 * Single source of truth — both scripts/update-data.js (CJS, Node) and the
 * client app (TS, Vite) import from here. Never duplicate this data elsewhere;
 * add new aliases or fields here and update the derived maps below.
 *
 * Fields:
 *   id              internal stable identifier (lowercase, no whitespace)
 *   name            canonical display name (matches ESPN displayName where possible)
 *   flag            emoji flag (display fallback when SVG flag is unavailable)
 *   iso             ISO 3166-1 alpha-2 (or gb-* subdivisions) for react-circle-flags
 *   tla             FIFA three-letter abbreviation
 *   group           A–L
 *   confederation   UEFA | CONMEBOL | CONCACAF | AFC | CAF | OFC
 *   fifaRank        FIFA world ranking (used for difficulty scoring)
 *   espnSlug        ESPN team-endpoint slug
 *   polymarketTlas  ordered list of Polymarket matchup-slug TLAs to try
 *   aliases         alternate display names used by ESPN/Polymarket
 */
const TEAMS = [
	{ id: 'mexico',      name: 'Mexico',         flag: '🇲🇽', iso: 'mx',     tla: 'MEX', group: 'A', confederation: 'CONCACAF', fifaRank: 15, espnSlug: 'mex',   polymarketTlas: ['mex'],         aliases: [] },
	{ id: 'southafrica', name: 'South Africa',   flag: '🇿🇦', iso: 'za',     tla: 'RSA', group: 'A', confederation: 'CAF',      fifaRank: 58, espnSlug: 'rsa',   polymarketTlas: ['rsa'],         aliases: [] },
	{ id: 'southkorea',  name: 'South Korea',    flag: '🇰🇷', iso: 'kr',     tla: 'KOR', group: 'A', confederation: 'AFC',      fifaRank: 22, espnSlug: 'kors',  polymarketTlas: ['kor', 'kr'],   aliases: [] },
	{ id: 'czechia',     name: 'Czechia',        flag: '🇨🇿', iso: 'cz',     tla: 'CZE', group: 'A', confederation: 'UEFA',     fifaRank: 37, espnSlug: 'cze',   polymarketTlas: ['cze'],         aliases: ['Czech Republic'] },
	{ id: 'canada',      name: 'Canada',         flag: '🇨🇦', iso: 'ca',     tla: 'CAN', group: 'B', confederation: 'CONCACAF', fifaRank: 27, espnSlug: 'can',   polymarketTlas: ['can'],         aliases: [] },
	{ id: 'bosnia',      name: 'Bosnia & Herz.', flag: '🇧🇦', iso: 'ba',     tla: 'BIH', group: 'B', confederation: 'UEFA',     fifaRank: 71, espnSlug: 'bih',   polymarketTlas: ['bih'],         aliases: ['Bosnia and Herzegovina', 'Bosnia-Herzegovina', 'Bosnia'] },
	{ id: 'qatar',       name: 'Qatar',          flag: '🇶🇦', iso: 'qa',     tla: 'QAT', group: 'B', confederation: 'AFC',      fifaRank: 51, espnSlug: 'qat',   polymarketTlas: ['qat'],         aliases: [] },
	{ id: 'switzerland', name: 'Switzerland',    flag: '🇨🇭', iso: 'ch',     tla: 'SUI', group: 'B', confederation: 'UEFA',     fifaRank: 17, espnSlug: 'sui',   polymarketTlas: ['che'],         aliases: [] },
	{ id: 'brazil',      name: 'Brazil',         flag: '🇧🇷', iso: 'br',     tla: 'BRA', group: 'C', confederation: 'CONMEBOL', fifaRank:  4, espnSlug: 'bra',   polymarketTlas: ['bra'],         aliases: [] },
	{ id: 'morocco',     name: 'Morocco',        flag: '🇲🇦', iso: 'ma',     tla: 'MAR', group: 'C', confederation: 'CAF',      fifaRank: 14, espnSlug: 'mar',   polymarketTlas: ['mar'],         aliases: [] },
	{ id: 'haiti',       name: 'Haiti',          flag: '🇭🇹', iso: 'ht',     tla: 'HAI', group: 'C', confederation: 'CONCACAF', fifaRank: 83, espnSlug: 'hai',   polymarketTlas: ['hai'],         aliases: [] },
	{ id: 'scotland',    name: 'Scotland',       flag: '🏴󠁧󠁢󠁳󠁣󠁴󠁿', iso: 'gb-sct', tla: 'SCO', group: 'C', confederation: 'UEFA',     fifaRank: 39, espnSlug: 'sco',   polymarketTlas: ['sco'],         aliases: [] },
	{ id: 'usa',         name: 'USA',            flag: '🇺🇸', iso: 'us',     tla: 'USA', group: 'D', confederation: 'CONCACAF', fifaRank: 14, espnSlug: 'usa',   polymarketTlas: ['usa'],         aliases: ['United States'] },
	{ id: 'paraguay',    name: 'Paraguay',       flag: '🇵🇾', iso: 'py',     tla: 'PAR', group: 'D', confederation: 'CONMEBOL', fifaRank: 39, espnSlug: 'par',   polymarketTlas: ['par'],         aliases: [] },
	{ id: 'australia',   name: 'Australia',      flag: '🇦🇺', iso: 'au',     tla: 'AUS', group: 'D', confederation: 'AFC',      fifaRank: 26, espnSlug: 'aus',   polymarketTlas: ['aus'],         aliases: [] },
	{ id: 'turkey',      name: 'Türkiye',        flag: '🇹🇷', iso: 'tr',     tla: 'TUR', group: 'D', confederation: 'UEFA',     fifaRank: 25, espnSlug: 'tur',   polymarketTlas: ['tur'],         aliases: ['Turkey', 'Turkiye'] },
	{ id: 'germany',     name: 'Germany',        flag: '🇩🇪', iso: 'de',     tla: 'GER', group: 'E', confederation: 'UEFA',     fifaRank:  9, espnSlug: 'ger',   polymarketTlas: ['ger'],         aliases: [] },
	{ id: 'curacao',     name: 'Curaçao',        flag: '🇨🇼', iso: 'cw',     tla: 'CUW', group: 'E', confederation: 'CONCACAF', fifaRank: 82, espnSlug: '11678', polymarketTlas: ['cuw'],         aliases: ['Curacao'] },
	{ id: 'ivorycoast',  name: 'Ivory Coast',    flag: '🇨🇮', iso: 'ci',     tla: 'CIV', group: 'E', confederation: 'CAF',      fifaRank: 42, espnSlug: 'civ',   polymarketTlas: ['civ'],         aliases: ["Côte d'Ivoire"] },
	{ id: 'ecuador',     name: 'Ecuador',        flag: '🇪🇨', iso: 'ec',     tla: 'ECU', group: 'E', confederation: 'CONMEBOL', fifaRank: 23, espnSlug: 'ecu',   polymarketTlas: ['ecu'],         aliases: [] },
	{ id: 'netherlands', name: 'Netherlands',    flag: '🇳🇱', iso: 'nl',     tla: 'NED', group: 'F', confederation: 'UEFA',     fifaRank:  7, espnSlug: 'ned',   polymarketTlas: ['nld'],         aliases: [] },
	{ id: 'japan',       name: 'Japan',          flag: '🇯🇵', iso: 'jp',     tla: 'JPN', group: 'F', confederation: 'AFC',      fifaRank: 13, espnSlug: 'jpn',   polymarketTlas: ['jpn'],         aliases: [] },
	{ id: 'sweden',      name: 'Sweden',         flag: '🇸🇪', iso: 'se',     tla: 'SWE', group: 'F', confederation: 'UEFA',     fifaRank: 29, espnSlug: 'swe',   polymarketTlas: ['swe'],         aliases: [] },
	{ id: 'tunisia',     name: 'Tunisia',        flag: '🇹🇳', iso: 'tn',     tla: 'TUN', group: 'F', confederation: 'CAF',      fifaRank: 36, espnSlug: 'tun',   polymarketTlas: ['tun'],         aliases: [] },
	{ id: 'belgium',     name: 'Belgium',        flag: '🇧🇪', iso: 'be',     tla: 'BEL', group: 'G', confederation: 'UEFA',     fifaRank:  9, espnSlug: 'bel',   polymarketTlas: ['bel'],         aliases: [] },
	{ id: 'egypt',       name: 'Egypt',          flag: '🇪🇬', iso: 'eg',     tla: 'EGY', group: 'G', confederation: 'CAF',      fifaRank: 34, espnSlug: 'egy',   polymarketTlas: ['egy'],         aliases: [] },
	{ id: 'iran',        name: 'Iran',           flag: '🇮🇷', iso: 'ir',     tla: 'IRN', group: 'G', confederation: 'AFC',      fifaRank: 21, espnSlug: 'irn',   polymarketTlas: ['irn'],         aliases: [] },
	{ id: 'newzealand',  name: 'New Zealand',    flag: '🇳🇿', iso: 'nz',     tla: 'NZL', group: 'G', confederation: 'OFC',      fifaRank: 86, espnSlug: 'nzl',   polymarketTlas: ['nzl'],         aliases: [] },
	{ id: 'spain',       name: 'Spain',          flag: '🇪🇸', iso: 'es',     tla: 'ESP', group: 'H', confederation: 'UEFA',     fifaRank:  1, espnSlug: 'esp',   polymarketTlas: ['esp'],         aliases: [] },
	{ id: 'capeverde',   name: 'Cape Verde',     flag: '🇨🇻', iso: 'cv',     tla: 'CPV', group: 'H', confederation: 'CAF',      fifaRank: 62, espnSlug: 'cpv',   polymarketTlas: ['cvi'],         aliases: [] },
	{ id: 'saudiarabia', name: 'Saudi Arabia',   flag: '🇸🇦', iso: 'sa',     tla: 'KSA', group: 'H', confederation: 'AFC',      fifaRank: 55, espnSlug: 'ksa',   polymarketTlas: ['ksa'],         aliases: [] },
	{ id: 'uruguay',     name: 'Uruguay',        flag: '🇺🇾', iso: 'uy',     tla: 'URU', group: 'H', confederation: 'CONMEBOL', fifaRank: 18, espnSlug: 'uru',   polymarketTlas: ['ury'],         aliases: [] },
	{ id: 'france',      name: 'France',         flag: '🇫🇷', iso: 'fr',     tla: 'FRA', group: 'I', confederation: 'UEFA',     fifaRank:  3, espnSlug: 'fra',   polymarketTlas: ['fra'],         aliases: [] },
	{ id: 'senegal',     name: 'Senegal',        flag: '🇸🇳', iso: 'sn',     tla: 'SEN', group: 'I', confederation: 'CAF',      fifaRank: 14, espnSlug: 'sen',   polymarketTlas: ['sen'],         aliases: [] },
	{ id: 'iraq',        name: 'Iraq',           flag: '🇮🇶', iso: 'iq',     tla: 'IRQ', group: 'I', confederation: 'AFC',      fifaRank: 58, espnSlug: 'irq',   polymarketTlas: ['irq'],         aliases: [] },
	{ id: 'norway',      name: 'Norway',         flag: '🇳🇴', iso: 'no',     tla: 'NOR', group: 'I', confederation: 'UEFA',     fifaRank: 31, espnSlug: 'nor',   polymarketTlas: ['nor'],         aliases: [] },
	{ id: 'argentina',   name: 'Argentina',      flag: '🇦🇷', iso: 'ar',     tla: 'ARG', group: 'J', confederation: 'CONMEBOL', fifaRank:  2, espnSlug: 'arg',   polymarketTlas: ['arg'],         aliases: [] },
	{ id: 'algeria',     name: 'Algeria',        flag: '🇩🇿', iso: 'dz',     tla: 'ALG', group: 'J', confederation: 'CAF',      fifaRank: 35, espnSlug: 'alg',   polymarketTlas: ['alg'],         aliases: [] },
	{ id: 'austria',     name: 'Austria',        flag: '🇦🇹', iso: 'at',     tla: 'AUT', group: 'J', confederation: 'UEFA',     fifaRank: 24, espnSlug: 'aut',   polymarketTlas: ['aut'],         aliases: [] },
	{ id: 'jordan',      name: 'Jordan',         flag: '🇯🇴', iso: 'jo',     tla: 'JOR', group: 'J', confederation: 'AFC',      fifaRank: 66, espnSlug: 'jor',   polymarketTlas: ['jor'],         aliases: [] },
	{ id: 'portugal',    name: 'Portugal',       flag: '🇵🇹', iso: 'pt',     tla: 'POR', group: 'K', confederation: 'UEFA',     fifaRank:  6, espnSlug: 'por',   polymarketTlas: ['prt'],         aliases: [] },
	{ id: 'drcongo',     name: 'DR Congo',       flag: '🇨🇩', iso: 'cd',     tla: 'COD', group: 'K', confederation: 'CAF',      fifaRank: 56, espnSlug: 'rdc',   polymarketTlas: ['cdr'],         aliases: ['Congo DR'] },
	{ id: 'uzbekistan',  name: 'Uzbekistan',     flag: '🇺🇿', iso: 'uz',     tla: 'UZB', group: 'K', confederation: 'AFC',      fifaRank: 50, espnSlug: 'uzb',   polymarketTlas: ['uzb'],         aliases: [] },
	{ id: 'colombia',    name: 'Colombia',       flag: '🇨🇴', iso: 'co',     tla: 'COL', group: 'K', confederation: 'CONMEBOL', fifaRank: 13, espnSlug: 'col',   polymarketTlas: ['col'],         aliases: [] },
	{ id: 'england',     name: 'England',        flag: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', iso: 'gb-eng', tla: 'ENG', group: 'L', confederation: 'UEFA',     fifaRank:  5, espnSlug: 'eng',   polymarketTlas: ['eng'],         aliases: [] },
	{ id: 'croatia',     name: 'Croatia',        flag: '🇭🇷', iso: 'hr',     tla: 'CRO', group: 'L', confederation: 'UEFA',     fifaRank: 10, espnSlug: 'cro',   polymarketTlas: ['hrv'],         aliases: [] },
	{ id: 'ghana',       name: 'Ghana',          flag: '🇬🇭', iso: 'gh',     tla: 'GHA', group: 'L', confederation: 'CAF',      fifaRank: 60, espnSlug: 'gha',   polymarketTlas: ['gha'],         aliases: [] },
	{ id: 'panama',      name: 'Panama',         flag: '🇵🇦', iso: 'pa',     tla: 'PAN', group: 'L', confederation: 'CONCACAF', fifaRank: 76, espnSlug: 'pan',   polymarketTlas: ['pan'],         aliases: [] },
];

// ─── Derived lookups ─────────────────────────────────────────────────────────
const BY_ID = Object.fromEntries(TEAMS.map(t => [t.id, t]));

const ID_TO_ISO   = Object.fromEntries(TEAMS.map(t => [t.id, t.iso]));
const ID_TO_TLA   = Object.fromEntries(TEAMS.map(t => [t.id, t.tla]));
const ID_TO_FLAG  = Object.fromEntries(TEAMS.map(t => [t.id, t.flag]));
const ID_TO_NAME  = Object.fromEntries(TEAMS.map(t => [t.id, t.name]));
const ID_TO_GROUP = Object.fromEntries(TEAMS.map(t => [t.id, t.group]));
const ID_TO_RANK  = Object.fromEntries(TEAMS.map(t => [t.id, t.fifaRank]));
const TLA_TO_ID   = Object.fromEntries(TEAMS.map(t => [t.tla, t.id]));

const ESPN_SLUG_MAP  = Object.fromEntries(TEAMS.map(t => [t.id, t.espnSlug]));
const ID_TO_PM_TLAS  = Object.fromEntries(TEAMS.map(t => [t.id, t.polymarketTlas.slice()]));

/**
 * Name (and every alias) → id. Used by ESPN/Polymarket payload parsers to
 * resolve display strings to our internal team ids. Keep aliases listed on
 * the team record above; never add a fallback alias map elsewhere.
 */
const NAME_TO_ID = (() => {
	const map = {};
	for (const t of TEAMS) {
		map[t.name] = t.id;
		for (const a of t.aliases) map[a] = t.id;
	}
	return map;
})();

function nameToId(name) {
	if (!name) return null;
	return NAME_TO_ID[name] || null;
}

function getTeamById(id) {
	return BY_ID[id] || null;
}

function getTeamByTLA(tla) {
	if (!tla) return null;
	return BY_ID[TLA_TO_ID[tla.toUpperCase()]] || null;
}

module.exports = {
	TEAMS,
	BY_ID,
	NAME_TO_ID,
	ID_TO_ISO,
	ID_TO_TLA,
	ID_TO_FLAG,
	ID_TO_NAME,
	ID_TO_GROUP,
	ID_TO_RANK,
	TLA_TO_ID,
	ESPN_SLUG_MAP,
	ID_TO_PM_TLAS,
	nameToId,
	getTeamById,
	getTeamByTLA,
};
