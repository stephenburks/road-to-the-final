import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { canStillFinishTop3, determineCurrentStage, findKnockoutMatch } = require('./elimination.js')

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
})
