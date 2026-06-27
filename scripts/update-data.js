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
 *
 * Data sources: ESPN (scores, standings, scorers, cards), Polymarket (probabilities).
 * Requires Node 18+ (built-in fetch). No npm dependencies needed for the script.
 */

'use strict';

const fs   = require('fs');
const path = require('path');

const {
	TEAMS: ALL_TEAMS,
	NAME_TO_ID,
	ID_TO_PM_TLAS: ID_TO_PM_TLA,
	nameToId,
} = require('./lib/teams');
const {
	GROUP_SCHEDULE,
	BRACKET_PATHS,
	R32_MATCH_TO_POSITIONS,
} = require('./lib/tournament');

// ─── Paths ───────────────────────────────────────────────────────────────────
const ROOT       = path.join(__dirname, '..');
const LIVE_PATH  = path.join(ROOT, 'public', 'data', 'world-cup-2026.json');
const SNAP_DIR   = path.join(ROOT, 'public', 'data', 'snapshots');
const MF_PATH    = path.join(SNAP_DIR, 'manifest.json');


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

// ─── ESPN: fetch scores, scorers, cards, and active teams (free, no auth required)
async function fetchESPNEventDetails(dateFrom, dateTo) {
	const scorers = {};
	const cards = {};
	const matches = new Map();
	const activeTeams = new Set();

	const ESPN_BASE = 'https://site.web.api.espn.com/apis/site/v2/sports/soccer/fifa.world/scoreboard';

	// ESPN only accepts one date at a time, loop through range
	const start = new Date(dateFrom + 'T00:00:00Z');
	const end   = new Date(dateTo   + 'T00:00:00Z');
	const dates = [];
	for (let d = new Date(start); d <= end; d.setUTCDate(d.getUTCDate() + 1)) {
		dates.push(d.toISOString().split('T')[0].replace(/-/g, ''));
	}

	const today     = todayStr();
	const yesterday = yesterdayStr();

	let fetched = 0;
	for (const date of dates) {
		const data = await tryFetch(`${ESPN_BASE}?dates=${date}`);
		if (!data?.events?.length) continue;
		fetched++;

		for (const event of data.events) {
			const eventDate = event.date?.split('T')[0];
			const eventTime = event.date || '';
			const competition = event.competitions?.[0];
			const competitors = competition?.competitors || [];
			const homeComp = competitors.find(c => c.homeAway === 'home');
			const awayComp = competitors.find(c => c.homeAway === 'away');
			const matchStr = `${homeComp?.team?.displayName || '?'} vs ${awayComp?.team?.displayName || '?'}`;

			// Resolve ESPN display names to our internal IDs (use consolidated NAME_TO_ID)
			const homeId = NAME_TO_ID[homeComp?.team?.displayName] || null;
			const awayId = NAME_TO_ID[awayComp?.team?.displayName] || null;

			// ── Match result extraction ──────────────────────────────────
			const statusType   = competition?.status?.type;
			const statusState  = statusType?.state;       // 'pre' | 'in' | 'post'
			const statusDetail = statusType?.detail;      // e.g. '64'' for live, 'FT' for finished, 'Scheduled' for upcoming
			const isFinished   = statusState === 'post';
			const isInProgress = statusState === 'in';
			const matchStatus  = isFinished ? 'FINISHED' : isInProgress ? 'IN_PROGRESS' : 'SCHEDULED';
			const matchClock   = isInProgress ? (statusDetail || 'LIVE') : '';

			// ── Broadcast extraction ──────────────────────────────────
			const broadcasts = (competition?.geoBroadcasts ?? [])
				.map(b => b.media?.shortName)
				.filter(Boolean)
				.filter((v, i, a) => a.indexOf(v) === i);

			// ── Venue extraction ──────────────────────────────────────
			const venueName = competition?.venue?.fullName || '';
			const venueCity = competition?.venue?.address?.city || '';
			const venue = venueName && venueCity ? `${venueName}, ${venueCity}` : (venueName || venueCity || '');

			if (homeId && awayId) {
				const hScore = parseInt(homeComp?.score, 10) || 0;
				const aScore = parseInt(awayComp?.score, 10) || 0;

				const key = `${homeId}:${awayId}`;
				if (!matches.has(key)) {
					matches.set(key, {
						homeId, awayId, homeScore: hScore, awayScore: aScore,
						status: matchStatus, date: eventDate, clock: matchClock,
						broadcasts, time: eventTime, venue,
					});
				}
			}

			// ── Active team detection ────────────────────────────────────
			if ((eventDate === today || eventDate === yesterday) && homeId && awayId) {
				activeTeams.add(homeId);
				activeTeams.add(awayId);
			}

			// ── Scorer / card extraction ─────────────────────────────────
			// Build ESPN teamId → ourId map for detail lookups
			const teamIdByEspn = {};
			for (const c of competitors) {
				const ourId = NAME_TO_ID[c.team?.displayName];
				if (ourId) teamIdByEspn[String(c.team?.id)] = ourId;
			}

			const details = competition?.details || [];
			for (const d of details) {
				if (d.scoringPlay) {
					const ourId = teamIdByEspn[String(d.team?.id)];
					if (!ourId) continue;
					const athlete = d.athletesInvolved?.[0];
					if (!athlete?.displayName) continue;
					const type = d.type?.text || 'Goal';
					const minute = d.clock?.displayValue || '?';
					const label = type === 'Own Goal'
						? `${athlete.displayName} OG ${minute}`
						: type.includes('Penalty')
							? `${athlete.displayName} ${minute} (P)`
							: `${athlete.displayName} ${minute}`;

					if (!scorers[ourId]) scorers[ourId] = [];
					scorers[ourId].push({ name: athlete.displayName, minute, type, matchStr, label, date: eventDate });
				} else if (d.yellowCard || d.redCard) {
					const ourId = teamIdByEspn[String(d.team?.id)];
					if (!ourId) continue;
					const athlete = d.athletesInvolved?.[0];
					if (!athlete?.displayName) continue;
					const cardType = d.redCard ? 'red' : 'yellow';
					const minute = d.clock?.displayValue || '?';

					if (!cards[ourId]) cards[ourId] = [];
					cards[ourId].push({ player: athlete.displayName, minute, type: cardType, date: eventDate });
				}
			}
		}
	}

	if (fetched > 0) {
		const totalS = Object.values(scorers).reduce((s, arr) => s + arr.length, 0);
		const totalC = Object.values(cards).reduce((s, arr) => s + arr.length, 0);
		log(`ESPN: ${totalS} scorer + ${totalC} card entries across ${Object.keys(scorers).length}/${Object.keys(cards).length} teams (${fetched} dates)`);
	}
	log(`ESPN matches: ${matches.size} extracted, ${activeTeams.size} active teams`);
	return { matches, scorers, cards, activeTeams };
}

// ─── Normalize ESPN UTC dates → local venue dates using GROUP_SCHEDULE ─────────
function normalizeESPNCalendarDates(espnMatches, espnScorers, espnCards) {
	const sched = new Map();
	for (const games of Object.values(GROUP_SCHEDULE)) {
		for (const g of games) {
			sched.set(`${g.h}:${g.a}`, g.d);
			sched.set(`${g.a}:${g.h}`, g.d);
		}
	}

	let normalized = 0;
	for (const [key, match] of espnMatches) {
		const localDate = sched.get(key);
		if (!localDate || localDate === match.date) continue;

		const oldDate = match.date;
		match.date = localDate;
		normalized++;

		// Normalize scorer/card dates for both teams
		const [homeId, awayId] = key.split(':');
		for (const teamId of [homeId, awayId]) {
			const scorers = espnScorers[teamId];
			if (scorers) {
				for (const s of scorers) {
					if (s.date === oldDate) s.date = localDate;
				}
			}
			const cards = espnCards[teamId];
			if (cards) {
				for (const c of cards) {
					if (c.date === oldDate) c.date = localDate;
				}
			}
		}
	}

	if (normalized > 0) log(`Normalized ${normalized} match dates from UTC → local venue time`);
}

// ─── Compute group standings from ESPN match data ─────────────────────────────
function computeStandings(espnMatches) {
	const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');
	const groups = {};

	for (const g of GROUP_LETTERS) {
		const sched = GROUP_SCHEDULE[g] || [];
		const teamIds = [...new Set([...sched.map(f => f.h), ...sched.map(f => f.a)])];
		groups[g] = {};
		for (const tid of teamIds) {
			groups[g][tid] = { played: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0 };
		}
	}

	for (const [key, match] of espnMatches.entries()) {
		if (match.status !== 'FINISHED') continue;
		const [homeId, awayId] = key.split(':');
		const { homeScore, awayScore } = match;

		let group = null;
		for (const g of GROUP_LETTERS) {
			const sched = GROUP_SCHEDULE[g] || [];
			if (sched.find(f => (f.h === homeId && f.a === awayId) || (f.h === awayId && f.a === homeId))) {
				group = g; break;
			}
		}
		if (!group) continue;

		const homeStats = groups[group][homeId];
		if (homeStats) {
			homeStats.played++;
			homeStats.gf += homeScore;
			homeStats.ga += awayScore;
			if (homeScore > awayScore) { homeStats.w++; homeStats.pts += 3; }
			else if (homeScore < awayScore) { homeStats.l++; }
			else { homeStats.d++; homeStats.pts++; }
		}

		const awayStats = groups[group][awayId];
		if (awayStats) {
			awayStats.played++;
			awayStats.gf += awayScore;
			awayStats.ga += homeScore;
			if (awayScore > homeScore) { awayStats.w++; awayStats.pts += 3; }
			else if (awayScore < homeScore) { awayStats.l++; }
			else { awayStats.d++; awayStats.pts++; }
		}
	}

	const result = {};
	for (const g of GROUP_LETTERS) {
		const teamStats = Object.entries(groups[g]).map(([teamId, stats]) => ({
			teamId,
			team: ALL_TEAMS.find(t => t.id === teamId)?.name || teamId,
			...stats,
			gd: stats.gf - stats.ga,
		}));
		teamStats.sort((a, b) => b.pts - a.pts || (b.gd - a.gd) || (b.gf - a.gf));
		result[g] = teamStats.map((s, i) => ({ ...s, pos: i + 1 }));
	}
	return result;
}

// Polymarket name → id resolution comes from the shared registry's NAME_TO_ID
// (which already includes 'Bosnia-Herzegovina', 'Turkiye', etc. as aliases).
const pmNameToId = nameToId;

// ─── Polymarket: fetch ALL stage probabilities (18 events total) ─────────────────
// Returns { group, r32, r16, qf, sf, final, winner } — each { teamId: pct }
async function fetchPolymarketAll() {
  const result = { group: {}, r32: {}, r16: {}, qf: {}, sf: {}, final: {}, winner: {} };

  const GROUP_SLUGS = 'abcdefghijkl'.split('').map(l => `world-cup-group-${l}-winner`);
  const TOURNAMENT_SLUGS = {
    r32:    'world-cup-team-to-advance-to-knockout-stages',
    r16:    'world-cup-nation-to-reach-round-of-16',
    qf:     'world-cup-nation-to-reach-quarterfinals',
    sf:     'world-cup-nation-to-reach-semifinals',
    final:  'world-cup-nation-to-reach-final',
    winner: 'world-cup-winner',
  };

  // Helper: parse markets from an event response into the target stage map
  const parseEvent = (data, target) => {
    validatePolymarketResponse(data);
    const markets = data[0].markets || [];
    for (const m of markets) {
      const name = m.groupItemTitle || '';
      const id = pmNameToId(name);
      if (!id) {
        // Log unmatched names for debugging (skip known non-team entries)
        if (name && name !== 'Other' && !name.startsWith('Team ') && name !== 'Field')
          log(`⚠  Polymarket unmapped: "${name}"`);
        continue;
      }
      let prices;
      try { prices = JSON.parse(m.outcomePrices || '[]'); } catch { continue; }
      const yesPct = parseFloat(prices[0]);
      if (isNaN(yesPct)) continue;
      target[id] = Math.round(yesPct * 100);
    }
  };

  // Fetch all 12 group winner events
  for (const slug of GROUP_SLUGS) {
    const data = await tryFetch(`https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`);
    if (!data?.length) {
      log(`⚠  Polymarket event not found: ${slug}`);
      continue;
    }
    parseEvent(data, result.group);
  }
  log(`Polymarket group winners: ${Object.keys(result.group).length} teams`);

  // Fetch all 6 tournament stage events
  for (const [stage, slug] of Object.entries(TOURNAMENT_SLUGS)) {
    const data = await tryFetch(`https://gamma-api.polymarket.com/events?slug=${slug}&limit=1`);
    if (!data?.length) {
      log(`⚠  Polymarket event not found: ${slug}`);
      continue;
    }
    parseEvent(data, result[stage]);
    log(`Polymarket ${stage}: ${Object.keys(result[stage]).length} teams`);
  }

  const allIds = [...new Set(Object.values(result).flatMap(Object.keys))];
  log(`Polymarket combined: ${allIds.length} unique teams across all stages`);
  return result;
}

// ─── Polymarket: per-matchup odds (fifwc-{home}-{away}-{date} event) ─────────────
// Returns { homeId, awayId, homeWinPct, awayWinPct, drawPct, eventSlug } or null.
// Persists homeId/awayId so the frontend can determine orientation by id (not by
// parsing TLAs out of the slug, which avoids ambiguity when Polymarket uses ISO
// codes vs. our FIFA TLAs for display).
async function fetchMatchupOdds(homeId, awayId, date, time) {
	const homeTlas = ID_TO_PM_TLA[homeId];
	const awayTlas = ID_TO_PM_TLA[awayId];
	if (!homeTlas?.length || !awayTlas?.length) return null;

	const trySlug = async (slug) => {
		const data = await tryFetch(`https://gamma-api.polymarket.com/events?slug=${slug}`);
		if (data === FETCH_ERROR || !Array.isArray(data) || data.length === 0) return null;
		return data[0];
	};

	// Build candidate date list — Polymarket slugs use the kickoff's UTC date,
	// but our `date` field is the local match-day (Pacific), which differs for
	// late-evening kickoffs (e.g., 7pm PT = 02:00 UTC next day).
	const dates = [date];
	if (time) {
		const utcDate = new Date(time).toISOString().slice(0, 10);
		if (utcDate && utcDate !== date) dates.push(utcDate);
	}

	// Try every combination of {primary, alternate} TLAs × {home-first,
	// away-first} ordering × {match date, UTC date} until one hits.
	let event = null;
	let matchedHomeTla = null;
	let matchedAwayTla = null;
	outer: for (const d of dates) {
		for (const h of homeTlas) {
			for (const a of awayTlas) {
				const fwd = await trySlug(`fifwc-${h}-${a}-${d}`);
				if (fwd) { event = fwd; matchedHomeTla = h; matchedAwayTla = a; break outer; }
				const rev = await trySlug(`fifwc-${a}-${h}-${d}`);
				if (rev) { event = rev; matchedHomeTla = h; matchedAwayTla = a; break outer; }
			}
		}
	}
	if (!event?.markets?.length) return null;

	const pricePct = (priceStr) => {
		try {
			const parsed = JSON.parse(priceStr || '[]');
			const yes = parseFloat(parsed[0]);
			return isNaN(yes) ? null : Math.round(yes * 100);
		} catch { return null; }
	};

	let homeWinPct = null, awayWinPct = null, drawPct = null;
	for (const m of event.markets) {
		const slug = m.slug || '';
		const pct = pricePct(m.outcomePrices);
		if (pct == null) continue;
		if (slug.endsWith('-draw')) drawPct = pct;
		else if (slug.endsWith(`-${matchedHomeTla}`)) homeWinPct = pct;
		else if (slug.endsWith(`-${matchedAwayTla}`)) awayWinPct = pct;
	}

	if (homeWinPct == null && awayWinPct == null && drawPct == null) return null;
	return {
		homeId,
		awayId,
		homeWinPct: homeWinPct ?? 0,
		awayWinPct: awayWinPct ?? 0,
		drawPct: drawPct ?? 0,
		eventSlug: event.slug,
	};
}

// Run fetches in batches to avoid hammering Polymarket.
async function attachMatchupOdds(dailyMatches, existing) {
	const all = Object.values(dailyMatches).flat();
	// Markets stay live until resolved — fetch for scheduled AND in-progress matches.
	// Skip FINISHED (already resolved to 100/0, not useful).
	const pending = all.filter(m => m.status === 'SCHEDULED' || m.status === 'IN_PROGRESS');

	// Build a lookup of previously-persisted odds so we can carry forward when
	// a fetch returns null (Polymarket transient failure).
	const prevOdds = new Map();
	const prevDaily = existing?.dailyMatches || {};
	for (const arr of Object.values(prevDaily)) {
		for (const m of arr) {
			if (m.polymarket) prevOdds.set(`${m.homeId}:${m.awayId}:${m.date}`, m.polymarket);
		}
	}

	const BATCH = 8;
	let hits = 0;
	let carried = 0;
	for (let i = 0; i < pending.length; i += BATCH) {
		const slice = pending.slice(i, i + BATCH);
		await Promise.all(slice.map(async (m) => {
			const odds = await fetchMatchupOdds(m.homeId, m.awayId, m.date, m.time);
			if (odds) {
				m.polymarket = odds;
				hits++;
			} else {
				const prev = prevOdds.get(`${m.homeId}:${m.awayId}:${m.date}`);
				if (prev) { m.polymarket = prev; carried++; }
			}
		}));
	}
	log(`Polymarket matchup odds: ${hits} fresh + ${carried} carried-forward / ${pending.length} active matches`);
}


function buildGroupResults(teamId, group, matchIndex, existingGroupResults = []) {
  const sched = GROUP_SCHEDULE[group] || [];
  return sched
    .filter(g => g.h === teamId || g.a === teamId)
    .sort((a,b) => a.md - b.md)
    .map(g => {
      const isHome  = g.h === teamId;
      const oppId   = isHome ? g.a : g.h;
      const oppInfo = ALL_TEAMS.find(t => t.id === oppId) || {};

      // Try both directions — API may assign home/away differently than schedule
      let match = matchIndex.get(`${g.h}:${g.a}`);
      let matchReversed = false;
      if (!match) {
        match = matchIndex.get(`${g.a}:${g.h}`);
        matchReversed = true;
      }

      let result = null, score = null;
      if (match?.status === 'FINISHED') {
        const isMyTeamHome = isHome !== matchReversed;
        const myG = isMyTeamHome ? match.homeScore : match.awayScore;
        const opG = isMyTeamHome ? match.awayScore : match.homeScore;
        result = myG > opG ? 'W' : myG < opG ? 'L' : 'D';
        score  = `${myG}-${opG}`;
      } else if (match?.status === 'IN_PROGRESS') {
        const isMyTeamHome = isHome !== matchReversed;
        const myG = isMyTeamHome ? match.homeScore : match.awayScore;
        const opG = isMyTeamHome ? match.awayScore : match.homeScore;
        score  = `${myG}-${opG}`;
      }

      const existingMatch = existingGroupResults.find(
        e => e.matchday === g.md && e.opponent === oppInfo.name
      )

      return {
        matchday: g.md, opponent: oppInfo.name || oppId, opponentFlag: oppInfo.flag || '🏳️',
        result, score, date: g.d, venue: g.v,
        scorers: existingMatch?.scorers?.length ? existingMatch.scorers : [],
        cards: existingMatch?.cards?.length ? existingMatch.cards : [],
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

function calcProbs(teamId, group, standings, polyData, existingProbs) {
  // Use Polymarket data DIRECTLY for every stage where it exists.
  // NO interpolation for stages with market data — pull from source of truth.
  // Only use 'calculated' for stages where Polymarket truly has no price.
  const market = {
    r32:    polyData?.r32?.[teamId],
    r16:    polyData?.r16?.[teamId],
    qf:     polyData?.qf?.[teamId],
    sf:     polyData?.sf?.[teamId],
    final:  polyData?.final?.[teamId],
    winner: polyData?.winner?.[teamId],
  };

  const stages = ['r32', 'r16', 'qf', 'sf', 'final', 'winner'];
  const known = stages
    .map((key, idx) => ({ key, idx, val: market[key] }))
    .filter(s => typeof s.val === 'number');

  const hasAnyMarket = known.length > 0;

  if (!hasAnyMarket) {
    // No Polymarket data at all: use ranking/standings-based fallback
    return calcProbsFallback(teamId, group, standings);
  }

  // Idempotency guard: when a stage is missing from the current Polymarket
  // fetch but was present (with source='market') in the previous JSON, prefer
  // the previous value over interpolation. Protects against transient
  // Polymarket gaps reducing market-quality data to interpolated estimates.
  const prevSource = existingProbs?.source;
  const prevWasMarket = prevSource === 'market';

  // Build result: use market data where available, interpolate only the gaps
  const result = {};
  for (let i = 0; i < stages.length; i++) {
    const stageKey = stages[i];
    if (typeof market[stageKey] === 'number') {
      result[stageKey] = market[stageKey];
      continue;
    }
    // Stage missing from current Polymarket fetch — try previous market value first
    if (prevWasMarket && typeof existingProbs?.[stageKey] === 'number') {
      result[stageKey] = existingProbs[stageKey];
      continue;
    }
    // Find nearest known stages before and after
    const before = [...known].reverse().find(k => k.idx < i);
    const after = known.find(k => k.idx > i);

    if (before && after) {
      // Geometric interpolation between two known stages
      const steps = after.idx - before.idx;
      const t = (i - before.idx) / steps;
      result[stageKey] = Math.round(before.val * Math.pow(after.val / before.val, t));
    } else if (before) {
      // Extrapolate forward from last known stage
      const stepsFrom = i - before.idx;
      const perRound = 0.48; // conservative per-round advancement factor
      result[stageKey] = Math.round(before.val * Math.pow(perRound, stepsFrom));
    } else if (after) {
      // Extrapolate backward from first known stage
      const stepsTo = after.idx - i;
      const perRound = 1 / 0.48;
      result[stageKey] = Math.min(Math.round(after.val * Math.pow(perRound, stepsTo)), 99);
    }
  }

  // Enforce monotonicity: each later stage must be <= earlier stage
  // (Polymarket markets for different stages aren't perfectly consistent)
  for (let i = 1; i < stages.length; i++) {
    if (result[stages[i]] > result[stages[i - 1]]) {
      result[stages[i]] = result[stages[i - 1]];
    }
  }

  return { ...result, source: 'market' };
}

// Fallback when Polymarket has no data for a team (ranking + standings based)
function calcProbsFallback(teamId, group, standings) {
  const rows = standings[group] || [];
  const row = rows.find(r => r.teamId === teamId);
  const base = ALL_TEAMS.find(t => t.id === teamId)?.fifaRank ?? 50;

  const hasStandings = rows.length > 0;
  const pos = hasStandings ? (row?.pos ?? 4) : 4;
  const rankScore = Math.max(1, 50 - base);

  let seed;
  if (hasStandings) {
    const posMult = { 1: 1.0, 2: 0.65, 3: 0.3, 4: 0.05 }[pos] ?? 0.5;
    seed = Math.round(rankScore * posMult);
  } else {
    const tiers = [
      { max: 10, pct: 25 }, { max: 20, pct: 18 }, { max: 30, pct: 12 },
      { max: 40, pct: 8  }, { max: 50, pct: 5  }, { max: Infinity, pct: 2 },
    ];
    const tier = tiers.find(t => base <= t.max);
    seed = tier ? Math.round(tier.pct * (rankScore / 50)) : 2;
  }

  const seedWinner = Math.min(seed, 30);
  const r32 = Math.min(Math.round(seedWinner * 2.8 + (pos <= 2 ? 20 : 5)), 99);
  const r16 = Math.round(r32 * 0.55);
  const qf   = Math.round(r16 * 0.52);
  const sf   = Math.round(qf  * 0.50);
  const final = Math.round(sf  * 0.50);
  // Derive winner from the chain so all stages remain monotonically decreasing
  const winner = Math.round(final * 0.50);

  return { r32, r16, qf, sf, final, winner, source: 'calculated' };
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

function buildOpponents(teamId, group, r32Desc, r16Desc, standings) {
	const desc = r32Desc ?? ''

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
		return { r32: r32Opps, r16: buildR16Opponents(teamId, r16Desc, standings) }
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
		return { r32: r32Opps, r16: buildR16Opponents(teamId, r16Desc, standings) }
	}

	return { r32: [], r16: buildR16Opponents(teamId, r16Desc, standings) }
}

// Builds the list of possible R16 opponents from the R16 opponentDesc.
// Handles "Winner Match X" and "Winner Group X (Match Y)" patterns.
function buildR16Opponents(teamId, r16Desc, standings) {
	const desc = r16Desc ?? ''

	// Extract match number from "Winner Match 82" or "Winner Group G (Match 82)"
	const matchRef = desc.match(/\(Match\s+(\d+)\)|Winner\s+Match\s+(\d+)/i)
	if (matchRef) {
		const matchNum = parseInt(matchRef[1] ?? matchRef[2], 10)
		const posKeys = R32_MATCH_TO_POSITIONS[matchNum] || []
		return posKeys
			.filter(key => {
				// Exclude the current team's own bracket slot to avoid self-referential results
				const [grp, pos] = key.split('-')
				const gRows = standings[grp] || []
				const target = pos === '1' ? gRows[0] : gRows[1]
				return target?.teamId !== teamId
			})
			.map(key => {
				const [grp, pos] = key.split('-')
				const gRows = standings[grp] || []
				const target = pos === '1' ? gRows[0] : gRows[1]
				const info = ALL_TEAMS.find(t => t.id === target?.teamId)
				const rating = diffRating(info?.fifaRank)
				return {
					group:      grp,
					likelyTeam: info?.name || 'TBD',
					flag:       info?.flag || '🏳️',
					fifaRank:   info?.fifaRank || 50,
					difficulty: rating,
					label:      diffLabel(rating),
					color:      diffColor(rating),
					note:       `${pos === '1' ? 'Winner' : 'Runner-up'} of Group ${grp}`,
					pct:        null,
				}
			})
	}

	// "Winner Group X" without a match number — direct group lookup
	const groupRef = desc.match(/Winner\s+Group\s+([A-L])|Runner-up\s+Group\s+([A-L])/i)
	if (groupRef) {
		const oppGroup = (groupRef[1] ?? groupRef[2]).toUpperCase()
		const isWinner = !!groupRef[1]
		const gRows = standings[oppGroup] || []
		const target = isWinner ? gRows[0] : gRows[1]
		const info = ALL_TEAMS.find(t => t.id === target?.teamId)
		const rating = diffRating(info?.fifaRank)
		return [{
			group:      oppGroup,
			likelyTeam: info?.name || 'TBD',
			flag:       info?.flag || '🏳️',
			fifaRank:   info?.fifaRank || 50,
			difficulty: rating,
			label:      diffLabel(rating),
			color:      diffColor(rating),
			note:       isWinner ? `Winner of Group ${oppGroup}` : `Runner-up of Group ${oppGroup}`,
			pct:        null,
		}]
	}

	return []
}

const STAGE_ORDER = ['group_stage', 'r32', 'r16', 'qf', 'sf', 'final'];

/**
 * Brute-force check: across all possible outcomes of remaining group matches,
 * does at least one scenario have this team finishing in the top 3?
 *
 * 2026 World Cup has 48 teams in 12 groups of 4. Top 2 + 8 best 3rd-place
 * teams advance to R32, so a team is only mathematically locked out of R32
 * if they're guaranteed to finish 4th. Polymarket=0% is the primary signal
 * for the more nuanced "can finish 3rd but won't make wildcard" cases.
 */
function canStillFinishTop3(teamId, group, rawStandings, espnMatches) {
	const rows = rawStandings?.[group] ?? [];
	if (rows.length === 0) return true;
	const teamIds = new Set(rows.map(r => r.teamId).filter(Boolean));

	const remaining = [];
	for (const [key, match] of espnMatches.entries()) {
		if (match.status === 'FINISHED') continue;
		const [h, a] = key.split(':');
		if (teamIds.has(h) && teamIds.has(a)) remaining.push([h, a]);
	}

	if (remaining.length === 0) {
		const row = rows.find(r => r.teamId === teamId);
		return !!row && row.pos <= 3;
	}

	const outcomes = [
		{ hPts: 3, aPts: 0, hGd: 1, aGd: -1 },
		{ hPts: 0, aPts: 3, hGd: -1, aGd: 1 },
		{ hPts: 1, aPts: 1, hGd: 0, aGd: 0 },
	];

	function dfs(i, sim) {
		if (i === remaining.length) {
			const sorted = [...sim].sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || ((b.gf || 0) - (a.gf || 0)));
			const pos = sorted.findIndex(r => r.teamId === teamId) + 1;
			return pos > 0 && pos <= 3;
		}
		const [h, a] = remaining[i];
		for (const o of outcomes) {
			const next = sim.map(r => ({ ...r }));
			const hRow = next.find(r => r.teamId === h);
			const aRow = next.find(r => r.teamId === a);
			if (hRow) { hRow.pts += o.hPts; hRow.gd += o.hGd; }
			if (aRow) { aRow.pts += o.aPts; aRow.gd += o.aGd; }
			if (dfs(i + 1, next)) return true;
		}
		return false;
	}

	return dfs(0, rows.map(r => ({ ...r })));
}

function determineCurrentStage(teamId, group, rawStandings, espnMatches) {
	const groupRows = rawStandings?.[group];
	if (!groupRows?.length) return 'group_stage';

	const teamRow = groupRows.find(r => r.teamId === teamId);
	if (!teamRow) return 'group_stage';

	const played = teamRow.played ?? 0;
	if (played < 3) return 'group_stage';

	const pos = teamRow.pos ?? 4;
	if (pos > 2) return 'group_stage';

	const groupFinished = groupRows.every(r => (r.played ?? 0) >= 3);
	if (!groupFinished) return 'group_stage';

	const knockoutStages = ['r32', 'r16', 'qf', 'sf', 'final'];
	let lastWonStage = null;
	for (const stage of knockoutStages) {
		const match = findKnockoutMatch(teamId, group, pos, stage, espnMatches);
		if (!match) continue;

		const isTeamHome = match.homeId === teamId;
		const isTeamAway = match.awayId === teamId;

		if (match.status === 'FINISHED') {
			if (isTeamHome || isTeamAway) {
				const myGoals = isTeamHome ? match.homeScore : match.awayScore;
				const oppGoals = isTeamHome ? match.awayScore : match.homeScore;
				if (myGoals < oppGoals) {
					return { stage, eliminated: true, eliminatedIn: stage };
				}
				lastWonStage = stage;
			}
			continue;
		}

		// Unfinished knockout match exists → that's the team's current stage.
		return { stage, eliminated: false };
	}

	// No unfinished match found. Current stage = the one AFTER the last
	// knockout the team won. If no knockouts found at all (bracket not yet
	// drawn for this team), they're heading into R32. If they won the final,
	// they stay at 'final' (champion).
	const lastIdx = lastWonStage ? knockoutStages.indexOf(lastWonStage) : -1;
	const nextIdx = Math.min(lastIdx + 1, knockoutStages.length - 1);
	return { stage: knockoutStages[nextIdx], eliminated: false };
}

function findKnockoutMatch(teamId, group, pos, stage, espnMatches) {
	const pathKey = `${group}-${pos}`;
	const bp = BRACKET_PATHS[pathKey];
	if (!bp?.[stage]?.date) return null;

	const matchDate = bp[stage].date;

	for (const [key, match] of espnMatches.entries()) {
		if (match.date !== matchDate) continue;
		const [hId, aId] = key.split(':');
		if (hId === teamId || aId === teamId) {
			return match;
		}
	}
	return null;
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

// Inject ESPN scorer data into group results
function injectScorers(groupResults, espnScorers) {
  if (!espnScorers?.length) return groupResults;
  const labels = espnScorers.map(s => s.label);
  let assigned = false;
  return groupResults.map(gr => {
    if (gr.scorers?.length > 0) return gr;
    if (!gr.result) return gr;
    // Match by date first, fall back to first unresolved match
    const matchScorers = espnScorers.filter(s => s.date === gr.date);
    if (matchScorers.length > 0) {
      assigned = true;
      return { ...gr, scorers: matchScorers.map(s => s.label) };
    }
    // Fallback: first finished match without scorers gets all scorers
    if (!assigned) {
      assigned = true;
      return { ...gr, scorers: labels };
    }
    return gr;
  });
}

function injectCards(groupResults, espnCards) {
  if (!espnCards?.length) return groupResults;
  const entries = espnCards.map(c => ({ player: c.player, minute: c.minute, type: c.type }));
  let assigned = false;
  return groupResults.map(gr => {
    if (gr.cards?.length > 0) return gr;
    if (!gr.result) return gr;
    const matchCards = espnCards.filter(c => c.date === gr.date);
    if (matchCards.length > 0) {
      assigned = true;
      return { ...gr, cards: matchCards.map(c => ({ player: c.player, minute: c.minute, type: c.type })) };
    }
    if (!assigned) {
      assigned = true;
      return { ...gr, cards: entries };
    }
    return gr;
  });
}

function isSingleGroupDegraded(groupData) {
  // A group is degraded if it has no win probabilities at all.
  // When using market (Polymarket) data, win probabilities are tournament-level
  // and may sum to very little — that's valid, not degraded.
  if (!groupData?.winProbabilities) return true;
  return false;
}

// ─── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  log('=== Road to the Final — Data Update ===');
  ensure(path.join(ROOT, 'public', 'data'));
  ensure(SNAP_DIR);

  validateBracketPaths();

  const existing   = loadExisting();

  // Polymarket + ESPN always run (no API key needed for either)
  const polyData = await fetchPolymarketAll();

  const TOURNAMENT_START_ESPN = '2026-06-11';
  const TOURNAMENT_END_ESPN   = '2026-07-19'; // full tournament through the Final
  const { matches: espnMatches, scorers: espnScorers, cards: espnCards, activeTeams: espnActiveTeams }
    = await fetchESPNEventDetails(TOURNAMENT_START_ESPN, TOURNAMENT_END_ESPN);

  // Normalize all ESPN UTC dates to local venue dates
  normalizeESPNCalendarDates(espnMatches, espnScorers, espnCards);

  const activeIds  = espnActiveTeams;
  const hasActive  = activeIds.size > 0;

  log(`Active teams today/yesterday: ${hasActive ? activeIds.size : 'none — carrying forward all team data'}`);

  if (!Object.keys(polyData.winner || {}).length && !Object.keys(polyData.r32 || {}).length)
    log('⚠  No Polymarket data returned — API may be unavailable');

  // Compute standings directly from ESPN match data (no separate API call)
  const rawStandings = computeStandings(espnMatches);

  log(`ESPN standings: ${Object.keys(rawStandings).length} groups | ESPN matches: ${espnMatches.size} | Polymarket: ${Object.keys(polyData.winner || {}).length} winner + ${Object.keys(polyData.group || {}).length} group + ${Object.keys(polyData.r32 || {}).length} R32 teams`);

  // Build group data — per-group carry-forward for healthy groups
  const groupsData = {};
  const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');
  const existingGroups = existing?.groups || {};

  for (const g of GROUP_LETTERS) {
    const existingGroup = existingGroups[g];

    if (hasActive && Object.keys(rawStandings).length > 0) {
      // Fresh ESPN data: always rebuild from standings
      const standArr = buildGroupStandings(g, rawStandings);
      const winProbs = {};
      standArr.forEach(s => {
        // Use Polymarket group winner data directly, fallback to existing or 0
        winProbs[s.teamId] = polyData.group?.[s.teamId]
          ?? existingGroup?.winProbabilities?.[s.teamId]
          ?? 0;
      });
      groupsData[g] = { standings: standArr, winProbabilities: winProbs };
    } else if (existingGroup && !isSingleGroupDegraded(existingGroup)) {
      // Quiet day with healthy existing data: carry forward but refresh
      // Polymarket group win probabilities (market odds change independently)
      const refreshed = { ...existingGroup };
      if (Object.keys(polyData.group || {}).length > 0) {
        const updatedWinProbs = { ...existingGroup.winProbabilities };
        for (const tid of Object.keys(updatedWinProbs)) {
          if (typeof polyData.group[tid] === 'number') {
            updatedWinProbs[tid] = polyData.group[tid];
          }
        }
        refreshed.winProbabilities = updatedWinProbs;
      }
      groupsData[g] = refreshed;
    } else {
      // No existing data or degraded: rebuild with available market data
      const standArr = buildGroupStandings(g, rawStandings);
      const winProbs = {};
      standArr.forEach(s => {
        winProbs[s.teamId] = polyData.group?.[s.teamId] ?? 0;
      });
      groupsData[g] = { standings: standArr, winProbabilities: winProbs };
    }
  }

  if (!hasActive || !Object.keys(rawStandings).length) {
    const carried = GROUP_LETTERS.filter(g => existingGroups[g] && !isSingleGroupDegraded(existingGroups[g])).length;
    log(`No new standings — carrying forward ${carried}/12 healthy groups`);
  }

  // Build team data — full recalc for active teams, smart carry-forward for others
  const teams = ALL_TEAMS.map(t => {
    const existingTeam = existing?.teams?.find(e => e.id === t.id);
    const isActive = hasActive && activeIds.has(t.id);

    // Group elimination: in the 48-team World Cup format, top 2 + 8 best 3rds
    // advance, so a team is mathematically locked out only when guaranteed 4th.
    // Brute-force simulate remaining match outcomes; if no scenario has this
    // team finishing top 3, they're definitively out. Polymarket=0% (below)
    // handles the more nuanced "can finish 3rd but won't make the wildcard 8".
    let eliminated = false;
    if (rawStandings?.[t.group]) {
      eliminated = !canStillFinishTop3(t.id, t.group, rawStandings, espnMatches);
    }
    // Polymarket signal: r32=0 means the market resolved against the team.
    if (typeof polyData.r32?.[t.id] === 'number' && polyData.r32[t.id] === 0) {
      eliminated = true;
    }

    // Knockout stage detection — only when tournament has knockout data
    const stageResult = determineCurrentStage(t.id, t.group, rawStandings, espnMatches);
    const stage = stageResult?.stage ?? 'group_stage';
    if (stageResult?.eliminated) {
      eliminated = true;
    }

    if (!isActive && existingTeam) {
      // Carry forward but always recalculate advance probabilities with fresh
      // Polymarket data (market odds change independently of match results)
      const hasFreshPoly = typeof polyData.r32?.[t.id] === 'number'
        || typeof polyData.r16?.[t.id] === 'number'
        || typeof polyData.qf?.[t.id] === 'number'
        || typeof polyData.sf?.[t.id] === 'number'
        || typeof polyData.final?.[t.id] === 'number'
        || typeof polyData.winner?.[t.id] === 'number';
      const teamAdvP = hasFreshPoly
        ? calcProbs(t.id, t.group, rawStandings, polyData, existingTeam.advanceProbabilities)
        : existingTeam.advanceProbabilities;

      // Carry forward but always update computed fields if standings exist
      if (Object.keys(rawStandings).length > 0) {
        const teamPath = buildPath(t.id, t.group, rawStandings);
        const possibleOpps = buildOpponents(t.id, t.group, teamPath.r32?.opponentDesc ?? '', teamPath.r16?.opponentDesc ?? '', rawStandings);
        return {
          ...existingTeam,
          eliminated,
          currentStage: stage,
          advanceProbabilities: teamAdvP,
          path: teamPath,
          possibleOpponents: possibleOpps,
          groupResults: injectCards(
            injectScorers(
              buildGroupResults(t.id, t.group, espnMatches, existingTeam.groupResults || []),
              espnScorers[t.id]
            ),
            espnCards[t.id]
          ),
        };
      }
      return {
        ...existingTeam,
        eliminated,
        currentStage: stage,
        advanceProbabilities: teamAdvP,
        groupResults: injectCards(
          injectScorers(
            buildGroupResults(t.id, t.group, espnMatches, existingTeam.groupResults || []),
            espnScorers[t.id]
          ),
          espnCards[t.id]
        ),
      };
    }

    // Full recalculation
    const existingGroupResults = existingTeam?.groupResults || []
    const groupResults  = injectCards(
      injectScorers(
        buildGroupResults(t.id, t.group, espnMatches, existingGroupResults),
        espnScorers[t.id]
      ),
      espnCards[t.id]
    )

    // Preserve existing market-sourced probabilities when Poly is unavailable
    const existingHadMarket = existingTeam?.advanceProbabilities?.source === 'market';
    const hasFreshPoly = typeof polyData.r32?.[t.id] === 'number'
      || typeof polyData.r16?.[t.id] === 'number'
      || typeof polyData.qf?.[t.id] === 'number'
      || typeof polyData.sf?.[t.id] === 'number'
      || typeof polyData.final?.[t.id] === 'number'
      || typeof polyData.winner?.[t.id] === 'number';
    const teamAdvanceProbs = existingHadMarket && !hasFreshPoly
      ? existingTeam.advanceProbabilities
      : calcProbs(t.id, t.group, rawStandings, polyData, existingTeam?.advanceProbabilities);

    const teamPath      = buildPath(t.id, t.group, rawStandings);
    const possibleOpps  = buildOpponents(t.id, t.group, teamPath.r32?.opponentDesc ?? '', teamPath.r16?.opponentDesc ?? '', rawStandings);

    return {
      id: t.id, name: t.name, flag: t.flag,
      group: t.group, confederation: t.confederation, fifaRank: t.fifaRank,
      eliminated,
      currentStage: stage,
      groupResults,
      advanceProbabilities: teamAdvanceProbs,
      path: teamPath,
      possibleOpponents: possibleOpps,
    };
  }).filter(Boolean);

  log(`Built data for ${teams.length} teams (${hasActive ? activeIds.size + ' fully recalculated' : 'all carried forward'})`);

  // Build dailyMatches from espnMatches (enriched with team names/flags)
  const dailyMatches = {};
  for (const [key, match] of espnMatches) {
    const [homeId, awayId] = key.split(':');
    const homeTeam = ALL_TEAMS.find(t => t.id === homeId);
    const awayTeam = ALL_TEAMS.find(t => t.id === awayId);
    const date = match.date;
    if (!dailyMatches[date]) dailyMatches[date] = [];
    dailyMatches[date].push({
      homeTeam: homeTeam?.name || homeId,
      homeFlag: homeTeam?.flag || '🏳️',
      homeId: homeId,
      awayTeam: awayTeam?.name || awayId,
      awayFlag: awayTeam?.flag || '🏳️',
      awayId: awayId,
      homeScore: match.homeScore,
      awayScore: match.awayScore,
      status: match.status,
      date: match.date,
      clock: match.clock || undefined,
      broadcasts: match.broadcasts?.length ? match.broadcasts : undefined,
      time: match.time || undefined,
      venue: match.venue || undefined,
    });
  }
  log(`Daily matches: ${Object.keys(dailyMatches).length} dates, ${Object.values(dailyMatches).reduce((s, a) => s + a.length, 0)} matches`);

  await attachMatchupOdds(dailyMatches, existing);

  // Assemble output
  const today = todayStr();
  const now   = new Date().toISOString();

  // Determine overall tournament stage from team data
  const tournamentStage = teams.some(t => t.currentStage === 'final')
    ? 'final'
    : teams.some(t => ['qf', 'sf', 'final'].includes(t.currentStage))
      ? teams.find(t => ['qf', 'sf', 'final'].includes(t.currentStage))?.currentStage ?? 'group_stage'
      : teams.some(t => t.currentStage === 'r16') ? 'r16'
        : teams.some(t => t.currentStage === 'r32') ? 'r32'
          : 'group_stage';

  const stageStatuses = {};
  for (const s of STAGE_ORDER) {
    const idx = STAGE_ORDER.indexOf(s);
    const tIdx = STAGE_ORDER.indexOf(tournamentStage);
    stageStatuses[s] = idx < tIdx ? 'done' : idx === tIdx ? 'active' : 'upcoming';
  }

  const output = {
    lastUpdated:  now,
    snapshotDate: today,
    isHistorical: false,
    sourceSummary: (() => {
      const s = { dataSource: 'ESPN', market: 0, calculated: 0 };
      for (const t of teams) {
        if (t.advanceProbabilities?.source === 'market') s.market++;
        else s.calculated++;
      }
      return s;
    })(),
    tournament: {
      name:         'FIFA World Cup 2026',
      currentStage: tournamentStage,
      stages: {
        group_stage: { status: stageStatuses.group_stage ?? 'active',   label:'Group Stage', date:'Jun 11–27' },
        r32:         { status: stageStatuses.r32         ?? 'upcoming', label:'Round of 32', date:'Jun 28–Jul 2' },
        r16:         { status: stageStatuses.r16         ?? 'future',   label:'Round of 16', date:'Jul 4–7' },
        qf:          { status: stageStatuses.qf          ?? 'future',   label:'Quarterfinal',date:'Jul 9–11' },
        sf:          { status: stageStatuses.sf          ?? 'future',   label:'Semifinal',   date:'Jul 14–15' },
        final:       { status: stageStatuses.final       ?? 'future',   label:'The Final',   date:'Jul 19' },
      },
    },
    groups: groupsData,
    teams,
    dailyMatches,
  };

  // Write live file
  fs.writeFileSync(LIVE_PATH, JSON.stringify(output, null, 2));
  log(`✅ Live data → ${LIVE_PATH}`);

  // ── Immutable end-of-Pacific-day snapshots ────────────────────────────────
  // Snapshot files are written once per past PT date (yesterday or earlier)
  // and never overwritten. This guarantees the historical view reflects the
  // actual end-of-day state, not an arbitrary mid-day GHA capture.
  const todayPT = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Los_Angeles' });
  const yesterdayPT = (() => {
    const d = new Date(todayPT + 'T12:00:00Z');
    d.setUTCDate(d.getUTCDate() - 1);
    return d.toISOString().slice(0, 10);
  })();

  const snapPath = path.join(SNAP_DIR, `${yesterdayPT}.json`);
  let snapshotWritten = false;
  if (!fs.existsSync(snapPath)) {
    fs.writeFileSync(snapPath, JSON.stringify({ ...output, snapshotDate: yesterdayPT, isHistorical: true }));
    log(`✅ Snapshot → ${snapPath} (first write, immutable)`);
    snapshotWritten = true;
  } else {
    log(`Snapshot for ${yesterdayPT} already exists, skipping (immutable end-of-day artifact)`);
  }

  // Update manifest only if we just added a new snapshot OR labels are stale
  if (snapshotWritten || !fs.existsSync(MF_PATH)) {
    const mf = fs.existsSync(MF_PATH)
      ? JSON.parse(fs.readFileSync(MF_PATH, 'utf8'))
      : { available: [], labels: {} };

    if (!mf.available.includes(yesterdayPT)) {
      mf.available.push(yesterdayPT);
      mf.available.sort();
    }

    // Build human-readable labels
    mf.available.forEach((d, i) => {
      const isLatest = i === mf.available.length - 1;
      const isEarliest = i === 0;
      mf.labels[d] = isLatest
        ? `${fmtLabel(d)} (Latest)`
        : isEarliest
          ? `${fmtLabel(d)} (Pre-tournament)`
          : fmtLabel(d);
    });

    mf.earliest  = mf.available[0];
    mf.latest    = mf.available[mf.available.length - 1];
    mf.generated = now;

    fs.writeFileSync(MF_PATH, JSON.stringify(mf, null, 2));
    log(`✅ Manifest → ${mf.available.length} snapshots`);
  }
  log('=== Done ===');
}

if (require.main === module) {
  main().catch(err => { console.error('Fatal:', err); process.exit(1); });
}

module.exports = { calcProbs, calcProbsFallback, diffRating, diffLabel, diffColor, buildOpponents, buildR16Opponents, R32_MATCH_TO_POSITIONS };
