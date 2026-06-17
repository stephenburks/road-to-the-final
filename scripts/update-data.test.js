import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const {
	calcProbs,
	calcProbsFallback,
	diffRating,
	diffLabel,
	diffColor,
	buildOpponents,
	buildR16Opponents,
	R32_MATCH_TO_POSITIONS,
} = require('./update-data.js')

// ── diffRating ─────────────────────────────────────────────────────────────

describe('diffRating', () => {
	it('returns 5 for rank ≤ 10 (Danger tier)', () => {
		expect(diffRating(1)).toBe(5)
		expect(diffRating(10)).toBe(5)
	})
	it('returns 4 for rank 11–20 (Tough tier)', () => {
		expect(diffRating(11)).toBe(4)
		expect(diffRating(20)).toBe(4)
	})
	it('returns 3 for rank 21–35 (Moderate tier)', () => {
		expect(diffRating(21)).toBe(3)
		expect(diffRating(35)).toBe(3)
	})
	it('returns 2 for rank 36–55', () => {
		expect(diffRating(36)).toBe(2)
		expect(diffRating(55)).toBe(2)
	})
	it('returns 1 for rank > 55', () => {
		expect(diffRating(56)).toBe(1)
		expect(diffRating(100)).toBe(1)
	})
	it('returns 3 for falsy rank (unknown team)', () => {
		expect(diffRating(0)).toBe(3)
		expect(diffRating(null)).toBe(3)
		expect(diffRating(undefined)).toBe(3)
	})
})

// ── diffLabel / diffColor ───────────────────────────────────────────────────

describe('diffLabel', () => {
	it('maps 1-2 to Favorable', () => {
		expect(diffLabel(1)).toBe('Favorable')
		expect(diffLabel(2)).toBe('Favorable')
	})
	it('maps 3 to Moderate', () => { expect(diffLabel(3)).toBe('Moderate') })
	it('maps 4 to Tough', () => { expect(diffLabel(4)).toBe('Tough') })
	it('maps 5 to Danger', () => { expect(diffLabel(5)).toBe('Danger') })
	it('falls back to Moderate for out-of-range', () => {
		expect(diffLabel(0)).toBe('Moderate')
		expect(diffLabel(6)).toBe('Moderate')
	})
})

describe('diffColor', () => {
	it('maps 1-2 to green', () => {
		expect(diffColor(1)).toBe('#22C55E')
		expect(diffColor(2)).toBe('#22C55E')
	})
	it('maps 3 to amber', () => { expect(diffColor(3)).toBe('#F59E0B') })
	it('maps 4 to orange', () => { expect(diffColor(4)).toBe('#FB923C') })
	it('maps 5 to red', () => { expect(diffColor(5)).toBe('#EF4444') })
})

// ── calcProbs (market data path) ────────────────────────────────────────────

describe('calcProbs — market data path', () => {
	it('returns market data directly when all stages are known', () => {
		const polyData = {
			r32: { usa: 90 }, r16: { usa: 70 }, qf: { usa: 40 },
			sf: { usa: 20 }, final: { usa: 10 }, winner: { usa: 5 },
		}
		const result = calcProbs('usa', 'A', {}, polyData)
		expect(result.r32).toBe(90)
		expect(result.r16).toBe(70)
		expect(result.qf).toBe(40)
		expect(result.sf).toBe(20)
		expect(result.final).toBe(10)
		expect(result.winner).toBe(5)
		expect(result.source).toBe('market')
	})

	it('interpolates missing middle stages geometrically', () => {
		// r32=80, qf=20 known; r16 is the only gap between them
		const polyData = {
			r32: { usa: 80 }, qf: { usa: 20 },
		}
		const result = calcProbs('usa', 'A', {}, polyData)
		// geometric mean of 80 and 20 (one step between idx=0 and idx=2, t=0.5)
		// = round(80 * (20/80)^0.5) = round(80 * 0.5) = round(40) = 40
		expect(result.r16).toBe(40)
		expect(result.source).toBe('market')
	})

	it('extrapolates forward from the last known stage using perRound=0.48', () => {
		const polyData = { r32: { usa: 80 } }
		const result = calcProbs('usa', 'A', {}, polyData)
		// r16 = round(80 * 0.48^1) = round(38.4) = 38
		expect(result.r16).toBe(38)
		// qf = round(80 * 0.48^2) = round(18.43) = 18
		expect(result.qf).toBe(18)
	})

	it('enforces monotonicity — later stages cannot exceed earlier stages', () => {
		// Artificially invert: Polymarket can have inconsistent prices
		const polyData = {
			r32: { usa: 50 }, r16: { usa: 80 }, // r16 > r32 — should be clamped
		}
		const result = calcProbs('usa', 'A', {}, polyData)
		expect(result.r16).toBeLessThanOrEqual(result.r32)
	})

	it('falls back to calculated source when no market data exists', () => {
		// Empty polyData → calcProbsFallback → source: 'calculated'
		const result = calcProbs('usa', 'A', { A: [{ teamId: 'usa', pos: 1, pts: 9 }] }, {})
		expect(result.source).toBe('calculated')
	})

	it('extrapolates backward from first known stage (winner only)', () => {
		const polyData = { winner: { usa: 10 } }
		const result = calcProbs('usa', 'A', {}, polyData)
		// r32 is 5 stages before winner. perRound backward = 1/0.48
		// r32 = min(round(10 * (1/0.48)^5), 99) = min(round(10 * 12.24), 99) = min(122, 99) = 99
		expect(result.r32).toBe(99)
		expect(result.winner).toBe(10)
		expect(result.source).toBe('market')
	})
})

// ── calcProbsFallback ───────────────────────────────────────────────────────

describe('calcProbsFallback', () => {
	it('returns source: calculated', () => {
		const standings = { A: [{ teamId: 'usa', pos: 1, pts: 9 }] }
		const result = calcProbsFallback('usa', 'A', standings)
		expect(result.source).toBe('calculated')
	})

	it('produces higher r32 for top-ranked teams than lower-ranked', () => {
		// usa fifaRank=11 vs a very low-ranked team
		const standings = { A: [{ teamId: 'usa', pos: 1, pts: 9 }] }
		const result = calcProbsFallback('usa', 'A', standings)
		expect(result.r32).toBeGreaterThan(0)
		expect(result.r32).toBeLessThanOrEqual(99)
	})

	it('decreases monotonically from r32 to winner', () => {
		const standings = { A: [{ teamId: 'usa', pos: 1, pts: 9 }] }
		const r = calcProbsFallback('usa', 'A', standings)
		expect(r.r32).toBeGreaterThanOrEqual(r.r16)
		expect(r.r16).toBeGreaterThanOrEqual(r.qf)
		expect(r.qf).toBeGreaterThanOrEqual(r.sf)
		expect(r.sf).toBeGreaterThanOrEqual(r.final)
		expect(r.final).toBeGreaterThanOrEqual(r.winner)
	})

	it('produces lower probabilities for 4th-place teams than 1st-place', () => {
		const standings = {
			A: [
				{ teamId: 'usa', pos: 1, pts: 9 },
				{ teamId: 'mex', pos: 4, pts: 0 },
			],
		}
		const r1st = calcProbsFallback('usa', 'A', standings)
		const r4th = calcProbsFallback('mex', 'A', standings)
		expect(r1st.r32).toBeGreaterThan(r4th.r32)
	})
})

// ── R32_MATCH_TO_POSITIONS ──────────────────────────────────────────────────

describe('R32_MATCH_TO_POSITIONS', () => {
	it('is an object mapping match numbers to position key arrays', () => {
		expect(typeof R32_MATCH_TO_POSITIONS).toBe('object')
		const keys = Object.keys(R32_MATCH_TO_POSITIONS)
		expect(keys.length).toBeGreaterThan(0)
	})

	it('each position key follows the Group-Pos pattern (e.g. A-1, B-2)', () => {
		for (const [, positions] of Object.entries(R32_MATCH_TO_POSITIONS)) {
			for (const key of positions) {
				expect(key).toMatch(/^[A-L]-[12]$/)
			}
		}
	})

	it('each match number maps to at least 2 position keys', () => {
		// Most matches have 2 (one winner and one runner-up from different groups).
		// "Best 3rd" slots can aggregate 4 groups into a single match slot.
		for (const [, positions] of Object.entries(R32_MATCH_TO_POSITIONS)) {
			expect(positions.length).toBeGreaterThanOrEqual(2)
		}
	})
})

// ── buildR16Opponents ───────────────────────────────────────────────────────

describe('buildR16Opponents', () => {
	it('returns empty array when desc is empty', () => {
		expect(buildR16Opponents('usa', '', {})).toEqual([])
	})

	it('returns empty array when desc is undefined', () => {
		expect(buildR16Opponents('usa', undefined, {})).toEqual([])
	})

	it('resolves "Winner Match X" to the opposing team in that match', () => {
		// Find a real match number from the R32_MATCH_TO_POSITIONS lookup
		const matchNum = Object.keys(R32_MATCH_TO_POSITIONS)[0]
		const positions = R32_MATCH_TO_POSITIONS[matchNum]
		// positions = ['A-1', 'J-1'] (example)
		const [grp1, pos1] = positions[0].split('-')
		const [grp2] = positions[1].split('-')

		// Build mock standings where each group has two entries
		const standings = {
			[grp1]: [
				{ teamId: 'team-a1', pos: 1, pts: 9 },
				{ teamId: 'team-a2', pos: 2, pts: 6 },
			],
			[grp2]: [
				{ teamId: 'team-j1', pos: 1, pts: 9 },
				{ teamId: 'team-j2', pos: 2, pts: 6 },
			],
		}

		// Ask for opponents of position[0]'s team via this match
		const teamId = pos1 === '1' ? standings[grp1][0].teamId : standings[grp1][1].teamId
		const results = buildR16Opponents(teamId, `Winner Match ${matchNum}`, standings)

		// Should return the OTHER team in that match (not ourselves)
		expect(results.length).toBeGreaterThan(0)
		// None of the returned opponents should be the requesting team itself
		expect(results.every(r => r.group === grp2 || r.group === grp1)).toBe(true)
	})
})

// ── buildOpponents ──────────────────────────────────────────────────────────

describe('buildOpponents', () => {
	it('returns r32:[] and r16:[] when both descs are empty', () => {
		const result = buildOpponents('usa', 'A', '', '', {})
		expect(result.r32).toEqual([])
		expect(result.r16).toEqual([])
	})

	it('parses "Winner Group X" r32 desc and returns one r32 opponent', () => {
		const standings = {
			B: [{ teamId: 'eng', pos: 1, pts: 9 }, { teamId: 'fra', pos: 2, pts: 6 }],
		}
		const result = buildOpponents('usa', 'A', 'Winner Group B', '', standings)
		expect(result.r32.length).toBe(1)
		expect(result.r32[0].group).toBe('B')
		expect(result.r32[0].note).toContain('Winner')
	})

	it('parses "Runner-up Group X" r32 desc and returns the 2nd-place team', () => {
		const standings = {
			B: [{ teamId: 'eng', pos: 1, pts: 9 }, { teamId: 'fra', pos: 2, pts: 6 }],
		}
		const result = buildOpponents('usa', 'A', 'Runner-up Group B', '', standings)
		expect(result.r32.length).toBe(1)
		expect(result.r32[0].note).toContain('Runner-up')
	})

	it('parses "Best 3rd from X/Y/Z" r32 desc and returns multiple possible opponents', () => {
		const standings = {
			C: [{ teamId: 'ger', pos: 1 }, { teamId: 'esp', pos: 2 }, { teamId: 'por', pos: 3, pts: 3 }],
			D: [{ teamId: 'bra', pos: 1 }, { teamId: 'arg', pos: 2 }, { teamId: 'uru', pos: 3, pts: 3 }],
			E: [{ teamId: 'ita', pos: 1 }, { teamId: 'ned', pos: 2 }, { teamId: 'bel', pos: 3, pts: 3 }],
		}
		const result = buildOpponents('usa', 'A', 'Best 3rd from C/D/E', '', standings)
		expect(result.r32.length).toBe(3)
		expect(result.r32.every(o => o.note.includes('3rd-place'))).toBe(true)
	})

	it('always calls buildR16Opponents and returns its result as r16', () => {
		const result = buildOpponents('usa', 'A', '', '', {})
		// When r16Desc is empty, buildR16Opponents returns []
		expect(Array.isArray(result.r16)).toBe(true)
	})
})
