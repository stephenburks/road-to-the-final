import { buildBracketModel } from './bracketModel.js'

function match(homeId, awayId, date, status, homeScore = 0, awayScore = 0) {
	const m = { homeId, awayId, date, status, homeScore, awayScore, venue: 'Test Stadium' }
	if (status === 'FINISHED' && homeScore !== awayScore) m.winnerId = homeScore > awayScore ? homeId : awayId
	return m
}

describe('buildBracketModel', () => {
	it('returns 5 stages with correct slot counts', () => {
		const model = buildBracketModel({ r32: [], r16: [], qf: [], sf: [], final: [] })
		expect(model.stages.map(s => s.key)).toEqual(['r32', 'r16', 'qf', 'sf', 'final'])
		expect(model.stages.map(s => s.slots.length)).toEqual([16, 8, 4, 2, 1])
	})

	it('returns all tbd slots when no bracket data exists', () => {
		const model = buildBracketModel({ r32: [], r16: [], qf: [], sf: [], final: [] })
		expect(model.stages.every(s => s.slots.every(slot => slot.source === 'tbd'))).toBe(true)
	})

	it('renders actual R32 matches when stage is fully populated', () => {
		const r32 = Array.from({ length: 16 }, (_, i) =>
			match(`home${i}`, `away${i}`, `2026-06-${28 + Math.floor(i / 4)}`, 'SCHEDULED')
		)
		const model = buildBracketModel({ r32, r16: [], qf: [], sf: [], final: [] })
		expect(model.stages[0].slots).toHaveLength(16)
		expect(model.stages[0].slots[0].source).toBe('actual')
		expect(model.stages[0].slots[0].home).toEqual({ teamId: 'home0' })
	})

	it('predicts R16 slots from consecutive R32 pairing', () => {
		const r32 = Array.from({ length: 16 }, (_, i) =>
			match(`h${i}`, `a${i}`, `2026-06-${28 + Math.floor(i / 4)}`, 'SCHEDULED')
		)
		const model = buildBracketModel({ r32, r16: [], qf: [], sf: [], final: [] })
		const r16 = model.stages[1]
		expect(r16.slots).toHaveLength(8)
		// Slot 0 pairs feeders 0 and 1 — both teams from each.
		const slot0 = r16.slots[0]
		expect(slot0.source).toBe('predicted')
		expect(slot0.home).toEqual({ candidates: ['h0', 'a0'] })
		expect(slot0.away).toEqual({ candidates: ['h1', 'a1'] })
	})

	it('collapses a feeder side to a single team when the previous match is FINISHED', () => {
		const r32 = [
			match('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1),
			match('brazil', 'japan', '2026-06-29', 'SCHEDULED'),
			...Array.from({ length: 14 }, (_, i) => match(`h${i}`, `a${i}`, '2026-06-30', 'SCHEDULED')),
		]
		const model = buildBracketModel({ r32, r16: [], qf: [], sf: [], final: [] })
		const slot0 = model.stages[1].slots[0]
		expect(slot0.home).toEqual({ teamId: 'canada' })
		expect(slot0.away).toEqual({ candidates: ['brazil', 'japan'] })
	})

	it('collapses to TBD when predicted candidates exceed the threshold', () => {
		// QF predicted from R16 predicted from R32 = many candidates per side.
		const r32 = Array.from({ length: 16 }, (_, i) =>
			match(`h${i}`, `a${i}`, `2026-06-${28 + Math.floor(i / 4)}`, 'SCHEDULED')
		)
		const model = buildBracketModel({ r32, r16: [], qf: [], sf: [], final: [] })
		const qf = model.stages[2]
		const sf = model.stages[3]
		// QF should have 4 candidates per side (just at threshold)
		expect(qf.slots[0].home).toEqual({ candidates: ['h0', 'a0', 'h1', 'a1'] })
		// SF should exceed threshold → TBD
		expect(sf.slots[0].home).toEqual({ tbd: true })
		expect(sf.slots[0].away).toEqual({ tbd: true })
	})

	it('uses actual data for higher rounds when populated, even if lower rounds also have actual data', () => {
		const r32 = Array.from({ length: 16 }, (_, i) =>
			match(`h${i}`, `a${i}`, `2026-06-${28 + Math.floor(i / 4)}`, 'FINISHED', 1, 0)
		)
		const r16 = Array.from({ length: 8 }, (_, i) =>
			match(`h${i * 2}`, `h${i * 2 + 1}`, `2026-07-${5 + Math.floor(i / 2)}`, 'SCHEDULED')
		)
		const model = buildBracketModel({ r32, r16, qf: [], sf: [], final: [] })
		expect(model.stages[1].slots[0].source).toBe('actual')
		expect(model.stages[1].slots[0].home).toEqual({ teamId: 'h0' })
	})
})
