#!/usr/bin/env node
/**
 * backfill-snapshot-prices.js — Historical Polymarket price backfill via CLOB API
 * ────────────────────────────────────────────────────────────────────────────────
 * Fetches all 18 Polymarket events, extracts team→token mappings, then pulls
 * historical daily prices for every token. Replaces advanceProbabilities and
 * group winProbabilities in snapshots/YYYY-MM-DD.json with the market prices
 * that were live on that date.
 *
 * Usage:
 *   node scripts/backfill-snapshot-prices.js
 *
 * The CLOB API is live and confirmed working. No API key required.
 */

'use strict';

const fs = require('fs');
const path = require('path');

// ─── Mappings from update-data.js ───────────────────────────────────────────────
const NAME_TO_ID = {
	'United States': 'usa', 'USA': 'usa',
	'Mexico': 'mexico', 'Canada': 'canada',
	'Brazil': 'brazil', 'Argentina': 'argentina', 'Colombia': 'colombia',
	'Ecuador': 'ecuador', 'Uruguay': 'uruguay', 'Paraguay': 'paraguay',
	'Spain': 'spain', 'France': 'france', 'Germany': 'germany',
	'England': 'england', 'Netherlands': 'netherlands', 'Portugal': 'portugal',
	'Belgium': 'belgium', 'Switzerland': 'switzerland', 'Croatia': 'croatia',
	'Austria': 'austria', 'Sweden': 'sweden', 'Norway': 'norway',
	'Scotland': 'scotland', 'Czech Republic': 'czechia', 'Czechia': 'czechia',
	'Bosnia and Herzegovina': 'bosnia', 'Turkey': 'turkey', 'Turkiye': 'turkey',
	'Morocco': 'morocco', 'Senegal': 'senegal', 'Egypt': 'egypt',
	'Ivory Coast': 'ivorycoast', "Côte d'Ivoire": 'ivorycoast',
	'Ghana': 'ghana', 'South Africa': 'southafrica',
	'Algeria': 'algeria', 'Tunisia': 'tunisia',
	'DR Congo': 'drcongo', 'Congo DR': 'drcongo',
	'Cape Verde': 'capeverde', 'Saudi Arabia': 'saudiarabia',
	'Japan': 'japan', 'South Korea': 'southkorea', 'Australia': 'australia',
	'Iran': 'iran', 'Iraq': 'iraq', 'Qatar': 'qatar', 'Jordan': 'jordan',
	'Uzbekistan': 'uzbekistan', 'New Zealand': 'newzealand',
	'Haiti': 'haiti', 'Panama': 'panama',
	'Curacao': 'curacao', 'Curaçao': 'curacao',
	'Türkiye': 'turkey',
};

const PM_NAME_TO_ID = {
	'Bosnia-Herzegovina': 'bosnia',
	'Turkiye': 'turkey',
};

function nameToId(name) {
	return NAME_TO_ID[name] || null;
}

function pmNameToId(name) {
	if (PM_NAME_TO_ID[name]) return PM_NAME_TO_ID[name];
	return nameToId(name);
}

function log(msg) {
	console.log(`[${new Date().toISOString()}] ${msg}`);
}

// ─── Configuration ──────────────────────────────────────────────────────────────
const ROOT = path.join(__dirname, '..');
const SNAP_DIR = path.join(ROOT, 'public', 'data', 'snapshots');
const LIVE_PATH = path.join(ROOT, 'public', 'data', 'world-cup-2026.json');

const SNAPSHOT_DATES = [
	'2026-06-10', '2026-06-11', '2026-06-12', '2026-06-13',
	'2026-06-14', '2026-06-15', '2026-06-16',
];

const GAMMA_BASE = 'https://gamma-api.polymarket.com/events';
const CLOB_BASE = 'https://clob.polymarket.com/prices-history';
const DELAY_MS = 100;

const STAGES = ['r32', 'r16', 'qf', 'sf', 'final', 'winner'];

const STAGE_SLUGS = {
	r32:    'world-cup-team-to-advance-to-knockout-stages',
	r16:    'world-cup-nation-to-reach-round-of-16',
	qf:     'world-cup-nation-to-reach-quarterfinals',
	sf:     'world-cup-nation-to-reach-semifinals',
	final:  'world-cup-nation-to-reach-final',
	winner: 'world-cup-winner',
};

const GROUP_LETTERS = 'ABCDEFGHIJKL'.split('');
const GROUP_SLUGS = 'abcdefghijkl'.split('').map(l => `world-cup-group-${l}-winner`);

// ─── Helpers ────────────────────────────────────────────────────────────────────
function sleep(ms) {
	return new Promise(r => setTimeout(r, ms));
}

async function fetchJSON(url) {
	const controller = new AbortController();
	const timer = setTimeout(() => controller.abort(), 15000);
	try {
		const res = await fetch(url, { signal: controller.signal });
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		return await res.json();
	} finally {
		clearTimeout(timer);
	}
}

function getTokenId(market) {
	const raw = market.clobTokenIds;
	if (raw == null) return null;
	try {
		const arr = typeof raw === 'string' ? JSON.parse(raw) : raw;
		if (!Array.isArray(arr) || !arr.length) return null;
		return arr[0];
	} catch {
		return null;
	}
}

// ─── Phase 1: Discover token IDs from gamma API ─────────────────────────────────
async function discoverTokens() {
	/** @type {Record<string, {stage: string, teamId: string}>} */
	const tokenInfo = {};
	const slugs = [];

	for (const [stage, slug] of Object.entries(STAGE_SLUGS)) {
		slugs.push({ stage, slug });
	}
	for (const slug of GROUP_SLUGS) {
		slugs.push({ stage: 'group', slug });
	}

	let processed = 0;
	const total = slugs.length;

	for (const { stage, slug } of slugs) {
		const url = `${GAMMA_BASE}?slug=${slug}&limit=1`;
		processed++;

		try {
			const data = await fetchJSON(url);
			if (!data || !data.length) {
				log(`⚠  No event found: ${slug}`);
				continue;
			}

			const markets = data[0].markets || [];
			let mapped = 0;

			for (const m of markets) {
				const name = m.groupItemTitle || '';
				const teamId = pmNameToId(name);

				if (!teamId) {
					if (name && name !== 'Other' && !name.startsWith('Team ') && name !== 'Field') {
						log(`⚠  Unmapped: "${name}" in ${slug}`);
					}
					continue;
				}

				const tokenId = getTokenId(m);
				if (!tokenId) {
					log(`⚠  No tokenId for ${teamId} in ${slug}`);
					continue;
				}

				tokenInfo[tokenId] = { stage, teamId };
				mapped++;
			}

			log(`Gamma [${processed}/${total}] ${slug} → ${mapped} tokens`);
		} catch (e) {
			log(`⚠  Failed ${slug}: ${e.message}`);
		}

		if (processed < total) await sleep(DELAY_MS);
	}

	return tokenInfo;
}

// ─── Phase 2: Fetch historical prices from CLOB API ─────────────────────────────
async function fetchAllPrices(tokenIds) {
	/** @type {Record<string, Record<string, number>>} */
	const priceData = {};
	const total = tokenIds.length;
	let fetched = 0;

	for (const tokenId of tokenIds) {
		const url = `${CLOB_BASE}?market=${tokenId}&interval=all&fidelity=1440`;

		try {
			const data = await fetchJSON(url);
			const dateMap = {};

			if (data && Array.isArray(data.history)) {
				for (const point of data.history) {
					const dateStr = new Date(point.t * 1000).toISOString().split('T')[0];
					dateMap[dateStr] = point.p;
				}
			}

			priceData[tokenId] = dateMap;
		} catch (e) {
			log(`⚠  Prices failed for ${tokenId}: ${e.message}`);
		}

		fetched++;
		if (fetched % 50 === 0 || fetched === total) {
			log(`CLOB  [${fetched}/${total}] tokens fetched`);
		}

		await sleep(DELAY_MS);
	}

	return priceData;
}

// ─── Phase 3: Update snapshots & live data ──────────────────────────────────────
function updateSnapshots(tokenInfo, priceData) {
	// Build reverse index: teamId → { stage → tokenId }
	/** @type {Record<string, Record<string, string>>} */
	const teamTokens = {};
	for (const [tokenId, { stage, teamId }] of Object.entries(tokenInfo)) {
		if (!teamTokens[teamId]) teamTokens[teamId] = {};
		teamTokens[teamId][stage] = tokenId;
	}

	log(`Team tokens built for ${Object.keys(teamTokens).length} teams`);

	let updatedCount = 0;

	for (const date of SNAPSHOT_DATES) {
		const snapPath = path.join(SNAP_DIR, `${date}.json`);

		if (!fs.existsSync(snapPath)) {
			log(`⚠  Not found: ${date}.json — skipping`);
			continue;
		}

		const snapshot = JSON.parse(fs.readFileSync(snapPath, 'utf8'));
		let marketCount = 0;
		let calculatedCount = 0;

		// ── Update team advance probabilities ──
		for (const team of snapshot.teams || []) {
			const tokens = teamTokens[team.id];

			if (tokens) {
				const probs = {};

				for (const stage of STAGES) {
					const tokenId = tokens[stage];
					if (tokenId && priceData[tokenId] && priceData[tokenId][date] !== undefined) {
						probs[stage] = Math.round(priceData[tokenId][date] * 100);
					} else {
						probs[stage] = 0;
					}
				}

				probs.source = 'market';
				team.advanceProbabilities = probs;
				marketCount++;
			} else {
				// No Polymarket data for this team — keep existing source
				if (team.advanceProbabilities?.source === 'market') {
					marketCount++;
				} else {
					calculatedCount++;
				}
			}
		}

		// ── Update group win probabilities ──
		for (const [, groupData] of Object.entries(snapshot.groups || {})) {
			const winProbs = {};

			for (const standing of groupData.standings || []) {
				const teamId = standing.teamId;
				const tokenId = teamTokens[teamId]?.group;

				if (tokenId && priceData[tokenId] && priceData[tokenId][date] !== undefined) {
					winProbs[teamId] = Math.round(priceData[tokenId][date] * 100);
				} else {
					// Fall back to existing value or 0
					winProbs[teamId] = groupData.winProbabilities?.[teamId] ?? 0;
				}
			}

			groupData.winProbabilities = winProbs;
		}

		// ── Update source summary ──
		snapshot.sourceSummary = { market: marketCount, calculated: calculatedCount };

		fs.writeFileSync(snapPath, JSON.stringify(snapshot, null, 2));
		log(`✅ ${date}.json — market: ${marketCount}, calculated: ${calculatedCount}`);
		updatedCount++;
	}

	// ── Copy June 16 snapshot to live data ──
	const june16Path = path.join(SNAP_DIR, '2026-06-16.json');
	if (fs.existsSync(june16Path)) {
		const june16 = JSON.parse(fs.readFileSync(june16Path, 'utf8'));
		const live = { ...june16, isHistorical: false, lastUpdated: new Date().toISOString() };
		fs.writeFileSync(LIVE_PATH, JSON.stringify(live, null, 2));
		log(`✅ Live data written from June 16 snapshot`);
	}

	log(`Updated ${updatedCount}/${SNAPSHOT_DATES.length} snapshots`);
}

// ─── Main ───────────────────────────────────────────────────────────────────────
async function main() {
	log('=== Backfill Historical Snapshot Prices ===');

	log('Phase 1: Discovering token IDs from Polymarket gamma API...');
	const tokenInfo = await discoverTokens();
	const tokenCount = Object.keys(tokenInfo).length;
	const teamsInData = [...new Set(Object.values(tokenInfo).map(v => v.teamId))];
	log(`Discovered ${tokenCount} tokens for ${teamsInData.length} teams`);

	log(`Phase 2: Fetching historical prices (${tokenCount} CLOB API calls)...`);
	const priceData = await fetchAllPrices(Object.keys(tokenInfo));
	const withData = Object.values(priceData).filter(d => Object.keys(d).length > 0).length;
	log(`Got price history for ${withData}/${tokenCount} tokens`);

	log('Phase 3: Updating snapshots & live data...');
	updateSnapshots(tokenInfo, priceData);

	log('=== Done ===');
}

main().catch(err => {
	console.error('Fatal:', err);
	process.exit(1);
});
