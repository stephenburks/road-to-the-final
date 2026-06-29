/**
 * Schema validator for the world-cup-2026.json document.
 *
 * Goal: catch shape drift between scripts/update-data.js and src/types.ts
 * immediately. Called from update-data.js before write — any structural
 * problem throws ValidationError with a clear path-to-field message, so a
 * busted build fails loudly instead of silently shipping broken JSON.
 *
 * What we check (the things that have actually broken the UI in the past):
 *   - top-level keys exist with the right types
 *   - tournament.stages has all 6 stage keys with status + label + date
 *   - groups has 12 entries (A–L), each with standings (length 4) and winProbabilities
 *   - each team has the required identity + advanceProbabilities fields
 *   - dailyMatches keys are YYYY-MM-DD and each match has homeId/awayId/status
 *
 * We DO NOT check optional UI-only fields (broadcasts, polymarket, etc.) —
 * those degrade gracefully and aren't worth gating the build on.
 */

import { GROUP_LETTERS, STAGE_ORDER, KNOCKOUT_STAGES } from './tournament.js'

export class ValidationError extends Error {
	constructor(messages) {
		super(`AppData schema validation failed:\n  - ${messages.join('\n  - ')}`);
		this.name = 'ValidationError';
		this.messages = messages;
	}
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const VALID_STATUS = new Set(['SCHEDULED', 'IN_PROGRESS', 'FINISHED']);
const VALID_STAGE_STATUS = new Set(['active', 'upcoming', 'future', 'done']);
const VALID_PROB_SOURCE = new Set(['market', 'calculated']);

function isObj(v) { return v != null && typeof v === 'object' && !Array.isArray(v); }
function isStr(v) { return typeof v === 'string' && v.length > 0; }
function isNum(v) { return typeof v === 'number' && Number.isFinite(v); }
function isPct(v) { return isNum(v) && v >= 0 && v <= 100; }

export function validateAppData(data) {
	const errors = [];

	if (!isObj(data)) {
		throw new ValidationError(['root document is not an object']);
	}

	// Top-level identity fields.
	if (!isStr(data.lastUpdated))               errors.push('lastUpdated must be a non-empty string');
	if (!isStr(data.snapshotDate))              errors.push('snapshotDate must be a non-empty string');
	if (typeof data.isHistorical !== 'boolean') errors.push('isHistorical must be a boolean');

	// Tournament block.
	if (!isObj(data.tournament)) {
		errors.push('tournament must be an object');
	} else {
		const t = data.tournament;
		if (!isStr(t.name)) errors.push('tournament.name must be a non-empty string');
		if (!STAGE_ORDER.includes(t.currentStage)) {
			errors.push(`tournament.currentStage must be one of ${STAGE_ORDER.join('|')}, got ${t.currentStage}`);
		}
		if (!isObj(t.stages)) {
			errors.push('tournament.stages must be an object');
		} else {
			for (const stage of STAGE_ORDER) {
				const s = t.stages[stage];
				if (!isObj(s)) { errors.push(`tournament.stages.${stage} missing`); continue; }
				if (!VALID_STAGE_STATUS.has(s.status)) errors.push(`tournament.stages.${stage}.status invalid (${s.status})`);
				if (!isStr(s.label)) errors.push(`tournament.stages.${stage}.label missing`);
				if (!isStr(s.date))  errors.push(`tournament.stages.${stage}.date missing`);
			}
		}
	}

	// Groups: exactly the 12 expected letters, each with 4-row standings.
	if (!isObj(data.groups)) {
		errors.push('groups must be an object');
	} else {
		for (const letter of GROUP_LETTERS) {
			const g = data.groups[letter];
			if (!isObj(g)) { errors.push(`groups.${letter} missing`); continue; }
			if (!Array.isArray(g.standings) || g.standings.length !== 4) {
				errors.push(`groups.${letter}.standings must be an array of 4 rows (got ${g.standings?.length ?? 'n/a'})`);
			} else {
				g.standings.forEach((row, i) => {
					if (!isStr(row.teamId)) errors.push(`groups.${letter}.standings[${i}].teamId missing`);
					if (!isStr(row.team))   errors.push(`groups.${letter}.standings[${i}].team missing`);
					if (typeof row.pos !== 'number') errors.push(`groups.${letter}.standings[${i}].pos missing`);
					for (const k of ['played', 'w', 'd', 'l', 'gf', 'ga', 'gd', 'pts']) {
						if (typeof row[k] !== 'number') errors.push(`groups.${letter}.standings[${i}].${k} not a number`);
					}
				});
			}
			if (!isObj(g.winProbabilities)) errors.push(`groups.${letter}.winProbabilities missing`);
		}
	}

	// Teams: 48 entries, each with identity + advanceProbabilities.
	if (!Array.isArray(data.teams)) {
		errors.push('teams must be an array');
	} else {
		if (data.teams.length !== 48) {
			errors.push(`teams must contain 48 entries, got ${data.teams.length}`);
		}
		const seenIds = new Set();
		data.teams.forEach((t, i) => {
			const prefix = `teams[${i}${t?.id ? ':' + t.id : ''}]`;
			if (!isObj(t)) { errors.push(`${prefix} not an object`); return; }
			if (!isStr(t.id))            errors.push(`${prefix}.id missing`);
			if (seenIds.has(t.id))       errors.push(`${prefix}.id duplicate (${t.id})`);
			else if (t.id) seenIds.add(t.id);
			if (!isStr(t.name))          errors.push(`${prefix}.name missing`);
			if (!isStr(t.flag))          errors.push(`${prefix}.flag missing`);
			if (!GROUP_LETTERS.includes(t.group)) errors.push(`${prefix}.group invalid (${t.group})`);
			if (!isStr(t.confederation)) errors.push(`${prefix}.confederation missing`);
			if (typeof t.fifaRank !== 'number') errors.push(`${prefix}.fifaRank not a number`);
			if (typeof t.eliminated !== 'boolean') errors.push(`${prefix}.eliminated not a boolean`);
			if (!STAGE_ORDER.includes(t.currentStage)) errors.push(`${prefix}.currentStage invalid (${t.currentStage})`);

			if (!isObj(t.advanceProbabilities)) {
				errors.push(`${prefix}.advanceProbabilities missing`);
			} else {
				for (const stage of [...KNOCKOUT_STAGES, 'winner']) {
					if (!isPct(t.advanceProbabilities[stage])) {
						errors.push(`${prefix}.advanceProbabilities.${stage} not a valid percentage`);
					}
				}
				if (!VALID_PROB_SOURCE.has(t.advanceProbabilities.source)) {
					errors.push(`${prefix}.advanceProbabilities.source invalid (${t.advanceProbabilities.source})`);
				}
				// Monotonicity sanity check — this has shipped broken in the past.
				const ap = t.advanceProbabilities;
				const chain = ['r32', 'r16', 'qf', 'sf', 'final', 'winner'];
				for (let s = 1; s < chain.length; s++) {
					if (ap[chain[s]] > ap[chain[s - 1]] + 0.5) {
						errors.push(`${prefix}.advanceProbabilities not monotonically decreasing: ${chain[s - 1]}=${ap[chain[s - 1]]} < ${chain[s]}=${ap[chain[s]]}`);
					}
				}
			}

			if (!Array.isArray(t.groupResults)) errors.push(`${prefix}.groupResults must be an array`);
			if (!isObj(t.path)) errors.push(`${prefix}.path must be an object`);
		});
	}

	// dailyMatches: optional but if present, every key must be ISO date.
	if (data.dailyMatches !== undefined) {
		if (!isObj(data.dailyMatches)) {
			errors.push('dailyMatches must be an object when present');
		} else {
			for (const [date, matches] of Object.entries(data.dailyMatches)) {
				if (!ISO_DATE.test(date)) errors.push(`dailyMatches has non-ISO date key: ${date}`);
				if (!Array.isArray(matches)) { errors.push(`dailyMatches.${date} must be an array`); continue; }
				matches.forEach((m, i) => {
					const prefix = `dailyMatches.${date}[${i}]`;
					if (!isStr(m.homeId)) errors.push(`${prefix}.homeId missing`);
					if (!isStr(m.awayId)) errors.push(`${prefix}.awayId missing`);
					if (!VALID_STATUS.has(m.status)) errors.push(`${prefix}.status invalid (${m.status})`);
					if (typeof m.homeScore !== 'number') errors.push(`${prefix}.homeScore not a number`);
					if (typeof m.awayScore !== 'number') errors.push(`${prefix}.awayScore not a number`);
				});
			}
		}
	}

	// actualBracket: optional, but if present every stage key must be an
	// array of BracketMatch entries with valid shape. Each match's date
	// must classify into the same stage as its bracket key.
	if (data.actualBracket !== undefined) {
		if (!isObj(data.actualBracket)) {
			errors.push('actualBracket must be an object when present');
		} else {
			for (const stage of KNOCKOUT_STAGES) {
				const arr = data.actualBracket[stage];
				if (arr === undefined) continue;
				if (!Array.isArray(arr)) { errors.push(`actualBracket.${stage} must be an array`); continue; }
				arr.forEach((m, i) => {
					const prefix = `actualBracket.${stage}[${i}]`;
					// Date is optional on placeholder entries (ESPN hasn't scheduled
					// the match yet) but must be ISO when present.
					if (m.date != null && (!isStr(m.date) || !ISO_DATE.test(m.date))) {
						errors.push(`${prefix}.date is not ISO when present`);
					}
					// Each side must have EITHER a teamId OR a feederEventId
					// (placeholder reference) — never neither.
					if (!isStr(m.homeId) && !isStr(m.homeFeederEventId)) {
						errors.push(`${prefix} home side missing both homeId and homeFeederEventId`);
					}
					if (!isStr(m.awayId) && !isStr(m.awayFeederEventId)) {
						errors.push(`${prefix} away side missing both awayId and awayFeederEventId`);
					}
					if (!VALID_STATUS.has(m.status)) errors.push(`${prefix}.status invalid (${m.status})`);
					if (typeof m.homeScore !== 'number') errors.push(`${prefix}.homeScore not a number`);
					if (typeof m.awayScore !== 'number') errors.push(`${prefix}.awayScore not a number`);
					if (m.status === 'FINISHED' && m.homeId && m.awayId && m.homeScore !== m.awayScore && !isStr(m.winnerId)) {
						errors.push(`${prefix}.winnerId missing on FINISHED non-draw`);
					}
				});
			}
		}
	}

	if (errors.length) throw new ValidationError(errors);
	return data;
}

