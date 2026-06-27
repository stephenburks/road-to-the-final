import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const { buildPath, validateBracketPaths } = require('./bracket.js')

// ── buildPath ─────────────────────────────────────────────────────────────

describe('buildPath', () => {
	it('clamps standings position > 2 to position 2 for path lookup', () => {
		const standings = { D: [
			{ teamId: 'paraguay',  pos: 1 }, { teamId: 'australia', pos: 2 },
			{ teamId: 'usa',       pos: 3 }, { teamId: 'turkey',    pos: 4 },
		]}
		const path = buildPath('usa', 'D', standings)
		expect(path.r32?.match).toBe(88) // D-2 (clamped from pos 3)
		expect(path.r32?.status).toBe('upcoming')
	})

	it('returns the position-specific path for the team', () => {
		const standings = { D: [
			{ teamId: 'usa',      pos: 1 }, { teamId: 'paraguay', pos: 2 },
			{ teamId: 'australia', pos: 3 }, { teamId: 'turkey',   pos: 4 },
		]}
		const usaPath = buildPath('usa', 'D', standings)
		const parPath = buildPath('paraguay', 'D', standings)
		expect(usaPath.r32?.match).toBe(81) // D-1
		expect(parPath.r32?.match).toBe(88) // D-2
	})

	it('formats group_stage stamp using only the teamʼs own venues + matchday count', () => {
		const standings = { D: [{ teamId: 'usa', pos: 1, pts: 6, played: 2 }] }
		const path = buildPath('usa', 'D', standings)
		expect(path.group_stage.detail).toBe('6pts after MD2')
		expect(path.group_stage.status).toBe('active')
	})

	it('returns r16/qf/sf/final with status: future', () => {
		const standings = { D: [{ teamId: 'usa', pos: 1 }] }
		const path = buildPath('usa', 'D', standings)
		expect(path.r16?.status).toBe('future')
		expect(path.qf?.status).toBe('future')
		expect(path.sf?.status).toBe('future')
		expect(path.final?.status).toBe('future')
	})
})

// ── validateBracketPaths ────────────────────────────────────────────────────

describe('validateBracketPaths', () => {
	it('passes for the canonical tournament data', () => {
		expect(() => validateBracketPaths({ log: () => {} })).not.toThrow()
	})
})
