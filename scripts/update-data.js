#!/usr/bin/env node
/**
 * update-data.js — Road to the Final · Smart Data Refresh
 * ─────────────────────────────────────────────────────────
 * Designed to run hourly via GitHub Actions with minimal API usage.
 * Only fully recalculates teams that played today or yesterday.
 * All other teams carry forward existing data unchanged.
 *
 * Writes:
 *   public/data/world-cup-2026.json           ← always-current live data
 *   public/data/snapshots/YYYY-MM-DD.json     ← one snapshot per day (overwritten)
 *   public/data/snapshots/manifest.json       ← index of available snapshots
 *
 * Usage:
 *   node scripts/update-data.js
 *   FOOTBALL_DATA_KEY=xxx node scripts/update-data.js
 *
 * Requires Node 18+ (built-in fetch). No npm dependencies needed for the script.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT       = path.join(__dirname, '..');
const LIVE_PATH  = path.join(ROOT, 'public', 'data', 'world-cup-2026.json');
const SNAP_DIR   = path.join(ROOT, 'public', 'data', 'snapshots');
const MF_PATH    = path.join(SNAP_DIR, 'manifest.json');

// ─── API config ──────────────────────────────────────────────────────────────
const FD_BASE    = 'https://api.football-data.org/v4';
const FD_KEY     = process.env.FOOTBALL_DATA_KEY || '';
const FD_HEADERS = FD_KEY ? { 'X-Auth-Token': FD_KEY } : {};
const WC_ID      = 2000; // football-data.org FIFA WC 2026 ID

// ─── All 48 teams (static info) ──────────────────────────────────────────────
const ALL_TEAMS = [
  { id:'mexico',      name:'Mexico',         flag:'🇲🇽', group:'A', confederation:'CONCACAF', fifaRank:15 },
  { id:'southafrica', name:'South Africa',   flag:'🇿🇦', group:'A', confederation:'CAF',      fifaRank:58 },
  { id:'southkorea',  name:'South Korea',    flag:'🇰🇷', group:'A', confederation:'AFC',      fifaRank:22 },
  { id:'czechia',     name:'Czechia',        flag:'🇨🇿', group:'A', confederation:'UEFA',     fifaRank:37 },
  { id:'canada',      name:'Canada',         flag:'🇨🇦', group:'B', confederation:'CONCACAF', fifaRank:27 },
  { id:'bosnia',      name:'Bosnia & Herz.', flag:'🇧🇦', group:'B', confederation:'UEFA',     fifaRank:71 },
  { id:'qatar',       name:'Qatar',          flag:'🇶🇦', group:'B', confederation:'AFC',      fifaRank:51 },
  { id:'switzerland', name:'Switzerland',    flag:'🇨🇭', group:'B', confederation:'UEFA',     fifaRank:17 },
  { id:'brazil',      name:'Brazil',         flag:'🇧🇷', group:'C', confederation:'CONMEBOL', fifaRank:4  },
  { id:'morocco',     name:'Morocco',        flag:'🇲🇦', group:'C', confederation:'CAF',      fifaRank:14 },
  { id:'haiti',       name:'Haiti',          flag:'🇭🇹', group:'C', confederation:'CONCACAF', fifaRank:83 },
  { id:'scotland',    name:'Scotland',       flag:'🏴󠁧󠁢󠁳󠁣󠁴󠁿', group:'C', confederation:'UEFA',     fifaRank:39 },
  { id:'usa',         name:'USA',            flag:'🇺🇸', group:'D', confederation:'CONCACAF', fifaRank:14 },
  { id:'paraguay',    name:'Paraguay',       flag:'🇵🇾', group:'D', confederation:'CONMEBOL', fifaRank:39 },
  { id:'australia',   name:'Australia',      flag:'🇦🇺', group:'D', confederation:'AFC',      fifaRank:26 },
  { id:'turkey',      name:'Türkiye',        flag:'🇹🇷', group:'D', confederation:'UEFA',     fifaRank:25 },
  { id:'germany',     name:'Germany',        flag:'🇩🇪', group:'E', confederation:'UEFA',     fifaRank:9  },
  { id:'curacao',     name:'Curaçao',        flag:'🇨🇼', group:'E', confederation:'CONCACAF', fifaRank:82 },
  { id:'ivorycoast',  name:'Ivory Coast',    flag:'🇨🇮', group:'E', confederation:'CAF',      fifaRank:42 },
  { id:'ecuador',     name:'Ecuador',        flag:'🇪🇨', group:'E', confederation:'CONMEBOL', fifaRank:23 },
  { id:'netherlands', name:'Netherlands',    flag:'🇳🇱', group:'F', confederation:'UEFA',     fifaRank:7  },
  { id:'japan',       name:'Japan',          flag:'🇯🇵', group:'F', confederation:'AFC',      fifaRank:13 },
  { id:'sweden',      name:'Sweden',         flag:'🇸🇪', group:'F', confederation:'UEFA',     fifaRank:29 },
  { id:'tunisia',     name:'Tunisia',        flag:'🇹🇳', group:'F', confederation:'CAF',      fifaRank:36 },
  { id:'belgium',     name:'Belgium',        flag:'🇧🇪', group:'G', confederation:'UEFA',     fifaRank:9  },
  { id:'egypt',       name:'Egypt',          flag:'🇪🇬', group:'G', confederation:'CAF',      fifaRank:34 },
  { id:'iran',        name:'Iran',           flag:'🇮🇷', group:'G', confederation:'AFC',      fifaRank:21 },
  { id:'newzealand',  name:'New Zealand',    flag:'🇳🇿', group:'G', confederation:'OFC',      fifaRank:86 },
  { id:'spain',       name:'Spain',          flag:'🇪🇸', group:'H', confederation:'UEFA',     fifaRank:1  },
  { id:'capeverde',   name:'Cape Verde',     flag:'🇨🇻', group:'H', confederation:'CAF',      fifaRank:62 },
  { id:'saudiarabia', name:'Saudi Arabia',   flag:'🇸🇦', group:'H', confederation:'AFC',      fifaRank:55 },
  { id:'uruguay',     name:'Uruguay',        flag:'🇺🇾', group:'H', confederation:'CONMEBOL', fifaRank:18 },
  { id:'france',      name:'France',         flag:'🇫🇷', group:'I', confederation:'UEFA',     fifaRank:3  },
  { id:'senegal',     name:'Senegal',        flag:'🇸🇳', group:'I', confederation:'CAF',      fifaRank:14 },
  { id:'iraq',        name:'Iraq',           flag:'🇮🇶', group:'I', confederation:'AFC',      fifaRank:58 },
  { id:'norway',      name:'Norway',         flag:'🇳🇴', group:'I', confederation:'UEFA',     fifaRank:31 },
  { id:'argentina',   name:'Argentina',      flag:'🇦🇷', group:'J', confederation:'CONMEBOL', fifaRank:2  },
  { id:'algeria',     name:'Algeria',        flag:'🇩🇿', group:'J', confederation:'CAF',      fifaRank:35 },
  { id:'austria',     name:'Austria',        flag:'🇦🇹', group:'J', confederation:'UEFA',     fifaRank:24 },
  { id:'jordan',      name:'Jordan',         flag:'🇯🇴', group:'J', confederation:'AFC',      fifaRank:66 },
  { id:'portugal',    name:'Portugal',       flag:'🇵🇹', group:'K', confederation:'UEFA',     fifaRank:6  },
  { id:'drcongo',     name:'DR Congo',       flag:'🇨🇩', group:'K', confederation:'CAF',      fifaRank:56 },
  { id:'uzbekistan',  name:'Uzbekistan',     flag:'🇺🇿', group:'K', confederation:'AFC',      fifaRank:50 },
  { id:'colombia',    name:'Colombia',       flag:'🇨🇴', group:'K', confederation:'CONMEBOL', fifaRank:13 },
  { id:'england',     name:'England',        flag:'🏴󠁧󠁢󠁥󠁮󠁧󠁿', group:'L', confederation:'UEFA',     fifaRank:5  },
  { id:'croatia',     name:'Croatia',        flag:'🇭🇷', group:'L', confederation:'UEFA',     fifaRank:10 },
  { id:'ghana',       name:'Ghana',          flag:'🇬🇭', group:'L', confederation:'CAF',      fifaRank:60 },
  { id:'panama',      name:'Panama',         flag:'🇵🇦', group:'L', confederation:'CONCACAF', fifaRank:76 },
];

// ─── Shared knockout fixtures (eliminates duplication) ────────────────────────
const SF_DALLAS  = { match:101, date:'2026-07-14', city:'Dallas',       venue:'AT&T Stadium',          opponentDesc:'Winner QF bracket' }
const SF_ATLANTA = { match:102, date:'2026-07-15', city:'Atlanta',      venue:'Mercedes-Benz Stadium', opponentDesc:'Winner QF bracket' }
const FINAL_FIX  = { match:104, date:'2026-07-19', city:'New Jersey',  venue:'MetLife Stadium',        opponentDesc:'Winner other SF' }

const SF = { dallas: SF_DALLAS, atlanta: SF_ATLANTA }

function makePath(r32, r16, qf, sfKey) {
  return { r32, r16, qf, sf: SF[sfKey], final: FINAL_FIX }
}

// ─── Bracket path routing table ───────────────────────────────────────────────
// Maps group-finish-position to the team's full knockout path.
// Key: "GROUP-POSITION" (e.g. "D-1" = Group D winner)
// sf/final shared via makePath(); only r32/r16/qf are unique per path.
const BRACKET_PATHS = {
  'A-1': makePath({match:79, date:'2026-06-28',city:'Mexico City',  venue:'Estadio Azteca',          opponentDesc:'Best 3rd from C/E/F/H/I'},
                  {match:93, date:'2026-07-05',city:'Guadalajara',  venue:'Estadio Guadalajara',     opponentDesc:'Winner Match 79'},
                  {match:97, date:'2026-07-09',city:'Guadalajara',  venue:'Estadio Guadalajara',     opponentDesc:'Winner Match 93'},
                  'dallas'),
  'A-2': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Best 3rd from E/H/I/J/K'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Match 80'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'B-1': makePath({match:85, date:'2026-07-02',city:'Boston',       venue:'Gillette Stadium',        opponentDesc:'Best 3rd from E/F/G/I/J'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 85'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'B-2': makePath({match:82, date:'2026-07-01',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Best 3rd from A/E/H/I/J'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Match 82'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'C-1': makePath({match:87, date:'2026-07-03',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Best 3rd from D/E/I/J/L'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 86'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'C-2': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Runner-up Group D'},
                  {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Match 87'},
                  {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Match 95'},
                  'atlanta'),
  'D-1': makePath({match:81, date:'2026-07-01',city:'San Francisco',venue:"Levi's Stadium",          opponentDesc:'Best 3rd from B/E/F/I/J'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Group G (Match 82)'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'D-2': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Winner Group C'},
                  {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Match 87'},
                  {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Match 95'},
                  'atlanta'),
  'E-1': makePath({match:81, date:'2026-07-01',city:'San Francisco',venue:"Levi's Stadium",          opponentDesc:'Best 3rd from B/E/F/I/J'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Match 82'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'E-2': makePath({match:86, date:'2026-07-02',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Group J'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 86'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'F-1': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Runner-up Group D'},
                  {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Match 87'},
                  {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Match 95'},
                  'atlanta'),
  'F-2': makePath({match:87, date:'2026-07-03',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Group K'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 86'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'G-1': makePath({match:82, date:'2026-07-01',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Best 3rd from A/E/H/I/J'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Group D (Match 81)'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'G-2': makePath({match:88, date:'2026-07-03',city:'Dallas',       venue:'AT&T Stadium',            opponentDesc:'Runner-up Group D'},
                  {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Match 87'},
                  {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Match 95'},
                  'atlanta'),
  'H-1': makePath({match:84, date:'2026-07-02',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Runner-up Group J'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 85'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'H-2': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Group L'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Match 80'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'I-1': makePath({match:85, date:'2026-07-02',city:'Boston',       venue:'Gillette Stadium',        opponentDesc:'Best 3rd from E/F/G/I/J'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 85'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'I-2': makePath({match:86, date:'2026-07-02',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Group J'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 86'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'J-1': makePath({match:79, date:'2026-06-28',city:'Mexico City',  venue:'Estadio Azteca',          opponentDesc:'Best 3rd from C/E/F/H/I'},
                  {match:93, date:'2026-07-05',city:'Guadalajara',  venue:'Estadio Guadalajara',     opponentDesc:'Winner Match 79'},
                  {match:97, date:'2026-07-09',city:'Guadalajara',  venue:'Estadio Guadalajara',     opponentDesc:'Winner Match 93'},
                  'dallas'),
  'J-2': makePath({match:84, date:'2026-07-02',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Group H'},
                  {match:96, date:'2026-07-07',city:'Vancouver',    venue:'BC Place',                opponentDesc:'Winner Match 85'},
                  {match:100,date:'2026-07-11',city:'Kansas City',  venue:'Arrowhead Stadium',       opponentDesc:'Winner Match 96'},
                  'dallas'),
  'K-1': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Best 3rd from E/H/I/J/K'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Match 80'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
  'K-2': makePath({match:83, date:'2026-06-29',city:'Toronto',      venue:'BMO Field',               opponentDesc:'Runner-up Group L'},
                  {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Match 83'},
                  {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Match 95'},
                  'atlanta'),
  'L-1': makePath({match:83, date:'2026-06-29',city:'Toronto',      venue:'BMO Field',               opponentDesc:'Runner-up Group K'},
                  {match:95, date:'2026-07-07',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Match 83'},
                  {match:99, date:'2026-07-11',city:'Miami',        venue:'Hard Rock Stadium',       opponentDesc:'Winner Match 95'},
                  'atlanta'),
  'L-2': makePath({match:80, date:'2026-06-29',city:'Atlanta',      venue:'Mercedes-Benz Stadium',   opponentDesc:'Winner Group K'},
                  {match:94, date:'2026-07-06',city:'Seattle',      venue:'Lumen Field',             opponentDesc:'Winner Match 80'},
                  {match:98, date:'2026-07-10',city:'Los Angeles',  venue:'SoFi Stadium',            opponentDesc:'Winner Match 94'},
                  'atlanta'),
};

// TLA (Three-Letter Abbreviation) → internal ID (primary lookup, from football-data.org)
const TLA_TO_ID = {
	MEX:'mexico', RSA:'southafrica', KOR:'southkorea', CZE:'czechia',
	CAN:'canada', BIH:'bosnia', QAT:'qatar', SUI:'switzerland',
	BRA:'brazil', MAR:'morocco', HAI:'haiti', SCO:'scotland',
	USA:'usa', PAR:'paraguay', AUS:'australia', TUR:'turkey',
	GER:'germany', CUW:'curacao', CIV:'ivorycoast', ECU:'ecuador',
	NED:'netherlands', JPN:'japan', SWE:'sweden', TUN:'tunisia',
	BEL:'belgium', EGY:'egypt', IRN:'iran', NZL:'newzealand',
	ESP:'spain', CPV:'capeverde', KSA:'saudiarabia', URU:'uruguay',
	FRA:'france', SEN:'senegal', IRQ:'iraq', NOR:'norway',
	ARG:'argentina', ALG:'algeria', AUT:'austria', JOR:'jordan',
	POR:'portugal', COD:'drcongo', UZB:'uzbekistan', COL:'colombia',
	ENG:'england', CRO:'croatia', GHA:'ghana', PAN:'panama',
};

// Team name → ID mapping (fallback when TLA is not available in API response)
const NAME_TO_ID = {
  'United States':'usa','USA':'usa','Mexico':'mexico','Canada':'canada',
  'Brazil':'brazil','Argentina':'argentina','Colombia':'colombia','Ecuador':'ecuador',
  'Uruguay':'uruguay','Paraguay':'paraguay',
  'Spain':'spain','France':'france','Germany':'germany','England':'england',
  'Netherlands':'netherlands','Portugal':'portugal','Belgium':'belgium',
  'Switzerland':'switzerland','Croatia':'croatia','Austria':'austria',
  'Sweden':'sweden','Norway':'norway','Scotland':'scotland',
  'Czech Republic':'czechia','Czechia':'czechia','Bosnia and Herzegovina':'bosnia',
  'Turkey':'turkey','Türkiye':'turkey',
  'Morocco':'morocco','Senegal':'senegal','Egypt':'egypt','Ivory Coast':'ivorycoast',
  "Côte d'Ivoire":'ivorycoast','Ghana':'ghana','South Africa':'southafrica',
  'Algeria':'algeria','Tunisia':'tunisia','DR Congo':'drcongo','Congo DR':'drcongo',
  'Cape Verde':'capeverde','Saudi Arabia':'saudiarabia',
  'Japan':'japan','South Korea':'southkorea','Australia':'australia',
  'Iran':'iran','Iraq':'iraq','Qatar':'qatar','Jordan':'jordan',
  'Uzbekistan':'uzbekistan','New Zealand':'newzealand',
  'Haiti':'haiti','Panama':'panama','Curaçao':'curacao','Curacao':'curacao',
};

function nameToId(name, tla) {
	if (tla && TLA_TO_ID[tla]) return TLA_TO_ID[tla];
	const id = NAME_TO_ID[name] || null;
	if (id && tla) log(`⚠  TLA '${tla}' not in TLA_TO_ID, resolved '${name}' via name fallback`);
	return id;
}

function log(msg) { console.log(`[${new Date().toISOString()}] ${msg}`); }

function ensure(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function todayStr() { return new Date().toISOString().split('T')[0]; }
function yesterdayStr() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}
function fmtLabel(dateStr) {
  return new Date(dateStr + 'T12:00:00Z').toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', timeZone: 'UTC',
  });
}

// Sentinel for network-level fetch failures (distinct from API response errors)
const FETCH_ERROR = Symbol('fetch_error');

async function tryFetch(url, headers = {}, timeoutMs = 10000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (e) {
    log(`⚠  Fetch failed ${url}: ${e.message}`);
    return FETCH_ERROR;
  } finally {
    clearTimeout(timer);
  }
}

// ─── API response validators ──────────────────────────────────────────────────
function validateStandingsResponse(data) {
	if (!data || !Array.isArray(data.standings))
		throw new Error('Invalid standings response: expected { standings: [...] }');
	return data;
}
function validateMatchesResponse(data) {
	if (!data || !Array.isArray(data.matches))
		throw new Error('Invalid matches response: expected { matches: [...] }');
	return data;
}
function validatePolymarketResponse(data) {
	if (!Array.isArray(data))
		throw new Error('Invalid polymarket response: expected array');
	return data;
}

// ─── Load existing live data (for carry-forward) ──────────────────────────────
function loadExisting() {
  if (fs.existsSync(LIVE_PATH)) {
    try { return JSON.parse(fs.readFileSync(LIVE_PATH, 'utf8')); } catch { /* parsing failed */ }
  }
  return null;
}

// ─── Fetch today + yesterday matches to find active team IDs ─────────────────
async function fetchActiveTeamIds() {
  const today     = todayStr();
  const yesterday = yesterdayStr();

  const data = await tryFetch(
    `${FD_BASE}/competitions/${WC_ID}/matches?dateFrom=${yesterday}&dateTo=${today}`,
    FD_HEADERS
  );

  if (!data?.matches?.length) return new Set();

  const ids = new Set();
  for (const m of data.matches) {
    const hId = nameToId(m.homeTeam?.name, m.homeTeam?.tla);
    const aId = nameToId(m.awayTeam?.name, m.awayTeam?.tla);
    if (hId) ids.add(hId);
    if (aId) ids.add(aId);
  }
  log(`Active teams (today + yesterday): ${[...ids].join(', ') || 'none'}`);
  return ids;
}

// ─── Fetch all group standings ────────────────────────────────────────────────
async function fetchStandings() {
  const data = await tryFetch(`${FD_BASE}/competitions/${WC_ID}/standings`, FD_HEADERS);
  if (!data || data === FETCH_ERROR) return {};
  validateStandingsResponse(data);

  const groups = {};
  for (const s of (data.standings || [])) {
    const g = s.group?.replace('Group ', '');
    if (!g) continue;
    groups[g] = s.table.map((row, i) => ({
      pos:    i + 1,
      teamId: nameToId(row.team.name, row.team.tla),
      team:   row.team.name,
      played: row.playedGames,
      w: row.won, d: row.draw, l: row.lost,
      gf: row.goalsFor, ga: row.goalsAgainst, gd: row.goalDifference,
      pts: row.points,
    }));
  }
  return groups;
}

// ─── Fetch all match results ──────────────────────────────────────────────────
async function fetchMatches() {
  const data = await tryFetch(`${FD_BASE}/competitions/${WC_ID}/matches`, FD_HEADERS);
  if (!data || data === FETCH_ERROR) return [];
  validateMatchesResponse(data);
  return data.matches;
}

// ─── Polymarket: fetch group winner probabilities (Option B — always) ─────────
// Returns { teamId: pct } across all groups we can find market data for.
async function fetchPolymarketAll() {
  const probs = {};

  // These slugs cover the major markets. Polymarket may add more during tournament.
  const slugs = [
    'world-cup-2026-winner',
    'world-cup-group-d-winner',
    'fifa-world-cup-group-g-winner',
    'world-cup-group-b-winner',
    'world-cup-group-e-winner',
    'world-cup-group-f-winner',
    'world-cup-group-h-winner',
    'world-cup-group-i-winner',
    'world-cup-group-j-winner',
    'world-cup-group-k-winner',
    'world-cup-group-l-winner',
    'world-cup-group-a-winner',
    'world-cup-group-c-winner',
  ];

  for (const slug of slugs) {
    const data = await tryFetch(`https://gamma-api.polymarket.com/markets?slug=${slug}&limit=1`);
    if (!data?.length) continue;
    validatePolymarketResponse(data);
    for (const token of (data[0].tokens || [])) {
      const id  = nameToId(token.outcome);
      const pct = Math.round(parseFloat(token.price) * 100);
      if (id && !isNaN(pct)) probs[id] = pct;
    }
  }

  log(`Polymarket probabilities fetched for: ${Object.keys(probs).join(', ') || 'none'}`);
  return probs;
}

// ─── Build group results for a team from match data ──────────────────────────
const GROUP_SCHEDULE = {
   A:[{md:1,h:'mexico',     a:'southafrica',d:'2026-06-12',v:'Estadio Azteca, Mexico City'},
      {md:1,h:'southkorea', a:'czechia',    d:'2026-06-12',v:'Estadio Akron, Zapopan'},
     {md:2,h:'czechia',    a:'southafrica',d:'2026-06-18',v:'Mercedes-Benz Stadium, Atlanta'},
     {md:2,h:'mexico',     a:'southkorea', d:'2026-06-18',v:'Estadio Akron, Zapopan'},
     {md:3,h:'czechia',    a:'mexico',     d:'2026-06-24',v:'Estadio Akron, Zapopan'},
     {md:3,h:'southafrica',a:'southkorea', d:'2026-06-24',v:'Estadio Akron, Zapopan'}],
  B:[{md:1,h:'canada',     a:'bosnia',     d:'2026-06-12',v:'BMO Field, Toronto'},
     {md:1,h:'qatar',      a:'switzerland',d:'2026-06-13',v:"Levi's Stadium, San Francisco"},
     {md:2,h:'switzerland',a:'bosnia',     d:'2026-06-18',v:"Levi's Stadium, San Francisco"},
     {md:2,h:'canada',     a:'qatar',      d:'2026-06-18',v:'BC Place, Vancouver'},
     {md:3,h:'switzerland',a:'canada',     d:'2026-06-24',v:'BC Place, Vancouver'},
     {md:3,h:'bosnia',     a:'qatar',      d:'2026-06-24',v:'Lumen Field, Seattle'}],
  C:[{md:1,h:'brazil',     a:'morocco',    d:'2026-06-13',v:'MetLife Stadium, New Jersey'},
     {md:1,h:'haiti',      a:'scotland',   d:'2026-06-13',v:'Gillette Stadium, Boston'},
     {md:2,h:'scotland',   a:'morocco',    d:'2026-06-19',v:'Gillette Stadium, Boston'},
     {md:2,h:'brazil',     a:'haiti',      d:'2026-06-19',v:'Lincoln Financial Field, Philadelphia'},
     {md:3,h:'scotland',   a:'brazil',     d:'2026-06-24',v:'Hard Rock Stadium, Miami'},
     {md:3,h:'morocco',    a:'haiti',      d:'2026-06-24',v:'Mercedes-Benz Stadium, Atlanta'}],
  D:[{md:1,h:'usa',        a:'paraguay',   d:'2026-06-12',v:'SoFi Stadium, Los Angeles'},
     {md:1,h:'australia',  a:'turkey',     d:'2026-06-13',v:'BC Place, Vancouver'},
     {md:2,h:'usa',        a:'australia',  d:'2026-06-19',v:'Lumen Field, Seattle'},
     {md:2,h:'turkey',     a:'paraguay',   d:'2026-06-19',v:"Levi's Stadium, San Francisco"},
     {md:3,h:'turkey',     a:'usa',        d:'2026-06-25',v:'SoFi Stadium, Los Angeles'},
     {md:3,h:'paraguay',   a:'australia',  d:'2026-06-25',v:"Levi's Stadium, San Francisco"}],
  E:[{md:1,h:'germany',    a:'curacao',    d:'2026-06-14',v:'NRG Stadium, Houston'},
     {md:1,h:'ivorycoast', a:'ecuador',    d:'2026-06-14',v:'Lincoln Financial Field, Philadelphia'},
     {md:2,h:'germany',    a:'ivorycoast', d:'2026-06-20',v:'Mercedes-Benz Stadium, Atlanta'},
     {md:2,h:'ecuador',    a:'curacao',    d:'2026-06-20',v:'MetLife Stadium, New Jersey'},
     {md:3,h:'ecuador',    a:'germany',    d:'2026-06-25',v:'MetLife Stadium, New Jersey'},
     {md:3,h:'curacao',    a:'ivorycoast', d:'2026-06-25',v:'Lincoln Financial Field, Philadelphia'}],
  F:[{md:1,h:'netherlands',a:'japan',      d:'2026-06-14',v:'Arrowhead Stadium, Kansas City'},
     {md:1,h:'sweden',     a:'tunisia',    d:'2026-06-14',v:'Arrowhead Stadium, Kansas City'},
     {md:2,h:'netherlands',a:'sweden',     d:'2026-06-20',v:'Arrowhead Stadium, Kansas City'},
     {md:2,h:'tunisia',    a:'japan',      d:'2026-06-20',v:'Arrowhead Stadium, Kansas City'},
     {md:3,h:'japan',      a:'sweden',     d:'2026-06-25',v:'AT&T Stadium, Dallas'},
     {md:3,h:'tunisia',    a:'netherlands',d:'2026-06-25',v:'Arrowhead Stadium, Kansas City'}],
  G:[{md:1,h:'belgium',    a:'egypt',      d:'2026-06-15',v:'Lumen Field, Seattle'},
     {md:1,h:'iran',       a:'newzealand', d:'2026-06-15',v:'SoFi Stadium, Los Angeles'},
     {md:2,h:'belgium',    a:'iran',       d:'2026-06-21',v:'SoFi Stadium, Los Angeles'},
     {md:2,h:'newzealand', a:'egypt',      d:'2026-06-21',v:'BC Place, Vancouver'},
     {md:3,h:'egypt',      a:'iran',       d:'2026-06-26',v:'Lumen Field, Seattle'},
     {md:3,h:'newzealand', a:'belgium',    d:'2026-06-26',v:'BC Place, Vancouver'}],
  H:[{md:1,h:'spain',      a:'capeverde',  d:'2026-06-15',v:'Mercedes-Benz Stadium, Atlanta'},
     {md:1,h:'saudiarabia',a:'uruguay',    d:'2026-06-15',v:'Hard Rock Stadium, Miami'},
     {md:2,h:'spain',      a:'saudiarabia',d:'2026-06-21',v:'Mercedes-Benz Stadium, Atlanta'},
     {md:2,h:'uruguay',    a:'capeverde',  d:'2026-06-21',v:'Hard Rock Stadium, Miami'},
     {md:3,h:'capeverde',  a:'saudiarabia',d:'2026-06-26',v:'NRG Stadium, Houston'},
     {md:3,h:'uruguay',    a:'spain',      d:'2026-06-26',v:'Estadio Guadalajara, Guadalajara'}],
  I:[{md:1,h:'france',     a:'senegal',    d:'2026-06-16',v:'MetLife Stadium, New Jersey'},
     {md:1,h:'iraq',       a:'norway',     d:'2026-06-16',v:'Gillette Stadium, Boston'},
     {md:2,h:'france',     a:'iraq',       d:'2026-06-22',v:'Lincoln Financial Field, Philadelphia'},
     {md:2,h:'norway',     a:'senegal',    d:'2026-06-22',v:'MetLife Stadium, New Jersey'},
     {md:3,h:'norway',     a:'france',     d:'2026-06-26',v:'Gillette Stadium, Boston'},
     {md:3,h:'senegal',    a:'iraq',       d:'2026-06-26',v:'BMO Field, Toronto'}],
  J:[{md:1,h:'argentina',  a:'algeria',    d:'2026-06-16',v:'Arrowhead Stadium, Kansas City'},
     {md:1,h:'austria',    a:'jordan',     d:'2026-06-16',v:"Levi's Stadium, San Francisco"},
     {md:2,h:'argentina',  a:'austria',    d:'2026-06-22',v:'SoFi Stadium, Los Angeles'},
     {md:2,h:'jordan',     a:'algeria',    d:'2026-06-22',v:'Arrowhead Stadium, Kansas City'},
     {md:3,h:'algeria',    a:'austria',    d:'2026-06-27',v:'Arrowhead Stadium, Kansas City'},
     {md:3,h:'jordan',     a:'argentina',  d:'2026-06-27',v:'AT&T Stadium, Dallas'}],
  K:[{md:1,h:'portugal',   a:'drcongo',    d:'2026-06-17',v:'NRG Stadium, Houston'},
     {md:1,h:'uzbekistan', a:'colombia',   d:'2026-06-17',v:'Estadio Azteca, Mexico City'},
     {md:2,h:'portugal',   a:'uzbekistan', d:'2026-06-23',v:'NRG Stadium, Houston'},
     {md:2,h:'colombia',   a:'drcongo',    d:'2026-06-23',v:'Estadio Azteca, Mexico City'},
     {md:3,h:'colombia',   a:'portugal',   d:'2026-06-27',v:'Hard Rock Stadium, Miami'},
     {md:3,h:'drcongo',    a:'uzbekistan', d:'2026-06-27',v:'Mercedes-Benz Stadium, Atlanta'}],
  L:[{md:1,h:'england',    a:'croatia',    d:'2026-06-17',v:'AT&T Stadium, Dallas'},
     {md:1,h:'ghana',      a:'panama',     d:'2026-06-17',v:'BMO Field, Toronto'},
     {md:2,h:'england',    a:'ghana',      d:'2026-06-23',v:'Lincoln Financial Field, Philadelphia'},
     {md:2,h:'panama',     a:'croatia',    d:'2026-06-23',v:'BMO Field, Toronto'},
     {md:3,h:'panama',     a:'england',    d:'2026-06-27',v:'MetLife Stadium, New Jersey'},
     {md:3,h:'croatia',    a:'ghana',      d:'2026-06-27',v:'Lincoln Financial Field, Philadelphia'}],
};

function buildGroupResults(teamId, group, matchIndex, existingGroupResults = []) {
  const sched = GROUP_SCHEDULE[group] || [];
  return sched
    .filter(g => g.h === teamId || g.a === teamId)
    .sort((a,b) => a.md - b.md)
    .map(g => {
      const isHome  = g.h === teamId;
      const oppId   = isHome ? g.a : g.h;
      const oppInfo = ALL_TEAMS.find(t => t.id === oppId) || {};
      const match   = matchIndex.get(`${g.h}:${g.a}`);

      let result = null, score = null;
      if (match?.status === 'FINISHED') {
        const myG = isHome ? match.score.fullTime.home : match.score.fullTime.away;
        const opG = isHome ? match.score.fullTime.away : match.score.fullTime.home;
        result = myG > opG ? 'W' : myG < opG ? 'L' : 'D';
        score  = `${myG}-${opG}`;
      }

      const existingMatch = existingGroupResults.find(
        e => e.matchday === g.md && e.opponent === oppInfo.name
      )

      return {
        matchday: g.md, opponent: oppInfo.name || oppId, opponentFlag: oppInfo.flag || '🏳️',
        result, score, date: g.d, venue: g.v,
        scorers: existingMatch?.scorers?.length ? existingMatch.scorers : [],
      };
    });
}

function buildPath(teamId, group, standings) {
  const rows    = standings[group] || [];
  const teamRow = rows.find(r => r.teamId === teamId);
  const pos     = Math.min(teamRow?.pos ?? 1, 2); // use 1 or 2 for path lookup
  const key     = `${group}-${pos}`;
  const bp      = BRACKET_PATHS[key] || BRACKET_PATHS[`${group}-1`] || {};

  const sched      = GROUP_SCHEDULE[group] || [];
  // Only look at the team's OWN games for city derivation (not all group games)
  const teamGames  = sched.filter(g => g.h === teamId || g.a === teamId);
  const dates      = teamGames.map(g => g.d).sort();
  const first      = dates[0] || '';
  const last       = dates[dates.length - 1] || '';
  const cities     = [...new Set(teamGames.map(g => g.v.split(',').pop().trim()))].slice(0, 3).join(' · ');
  const pts     = teamRow ? `${teamRow.pts}pt${teamRow.pts !== 1 ? 's' : ''} after MD${teamRow.played}` : `Group ${group}`;

  return {
    group_stage: { status:'active', city: cities, venue:'Various venues', date:`Jun ${first.slice(8)}–${last.slice(8)}`, detail: pts },
    r32:   bp.r32   ? { status:'upcoming', ...bp.r32   } : null,
    r16:   bp.r16   ? { status:'future',   ...bp.r16   } : null,
    qf:    bp.qf    ? { status:'future',   ...bp.qf    } : null,
    sf:    bp.sf    ? { status:'future',   ...bp.sf    } : null,
    final: bp.final ? { status:'future',   ...bp.final } : null,
  };
}

function calcProbs(teamId, group, standings, polyProbs) {
  // Option B: Polymarket win % is authoritative where available.
  // Fallback: derive from group position + FIFA ranking.
  const rows   = standings[group] || [];
  const row    = rows.find(r => r.teamId === teamId);
  const pos    = row?.pos ?? 4;
  const poly   = polyProbs[teamId];
  const base   = ALL_TEAMS.find(t => t.id === teamId)?.fifaRank ?? 50;

  // Ranking-based probability seed (rough heuristic)
  const rankScore = Math.max(1, 50 - base);
  const posMult   = { 1: 1.0, 2: 0.65, 3: 0.3, 4: 0.05 }[pos] ?? 0.5;
  const seed      = Math.round(rankScore * posMult);

  const winner = poly ?? Math.min(seed, 30);
  const r32    = Math.min(Math.round(winner * 2.8 + (pos <= 2 ? 20 : 5)), 99);
  const r16    = poly ? Math.min(Math.round(poly * 1.8), 95) : Math.round(r32 * 0.55);
  const qf     = Math.round(r16 * 0.52);
  const sf     = Math.round(qf  * 0.50);
  const final  = Math.round(sf  * 0.50);

  return { r32, r16, qf, sf, final, winner, source: poly ? 'market' : 'calculated' };
}

function diffRating(rank) {
  if (!rank)   return 3;
  if (rank<=10) return 5;
  if (rank<=20) return 4;
  if (rank<=35) return 3;
  if (rank<=55) return 2;
  return 1;
}
function diffLabel(r) { return ['','Favorable','Favorable','Moderate','Tough','Danger'][r]||'Moderate'; }
function diffColor(r) { return ['','#22C55E','#22C55E','#F59E0B','#FB923C','#EF4444'][r]||'#F59E0B'; }

function buildOpponents(teamId, group, opponentDesc, standings) {
	const desc = opponentDesc ?? ''

	const directMatch = desc.match(/Winner\s+Group\s+([A-L])|Runner-up\s+Group\s+([A-L])/i)
	if (directMatch) {
		const oppGroup = (directMatch[1] ?? directMatch[2]).toUpperCase()
		const isWinner = !!directMatch[1]
		const gRows = standings[oppGroup] || []
		const target = isWinner ? gRows[0] : gRows[1]
		const info = ALL_TEAMS.find(t => t.id === target?.teamId)
		const rating = diffRating(info?.fifaRank)
		const r32Opps = [{
			group:       oppGroup,
			likelyTeam:  info?.name || 'TBD',
			flag:        info?.flag || '🏳️',
			fifaRank:    info?.fifaRank || 50,
			difficulty:  rating,
			label:       diffLabel(rating),
			color:       diffColor(rating),
			note:        isWinner ? `Winner of Group ${oppGroup}` : `Runner-up of Group ${oppGroup}`,
			pct:         null,
		}]
		return { r32: r32Opps, r16: [] }
	}

	const poolMatch = desc.match(/Best\s+3rd\s+from\s+(.+)/i)
	if (poolMatch) {
		const groups = poolMatch[1].split('/').map(g => g.trim())
		const r32Opps = groups.map(g => {
			const gRows   = standings[g] || []
			const third   = gRows[2]
			const info    = ALL_TEAMS.find(t => t.id === third?.teamId)
			const rating  = diffRating(info?.fifaRank)
			return {
				group:       g,
				likelyTeam:  info?.name || 'TBD',
				flag:        info?.flag || '🏳️',
				fifaRank:    info?.fifaRank || 50,
				difficulty:  rating,
				label:       diffLabel(rating),
				color:       diffColor(rating),
				note:        `3rd-place team from Group ${g}`,
				pct:         null,
			}
		})
		return { r32: r32Opps, r16: [] }
	}

	return { r32: [], r16: [] }
}

function buildGroupStandings(group, rawStandings) {
  if (rawStandings[group]) {
    return rawStandings[group].map(row => {
      const info = ALL_TEAMS.find(t => t.id === row.teamId) || {};
      return { ...row, flag: info.flag || '🏳️', team: info.name || row.team };
    });
  }
  // Fallback: pre-tournament order from schedule
  const sched = GROUP_SCHEDULE[group] || [];
  const ids   = [...new Set([...sched.map(g=>g.h), ...sched.map(g=>g.a)])];
  return ids.map((id, i) => {
    const info = ALL_TEAMS.find(t => t.id === id) || { name: id, flag: '🏳️' };
    return { pos:i+1, teamId:id, team:info.name, flag:info.flag, played:0, w:0, d:0, l:0, gf:0, ga:0, gd:0, pts:0 };
  });
}

// ─── Bracket path validation ──────────────────────────────────────────────────
function validateBracketPaths() {
	const groups = 'ABCDEFGHIJKL'.split('');
	const positions = [1, 2];
	const requiredKeys = ['r32', 'r16', 'qf', 'sf', 'final'];
	const requiredFields = ['match', 'date', 'city', 'venue', 'opponentDesc'];
	const datePattern = /^\d{4}-\d{2}-\d{2}$/;

	const missing = [];
	const badDates = [];
	let hasCritical = false;

	for (const g of groups) {
		for (const p of positions) {
			const key = `${g}-${p}`;
			const entry = BRACKET_PATHS[key];

			if (!entry) {
				missing.push(key);
				hasCritical = true;
				continue;
			}

			for (const stage of requiredKeys) {
				const stageEntry = entry[stage];
				if (!stageEntry) {
					missing.push(`${key}.${stage}`);
					hasCritical = true;
					continue;
				}
				for (const field of requiredFields) {
					if (stageEntry[field] === undefined || stageEntry[field] === null) {
						missing.push(`${key}.${stage}.${field}`);
						hasCritical = true;
					}
				}
				if (stageEntry.date && !datePattern.test(stageEntry.date)) {
					badDates.push(`${key}.${stage}.date = "${stageEntry.date}"`);
				}
			}
		}
	}

	if (badDates.length) {
		log(`⚠  Bracket date format issues: ${badDates.join(', ')}`);
	}
	if (missing.length) {
		log(`⚠  Bracket missing entries: ${missing.join(', ')}`);
	}
	if (hasCritical) {
		throw new Error('Critical bracket path data missing — cannot proceed');
	}
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Road to the Final — Data Update ===');
  ensure(path.join(ROOT, 'public', 'data'));
  ensure(SNAP_DIR);

  validateBracketPaths();

  const existing   = loadExisting();
  const activeIds  = await fetchActiveTeamIds();
  const hasActive  = activeIds.size > 0;

  log(`Active teams today/yesterday: ${hasActive ? activeIds.size : 'none — carrying forward all team data'}`);

  // Only fetch expensive data when there are active teams
  const [rawStandings, allMatches, polyProbs] = hasActive
    ? await Promise.all([fetchStandings(), fetchMatches(), fetchPolymarketAll()])
    : [{}, [], {}];

  if (hasActive) {
    if (!Object.keys(rawStandings).length) log('⚠  No standings data returned — API may be unavailable');
    if (!allMatches.length)             log('⚠  No match data returned — API may be unavailable');
    if (!Object.keys(polyProbs).length) log('⚠  No Polymarket data returned — API may be unavailable');
  }

  log(`Standings: ${Object.keys(rawStandings).length} groups | Matches: ${allMatches.length} | Polymarket: ${Object.keys(polyProbs).length} teams`);

  // Index matches by "homeId:awayId" for O(1) lookup
  const matchIndex = new Map();
  for (const m of allMatches) {
    const hId = nameToId(m.homeTeam?.name, m.homeTeam?.tla);
    const aId = nameToId(m.awayTeam?.name, m.awayTeam?.tla);
    if (hId && aId) matchIndex.set(`${hId}:${aId}`, m);
  }

  // Build group data
  const groupsData = {};
  for (const g of 'ABCDEFGHIJKL'.split('')) {
    const standArr = buildGroupStandings(g, rawStandings);
    const winProbs = {};
    standArr.forEach(s => {
      winProbs[s.teamId] = polyProbs[s.teamId] ?? calcProbs(s.teamId, g, rawStandings, polyProbs).winner;
    });
    groupsData[g] = { standings: standArr, winProbabilities: winProbs };
  }

  // Build team data — full recalc for active teams, carry-forward for others
  const teams = ALL_TEAMS.map(t => {
    const existingTeam = existing?.teams?.find(e => e.id === t.id);

    if (!hasActive || (!activeIds.has(t.id) && existingTeam)) {
      // Carry forward — just preserve what we have
      return existingTeam;
    }

    // Full recalculation
    const existingGroupResults = existingTeam?.groupResults || []
    const groupResults  = buildGroupResults(t.id, t.group, matchIndex, existingGroupResults)
    const advanceProbs  = calcProbs(t.id, t.group, rawStandings, polyProbs)
    const teamPath      = buildPath(t.id, t.group, rawStandings);
    const possibleOpps  = buildOpponents(t.id, t.group, teamPath.r32?.opponentDesc ?? '', rawStandings);

    // Compute mathematical elimination from group standings
    let eliminated = false;
    if (rawStandings?.[t.group]) {
      const gRows = rawStandings[t.group];
      const teamRow = gRows.find(r => r.teamId === t.id);
      if (teamRow) {
        const remainingMatches = 3 - teamRow.played;
        const maxPossible = teamRow.pts + 3 * remainingMatches;
        const sorted = [...gRows].sort((a, b) => b.pts - a.pts);
        const secondPlacePts = sorted[1]?.pts ?? 0;
        eliminated = remainingMatches > 0 && maxPossible < secondPlacePts;
      }
    }

    // currentStage stays 'group_stage' during group play; advances to r32+
    // when tournament data reflects knockout phase
    const stage = 'group_stage';

    return {
      id: t.id, name: t.name, flag: t.flag,
      group: t.group, confederation: t.confederation, fifaRank: t.fifaRank,
      eliminated,
      currentStage: stage,
      groupResults,
      advanceProbabilities: advanceProbs,
      path: teamPath,
      possibleOpponents: possibleOpps,
    };
  }).filter(Boolean);

  log(`Built data for ${teams.length} teams (${hasActive ? activeIds.size + ' fully recalculated' : 'all carried forward'})`);

  // Assemble output
  const today = todayStr();
  const now   = new Date().toISOString();

  const output = {
    lastUpdated:  now,
    snapshotDate: today,
    isHistorical: false,
    tournament: {
      name:         'FIFA World Cup 2026',
      currentStage: 'group_stage',
      stages: {
        group_stage: { status:'active',   label:'Group Stage', date:'Jun 12–27' },
        r32:         { status:'upcoming', label:'Round of 32', date:'Jun 28–Jul 2' },
        r16:         { status:'future',   label:'Round of 16', date:'Jul 4–7' },
        qf:          { status:'future',   label:'Quarterfinal','date':'Jul 9–11' },
        sf:          { status:'future',   label:'Semifinal',   date:'Jul 14–15' },
        final:       { status:'future',   label:'The Final',   date:'Jul 19' },
      },
    },
    groups: groupsData,
    teams,
  };

  // Write live file
  fs.writeFileSync(LIVE_PATH, JSON.stringify(output, null, 2));
  log(`✅ Live data → ${LIVE_PATH}`);

  // Write daily snapshot (one per day, overwrite if already exists today)
  const snapPath = path.join(SNAP_DIR, `${today}.json`);
  fs.writeFileSync(snapPath, JSON.stringify({ ...output, isHistorical: true }));
  log(`✅ Snapshot → ${snapPath}`);

  // Update manifest
  const mf = fs.existsSync(MF_PATH)
    ? JSON.parse(fs.readFileSync(MF_PATH, 'utf8'))
    : { available: [], labels: {} };

  if (!mf.available.includes(today)) {
    mf.available.push(today);
    mf.available.sort();
  }

  // Build human-readable labels
  const TOURNAMENT_START = '2026-06-12';
  mf.available.forEach((d, i) => {
    const isLatest = i === mf.available.length - 1;
    const isStart  = d === TOURNAMENT_START;
    mf.labels[d] = isLatest
      ? `${fmtLabel(d)} (Latest)`
      : isStart
        ? `${fmtLabel(d)} (Tournament start)`
        : fmtLabel(d);
  });

  mf.earliest  = mf.available[0];
  mf.latest    = today;
  mf.generated = now;

  fs.writeFileSync(MF_PATH, JSON.stringify(mf, null, 2));
  log(`✅ Manifest → ${mf.available.length} snapshots`);
  log('=== Done ===');
}

main().catch(err => { console.error('Fatal:', err); process.exit(1); });
