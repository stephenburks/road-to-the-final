import { canStillFinishTop3, determineCurrentStage, findKnockoutMatch } from './elimination.js'

// Helper: build a rawStandings entry quickly.
function row(teamId, pts, gd = 0, gf = 0, played = 3, pos = 1) {
	return { teamId, team: teamId, pts, gd, gf, played, pos }
}

function standings(group, rows) {
	const sorted = [...rows].sort((a, b) => (b.pts - a.pts) || (b.gd - a.gd) || (b.gf - a.gf))
	sorted.forEach((r, i) => (r.pos = i + 1))
	return { [group]: sorted }
}

// ── canStillFinishTop3 ────────────────────────────────────────────────────

describe('canStillFinishTop3', () => {
	it('returns true when standings are empty (pre-tournament)', () => {
		expect(canStillFinishTop3('usa', 'D', {}, new Map())).toBe(true)
	})

	it('returns true for the current 1st-place team with no remaining matches', () => {
		const st = standings('D', [
			row('usa', 6, 4, 5),
			row('paraguay', 4, 1, 2),
			row('australia', 1, -2, 1),
			row('turkey', 1, -3, 1),
		])
		expect(canStillFinishTop3('usa', 'D', st, new Map())).toBe(true)
	})

	it('returns false when the team is already 4th and group is done', () => {
		const st = standings('D', [
			row('usa', 9, 6, 7),
			row('paraguay', 6, 2, 3),
			row('australia', 3, 0, 2),
			row('turkey', 0, -8, 0),
		])
		expect(canStillFinishTop3('turkey', 'D', st, new Map())).toBe(false)
	})

	it('returns true when a winning scenario still exists in remaining matches', () => {
		// After matchday 2: usa 0pt, paraguay 6pt, aus 0pt, tur 0pt.
		// USA still plays turkey, paraguay plays aus. If USA wins big and others
		// draw, USA can leap to 3rd.
		const st = standings('D', [
			row('paraguay', 6, 3, 4, 2),
			row('usa',      0, -1, 0, 2),
			row('australia',0, -1, 0, 2),
			row('turkey',   0, -1, 0, 2),
		])
		const matches = new Map([
			['turkey:usa',           { status: 'SCHEDULED', homeId: 'turkey', awayId: 'usa', homeScore: 0, awayScore: 0 }],
			['paraguay:australia',   { status: 'SCHEDULED', homeId: 'paraguay', awayId: 'australia', homeScore: 0, awayScore: 0 }],
		])
		expect(canStillFinishTop3('usa', 'D', st, matches)).toBe(true)
	})
})

// ── findKnockoutMatch ───────────────────────────────────────────────────────

describe('findKnockoutMatch', () => {
	it('returns null when no bracket entry exists for group/pos', () => {
		expect(findKnockoutMatch('usa', 'ZZ', 1, 'r32', new Map())).toBeNull()
	})

	it('returns null when no match on that date involves the team', () => {
		// D-1's R32 is on 2026-07-01 (per tournament data).
		const matches = new Map([
			['mexico:southkorea', { homeId: 'mexico', awayId: 'southkorea', date: '2026-07-01', status: 'SCHEDULED' }],
		])
		expect(findKnockoutMatch('usa', 'D', 1, 'r32', matches)).toBeNull()
	})

	it('returns the match when the team is in it on the right date', () => {
		const matches = new Map([
			['usa:newzealand', { homeId: 'usa', awayId: 'newzealand', date: '2026-07-01', status: 'SCHEDULED' }],
		])
		const m = findKnockoutMatch('usa', 'D', 1, 'r32', matches)
		expect(m?.homeId).toBe('usa')
	})
})

// ── determineCurrentStage ──────────────────────────────────────────────────

describe('determineCurrentStage', () => {
	it("returns 'group_stage' for empty standings", () => {
		expect(determineCurrentStage('usa', 'D', {}, new Map())).toBe('group_stage')
	})

	it("returns 'group_stage' when team hasn't played 3 games", () => {
		const st = standings('D', [
			row('usa', 6, 4, 4, 2, 1),
			row('paraguay', 3, 0, 2, 2, 2),
		])
		expect(determineCurrentStage('usa', 'D', st, new Map())).toBe('group_stage')
	})

	it("returns 'group_stage' when team is 3rd even with 3 played", () => {
		const st = standings('D', [
			row('usa',       6, 3, 4, 3),
			row('paraguay',  6, 2, 3, 3),
			row('australia', 1, 0, 1, 3),
			row('turkey',    1, -5, 0, 3),
		])
		// USA is 3rd here due to gd; canonical pos > 2 → group_stage.
		const teamId = st.D[2].teamId
		expect(determineCurrentStage(teamId, 'D', st, new Map())).toBe('group_stage')
	})

	it('returns r32 (not eliminated) when group finished and bracket not yet drawn', () => {
		const st = standings('D', [
			row('usa',       9, 6, 7),
			row('paraguay',  6, 2, 3),
			row('australia', 3, 0, 2),
			row('turkey',    0, -8, 0),
		])
		const result = determineCurrentStage('usa', 'D', st, new Map())
		expect(result).toEqual({ stage: 'r32', eliminated: false })
	})

	it('returns eliminated when the team lost a knockout match', () => {
		const st = standings('D', [
			row('usa',       9, 6, 7),
			row('paraguay',  6, 2, 3),
			row('australia', 3, 0, 2),
			row('turkey',    0, -8, 0),
		])
		// D-1's R32 is on 2026-07-01 — USA finished 1st so D-1 applies.
		const matches = new Map([
			['usa:newzealand', { homeId: 'usa', awayId: 'newzealand', date: '2026-07-01', status: 'FINISHED', homeScore: 0, awayScore: 2 }],
		])
		const result = determineCurrentStage('usa', 'D', st, matches)
		expect(result).toEqual({ stage: 'r32', eliminated: true, eliminatedIn: 'r32' })
	})

	// Regression: the 2026-06-28 South Africa bug. RSA (A-2) was paired with
	// Canada (B-2) instead of the predicted "Best 3rd from E/H/I/J/K", and
	// the match landed on 06-28 not the predicted 06-29. The old schedule-
	// driven findKnockoutMatch missed it entirely and reported RSA as still
	// heading into R32 unbeaten.
	it('detects R32 loss even when the match date differs from BRACKET_PATHS', () => {
		const st = standings('A', [
			row('mexico',      9, 6, 7),
			row('southafrica', 4, -1, 2),
			row('southkorea',  3, -1, 2),
			row('czechia',     1, -4, 0),
		])
		const matches = new Map([
			// Actual real-world matchup: RSA vs CAN on 06-28 (not the predicted
			// 06-29 vs "Best 3rd from E/H/I/J/K")
			['southafrica:canada', { homeId: 'southafrica', awayId: 'canada', date: '2026-06-28', status: 'FINISHED', homeScore: 0, awayScore: 1 }],
		])
		const result = determineCurrentStage('southafrica', 'A', st, matches)
		expect(result).toEqual({ stage: 'r32', eliminated: true, eliminatedIn: 'r32' })
	})

	it('advances R32 winner to r16', () => {
		const st = standings('B', [
			row('switzerland', 7, 4, 4),
			row('canada',      4, 5, 6),
			row('bosnia',      4, -1, 2),
			row('qatar',       1, -8, 0),
		])
		const matches = new Map([
			['southafrica:canada', { homeId: 'southafrica', awayId: 'canada', date: '2026-06-28', status: 'FINISHED', homeScore: 0, awayScore: 1 }],
		])
		const result = determineCurrentStage('canada', 'B', st, matches)
		expect(result).toEqual({ stage: 'r16', eliminated: false })
	})

	it('returns the current stage for a SCHEDULED knockout match', () => {
		const st = standings('D', [
			row('usa', 6, 4, 4),
			row('australia', 4, 0, 3),
			row('paraguay', 4, -2, 2),
			row('turkey', 3, -2, 4),
		])
		const matches = new Map([
			['usa:bosnia', { homeId: 'usa', awayId: 'bosnia', date: '2026-07-02', status: 'SCHEDULED', homeScore: 0, awayScore: 0 }],
		])
		expect(determineCurrentStage('usa', 'D', st, matches)).toEqual({ stage: 'r32', eliminated: false })
	})

	it('returns r16 in-progress when team won R32 and has a scheduled R16 match', () => {
		const st = standings('B', [
			row('switzerland', 7, 4, 4),
			row('canada',      4, 5, 6),
			row('bosnia',      4, -1, 2),
			row('qatar',       1, -8, 0),
		])
		const matches = new Map([
			['southafrica:canada', { homeId: 'southafrica', awayId: 'canada', date: '2026-06-28', status: 'FINISHED', homeScore: 0, awayScore: 1 }],
			['canada:france',      { homeId: 'canada',      awayId: 'france', date: '2026-07-06', status: 'SCHEDULED', homeScore: 0, awayScore: 0 }],
		])
		expect(determineCurrentStage('canada', 'B', st, matches)).toEqual({ stage: 'r16', eliminated: false })
	})

	it('keeps 3rd-place at group_stage when no R32 match was scheduled (missed wildcard 8)', () => {
		const st = standings('A', [
			row('mexico',      9, 6, 7),
			row('southafrica', 4, -1, 2),
			row('southkorea',  3, -1, 2),
			row('czechia',     1, -4, 0),
		])
		// No knockout match for southkorea — they didn't make the wildcard 8.
		expect(determineCurrentStage('southkorea', 'A', st, new Map())).toBe('group_stage')
	})

	it('advances 3rd-place wildcard to r32 when an R32 match exists', () => {
		const st = standings('D', [
			row('usa',       6, 4, 4),
			row('australia', 4, 0, 3),
			row('paraguay',  4, -2, 2),
			row('turkey',    3, -2, 4),
		])
		// Paraguay is 3rd but advances as wildcard with a scheduled R32 match.
		const matches = new Map([
			['paraguay:germany', { homeId: 'paraguay', awayId: 'germany', date: '2026-06-29', status: 'SCHEDULED', homeScore: 0, awayScore: 0 }],
		])
		expect(determineCurrentStage('paraguay', 'D', st, matches)).toEqual({ stage: 'r32', eliminated: false })
	})
})

// ── stageForKnockoutDate ────────────────────────────────────────────────────

import { stageForKnockoutDate } from './elimination.js'

describe('stageForKnockoutDate', () => {
	it('returns null for group-stage dates', () => {
		expect(stageForKnockoutDate('2026-06-15')).toBeNull()
		expect(stageForKnockoutDate('2026-06-27')).toBeNull()
	})
	it('classifies 2026-06-28 as r32 (R32 start)', () => {
		expect(stageForKnockoutDate('2026-06-28')).toBe('r32')
	})
	it('classifies the boundary dates correctly', () => {
		expect(stageForKnockoutDate('2026-07-02')).toBe('r32')
		expect(stageForKnockoutDate('2026-07-05')).toBe('r16')
		expect(stageForKnockoutDate('2026-07-09')).toBe('qf')
		expect(stageForKnockoutDate('2026-07-14')).toBe('sf')
		expect(stageForKnockoutDate('2026-07-19')).toBe('final')
	})
})
