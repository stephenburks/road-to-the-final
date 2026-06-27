/**
 * Canonical World Cup 2026 tournament structure: group-stage schedule and
 * knockout bracket paths. Imported by both scripts/update-data.mjs and the
 * client app (via src/data/tournament.ts) — never duplicate this data.
 */

export const STAGE_ORDER = ['group_stage', 'r32', 'r16', 'qf', 'sf', 'final']
export const KNOCKOUT_STAGES = ['r32', 'r16', 'qf', 'sf', 'final']

// ─── Group-stage schedule ────────────────────────────────────────────────────
// { md: matchday, h: homeId, a: awayId, d: local date YYYY-MM-DD, v: venue }
export const GROUP_SCHEDULE = {
	A: [
		{ md: 1, h: 'mexico',      a: 'southafrica', d: '2026-06-11', v: 'Estadio Azteca, Mexico City' },
		{ md: 1, h: 'southkorea',  a: 'czechia',     d: '2026-06-11', v: 'Estadio Akron, Zapopan' },
		{ md: 2, h: 'czechia',     a: 'southafrica', d: '2026-06-18', v: 'Mercedes-Benz Stadium, Atlanta' },
		{ md: 2, h: 'mexico',      a: 'southkorea',  d: '2026-06-18', v: 'Estadio Akron, Zapopan' },
		{ md: 3, h: 'czechia',     a: 'mexico',      d: '2026-06-24', v: 'Estadio Akron, Zapopan' },
		{ md: 3, h: 'southafrica', a: 'southkorea',  d: '2026-06-24', v: 'Estadio Akron, Zapopan' },
	],
	B: [
		{ md: 1, h: 'canada',      a: 'bosnia',      d: '2026-06-12', v: 'BMO Field, Toronto' },
		{ md: 1, h: 'qatar',       a: 'switzerland', d: '2026-06-13', v: "Levi's Stadium, San Francisco" },
		{ md: 2, h: 'switzerland', a: 'bosnia',      d: '2026-06-18', v: "Levi's Stadium, San Francisco" },
		{ md: 2, h: 'canada',      a: 'qatar',       d: '2026-06-18', v: 'BC Place, Vancouver' },
		{ md: 3, h: 'switzerland', a: 'canada',      d: '2026-06-24', v: 'BC Place, Vancouver' },
		{ md: 3, h: 'bosnia',      a: 'qatar',       d: '2026-06-24', v: 'Lumen Field, Seattle' },
	],
	C: [
		{ md: 1, h: 'brazil',   a: 'morocco',  d: '2026-06-13', v: 'MetLife Stadium, New Jersey' },
		{ md: 1, h: 'haiti',    a: 'scotland', d: '2026-06-13', v: 'Gillette Stadium, Boston' },
		{ md: 2, h: 'scotland', a: 'morocco',  d: '2026-06-19', v: 'Gillette Stadium, Boston' },
		{ md: 2, h: 'brazil',   a: 'haiti',    d: '2026-06-19', v: 'Lincoln Financial Field, Philadelphia' },
		{ md: 3, h: 'scotland', a: 'brazil',   d: '2026-06-24', v: 'Hard Rock Stadium, Miami' },
		{ md: 3, h: 'morocco',  a: 'haiti',    d: '2026-06-24', v: 'Mercedes-Benz Stadium, Atlanta' },
	],
	D: [
		{ md: 1, h: 'usa',       a: 'paraguay',  d: '2026-06-12', v: 'SoFi Stadium, Los Angeles' },
		{ md: 1, h: 'australia', a: 'turkey',    d: '2026-06-13', v: 'BC Place, Vancouver' },
		{ md: 2, h: 'usa',       a: 'australia', d: '2026-06-19', v: 'Lumen Field, Seattle' },
		{ md: 2, h: 'turkey',    a: 'paraguay',  d: '2026-06-19', v: "Levi's Stadium, San Francisco" },
		{ md: 3, h: 'turkey',    a: 'usa',       d: '2026-06-25', v: 'SoFi Stadium, Los Angeles' },
		{ md: 3, h: 'paraguay',  a: 'australia', d: '2026-06-25', v: "Levi's Stadium, San Francisco" },
	],
	E: [
		{ md: 1, h: 'germany',    a: 'curacao',    d: '2026-06-14', v: 'NRG Stadium, Houston' },
		{ md: 1, h: 'ivorycoast', a: 'ecuador',    d: '2026-06-14', v: 'Lincoln Financial Field, Philadelphia' },
		{ md: 2, h: 'germany',    a: 'ivorycoast', d: '2026-06-20', v: 'Mercedes-Benz Stadium, Atlanta' },
		{ md: 2, h: 'ecuador',    a: 'curacao',    d: '2026-06-20', v: 'MetLife Stadium, New Jersey' },
		{ md: 3, h: 'ecuador',    a: 'germany',    d: '2026-06-25', v: 'MetLife Stadium, New Jersey' },
		{ md: 3, h: 'curacao',    a: 'ivorycoast', d: '2026-06-25', v: 'Lincoln Financial Field, Philadelphia' },
	],
	F: [
		{ md: 1, h: 'netherlands', a: 'japan',       d: '2026-06-14', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 1, h: 'sweden',      a: 'tunisia',     d: '2026-06-14', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 2, h: 'netherlands', a: 'sweden',      d: '2026-06-20', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 2, h: 'tunisia',     a: 'japan',       d: '2026-06-20', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 3, h: 'japan',       a: 'sweden',      d: '2026-06-25', v: 'AT&T Stadium, Dallas' },
		{ md: 3, h: 'tunisia',     a: 'netherlands', d: '2026-06-25', v: 'Arrowhead Stadium, Kansas City' },
	],
	G: [
		{ md: 1, h: 'belgium',    a: 'egypt',      d: '2026-06-15', v: 'Lumen Field, Seattle' },
		{ md: 1, h: 'iran',       a: 'newzealand', d: '2026-06-15', v: 'SoFi Stadium, Los Angeles' },
		{ md: 2, h: 'belgium',    a: 'iran',       d: '2026-06-21', v: 'SoFi Stadium, Los Angeles' },
		{ md: 2, h: 'newzealand', a: 'egypt',      d: '2026-06-21', v: 'BC Place, Vancouver' },
		{ md: 3, h: 'egypt',      a: 'iran',       d: '2026-06-26', v: 'Lumen Field, Seattle' },
		{ md: 3, h: 'newzealand', a: 'belgium',    d: '2026-06-26', v: 'BC Place, Vancouver' },
	],
	H: [
		{ md: 1, h: 'spain',       a: 'capeverde',   d: '2026-06-15', v: 'Mercedes-Benz Stadium, Atlanta' },
		{ md: 1, h: 'saudiarabia', a: 'uruguay',     d: '2026-06-15', v: 'Hard Rock Stadium, Miami' },
		{ md: 2, h: 'spain',       a: 'saudiarabia', d: '2026-06-21', v: 'Mercedes-Benz Stadium, Atlanta' },
		{ md: 2, h: 'uruguay',     a: 'capeverde',   d: '2026-06-21', v: 'Hard Rock Stadium, Miami' },
		{ md: 3, h: 'capeverde',   a: 'saudiarabia', d: '2026-06-26', v: 'NRG Stadium, Houston' },
		{ md: 3, h: 'uruguay',     a: 'spain',       d: '2026-06-26', v: 'Estadio Guadalajara, Guadalajara' },
	],
	I: [
		{ md: 1, h: 'france',  a: 'senegal', d: '2026-06-16', v: 'MetLife Stadium, New Jersey' },
		{ md: 1, h: 'iraq',    a: 'norway',  d: '2026-06-16', v: 'Gillette Stadium, Boston' },
		{ md: 2, h: 'france',  a: 'iraq',    d: '2026-06-22', v: 'Lincoln Financial Field, Philadelphia' },
		{ md: 2, h: 'norway',  a: 'senegal', d: '2026-06-22', v: 'MetLife Stadium, New Jersey' },
		{ md: 3, h: 'norway',  a: 'france',  d: '2026-06-26', v: 'Gillette Stadium, Boston' },
		{ md: 3, h: 'senegal', a: 'iraq',    d: '2026-06-26', v: 'BMO Field, Toronto' },
	],
	J: [
		{ md: 1, h: 'argentina', a: 'algeria',   d: '2026-06-16', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 1, h: 'austria',   a: 'jordan',    d: '2026-06-16', v: "Levi's Stadium, San Francisco" },
		{ md: 2, h: 'argentina', a: 'austria',   d: '2026-06-22', v: 'SoFi Stadium, Los Angeles' },
		{ md: 2, h: 'jordan',    a: 'algeria',   d: '2026-06-22', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 3, h: 'algeria',   a: 'austria',   d: '2026-06-27', v: 'Arrowhead Stadium, Kansas City' },
		{ md: 3, h: 'jordan',    a: 'argentina', d: '2026-06-27', v: 'AT&T Stadium, Dallas' },
	],
	K: [
		{ md: 1, h: 'portugal',   a: 'drcongo',    d: '2026-06-17', v: 'NRG Stadium, Houston' },
		{ md: 1, h: 'uzbekistan', a: 'colombia',   d: '2026-06-17', v: 'Estadio Azteca, Mexico City' },
		{ md: 2, h: 'portugal',   a: 'uzbekistan', d: '2026-06-23', v: 'NRG Stadium, Houston' },
		{ md: 2, h: 'colombia',   a: 'drcongo',    d: '2026-06-23', v: 'Estadio Azteca, Mexico City' },
		{ md: 3, h: 'colombia',   a: 'portugal',   d: '2026-06-27', v: 'Hard Rock Stadium, Miami' },
		{ md: 3, h: 'drcongo',    a: 'uzbekistan', d: '2026-06-27', v: 'Mercedes-Benz Stadium, Atlanta' },
	],
	L: [
		{ md: 1, h: 'england', a: 'croatia', d: '2026-06-17', v: 'AT&T Stadium, Dallas' },
		{ md: 1, h: 'ghana',   a: 'panama',  d: '2026-06-17', v: 'BMO Field, Toronto' },
		{ md: 2, h: 'england', a: 'ghana',   d: '2026-06-23', v: 'Lincoln Financial Field, Philadelphia' },
		{ md: 2, h: 'panama',  a: 'croatia', d: '2026-06-23', v: 'BMO Field, Toronto' },
		{ md: 3, h: 'panama',  a: 'england', d: '2026-06-27', v: 'MetLife Stadium, New Jersey' },
		{ md: 3, h: 'croatia', a: 'ghana',   d: '2026-06-27', v: 'Lincoln Financial Field, Philadelphia' },
	],
};

// ─── Knockout bracket paths ──────────────────────────────────────────────────
const SF_DALLAS  = { match: 101, date: '2026-07-14', city: 'Dallas',     venue: 'AT&T Stadium',          opponentDesc: 'Winner QF bracket' }
const SF_ATLANTA = { match: 102, date: '2026-07-15', city: 'Atlanta',    venue: 'Mercedes-Benz Stadium', opponentDesc: 'Winner QF bracket' }
const FINAL_FIX  = { match: 104, date: '2026-07-19', city: 'New Jersey', venue: 'MetLife Stadium',       opponentDesc: 'Winner other SF' }

const SF = { dallas: SF_DALLAS, atlanta: SF_ATLANTA }

function makePath(r32, r16, qf, sfKey) {
	return { r32, r16, qf, sf: SF[sfKey], final: FINAL_FIX }
}

export const BRACKET_PATHS = {
	'A-1': makePath({ match: 79, date: '2026-06-28', city: 'Mexico City',   venue: 'Estadio Azteca',          opponentDesc: 'Best 3rd from C/E/F/H/I' },
	                { match: 93, date: '2026-07-05', city: 'Guadalajara',   venue: 'Estadio Guadalajara',     opponentDesc: 'Winner Match 79' },
	                { match: 97, date: '2026-07-09', city: 'Guadalajara',   venue: 'Estadio Guadalajara',     opponentDesc: 'Winner Match 93' },
	                'dallas'),
	'A-2': makePath({ match: 80, date: '2026-06-29', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Best 3rd from E/H/I/J/K' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Match 80' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'B-1': makePath({ match: 85, date: '2026-07-02', city: 'Boston',        venue: 'Gillette Stadium',        opponentDesc: 'Best 3rd from E/F/G/I/J' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 85' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'B-2': makePath({ match: 82, date: '2026-07-01', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Best 3rd from A/E/H/I/J' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Match 82' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'C-1': makePath({ match: 87, date: '2026-07-03', city: 'Kansas City',   venue: 'Arrowhead Stadium',       opponentDesc: 'Best 3rd from D/E/I/J/L' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 86' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'C-2': makePath({ match: 88, date: '2026-07-03', city: 'Dallas',        venue: 'AT&T Stadium',            opponentDesc: 'Runner-up Group D' },
	                { match: 95, date: '2026-07-07', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Match 87' },
	                { match: 99, date: '2026-07-11', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Match 95' },
	                'atlanta'),
	'D-1': makePath({ match: 81, date: '2026-07-01', city: 'San Francisco', venue: "Levi's Stadium",          opponentDesc: 'Best 3rd from B/E/F/I/J' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Group G (Match 82)' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'D-2': makePath({ match: 88, date: '2026-07-03', city: 'Dallas',        venue: 'AT&T Stadium',            opponentDesc: 'Winner Group C' },
	                { match: 95, date: '2026-07-07', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Match 87' },
	                { match: 99, date: '2026-07-11', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Match 95' },
	                'atlanta'),
	'E-1': makePath({ match: 81, date: '2026-07-01', city: 'San Francisco', venue: "Levi's Stadium",          opponentDesc: 'Best 3rd from B/E/F/I/J' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Match 82' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'E-2': makePath({ match: 86, date: '2026-07-02', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Group J' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 86' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'F-1': makePath({ match: 88, date: '2026-07-03', city: 'Dallas',        venue: 'AT&T Stadium',            opponentDesc: 'Runner-up Group D' },
	                { match: 95, date: '2026-07-07', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Match 87' },
	                { match: 99, date: '2026-07-11', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Match 95' },
	                'atlanta'),
	'F-2': makePath({ match: 87, date: '2026-07-03', city: 'Kansas City',   venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Group K' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 86' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'G-1': makePath({ match: 82, date: '2026-07-01', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Best 3rd from A/E/H/I/J' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Group D (Match 81)' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'G-2': makePath({ match: 88, date: '2026-07-03', city: 'Dallas',        venue: 'AT&T Stadium',            opponentDesc: 'Runner-up Group D' },
	                { match: 95, date: '2026-07-07', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Match 87' },
	                { match: 99, date: '2026-07-11', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Match 95' },
	                'atlanta'),
	'H-1': makePath({ match: 84, date: '2026-07-02', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Runner-up Group J' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 85' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'H-2': makePath({ match: 80, date: '2026-06-29', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Group L' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Match 80' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'I-1': makePath({ match: 85, date: '2026-07-02', city: 'Boston',        venue: 'Gillette Stadium',        opponentDesc: 'Best 3rd from E/F/G/I/J' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 85' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'I-2': makePath({ match: 86, date: '2026-07-02', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Group J' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 86' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'J-1': makePath({ match: 79, date: '2026-06-28', city: 'Mexico City',   venue: 'Estadio Azteca',          opponentDesc: 'Best 3rd from C/E/F/H/I' },
	                { match: 93, date: '2026-07-05', city: 'Guadalajara',   venue: 'Estadio Guadalajara',     opponentDesc: 'Winner Match 79' },
	                { match: 97, date: '2026-07-09', city: 'Guadalajara',   venue: 'Estadio Guadalajara',     opponentDesc: 'Winner Match 93' },
	                'dallas'),
	'J-2': makePath({ match: 84, date: '2026-07-02', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Group H' },
	                { match: 96, date: '2026-07-07', city: 'Vancouver',     venue: 'BC Place',                opponentDesc: 'Winner Match 85' },
	                { match: 100, date: '2026-07-11', city: 'Kansas City',  venue: 'Arrowhead Stadium',       opponentDesc: 'Winner Match 96' },
	                'dallas'),
	'K-1': makePath({ match: 80, date: '2026-06-29', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Best 3rd from E/H/I/J/K' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Match 80' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
	'K-2': makePath({ match: 83, date: '2026-06-29', city: 'Toronto',       venue: 'BMO Field',               opponentDesc: 'Runner-up Group L' },
	                { match: 95, date: '2026-07-07', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Match 83' },
	                { match: 99, date: '2026-07-11', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Match 95' },
	                'atlanta'),
	'L-1': makePath({ match: 83, date: '2026-06-29', city: 'Toronto',       venue: 'BMO Field',               opponentDesc: 'Runner-up Group K' },
	                { match: 95, date: '2026-07-07', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Match 83' },
	                { match: 99, date: '2026-07-11', city: 'Miami',         venue: 'Hard Rock Stadium',       opponentDesc: 'Winner Match 95' },
	                'atlanta'),
	'L-2': makePath({ match: 80, date: '2026-06-29', city: 'Atlanta',       venue: 'Mercedes-Benz Stadium',   opponentDesc: 'Winner Group K' },
	                { match: 94, date: '2026-07-06', city: 'Seattle',       venue: 'Lumen Field',             opponentDesc: 'Winner Match 80' },
	                { match: 98, date: '2026-07-10', city: 'Los Angeles',   venue: 'SoFi Stadium',            opponentDesc: 'Winner Match 94' },
	                'atlanta'),
};

// Reverse lookup: r32 match number → bracket-position keys (e.g. 82 → ['B-2','G-1']).
// Used by buildOpponents() to resolve "Winner Match X" R16 opponent descriptions.
export const R32_MATCH_TO_POSITIONS = (() => {
	const out = {}
	for (const [key, path] of Object.entries(BRACKET_PATHS)) {
		const m = path.r32?.match
		if (m) (out[m] = out[m] || []).push(key)
	}
	return out
})()

// Flat map: match number → scheduled date (derived from BRACKET_PATHS).
export const MATCH_DATES = (() => {
	const out = {}
	for (const path of Object.values(BRACKET_PATHS)) {
		for (const stage of KNOCKOUT_STAGES) {
			const entry = path[stage]
			if (entry?.match && entry.date) out[entry.match] = entry.date
		}
	}
	return out
})()

export const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('')
