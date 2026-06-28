import { buildActualBracket } from './actualBracket.js'

function match(homeId, awayId, date, status, homeScore = 0, awayScore = 0) {
	return {
		homeId, awayId, date, status, homeScore, awayScore,
		homeTeam: homeId, awayTeam: awayId,
		homeFlag: '🏳️', awayFlag: '🏳️',
	}
}

describe('buildActualBracket', () => {
	it('returns empty arrays for every knockout stage when no matches', () => {
		const out = buildActualBracket({})
		expect(out.r32).toEqual([])
		expect(out.r16).toEqual([])
		expect(out.qf).toEqual([])
		expect(out.sf).toEqual([])
		expect(out.final).toEqual([])
	})

	it('skips group-stage matches', () => {
		const daily = { '2026-06-15': [match('usa', 'paraguay', '2026-06-15', 'FINISHED', 1, 0)] }
		const out = buildActualBracket(daily)
		for (const stage of ['r32', 'r16', 'qf', 'sf', 'final']) expect(out[stage]).toEqual([])
	})

	it('places R32 matches in the r32 bucket with winnerId on FINISHED', () => {
		const daily = {
			'2026-06-28': [match('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1)],
			'2026-06-29': [match('brazil', 'japan', '2026-06-29', 'SCHEDULED')],
		}
		const out = buildActualBracket(daily)
		expect(out.r32).toHaveLength(2)
		expect(out.r32[0]).toMatchObject({ homeId: 'southafrica', awayId: 'canada', winnerId: 'canada', status: 'FINISHED' })
		expect(out.r32[1]).toMatchObject({ homeId: 'brazil', status: 'SCHEDULED' })
		expect(out.r32[1].winnerId).toBeUndefined()
	})

	it('sorts within a stage by date then by homeId', () => {
		const daily = {
			'2026-06-29': [match('zzz', 'aaa', '2026-06-29', 'SCHEDULED'), match('bbb', 'ccc', '2026-06-29', 'SCHEDULED')],
			'2026-06-28': [match('mmm', 'nnn', '2026-06-28', 'SCHEDULED')],
		}
		const out = buildActualBracket(daily)
		expect(out.r32.map(m => m.homeId)).toEqual(['mmm', 'bbb', 'zzz'])
	})

	it('classifies matches into the correct stage by date', () => {
		const daily = {
			'2026-07-01': [match('usa', 'bosnia',   '2026-07-01', 'SCHEDULED')], // R32
			'2026-07-05': [match('usa', 'germany',  '2026-07-05', 'SCHEDULED')], // R16
			'2026-07-10': [match('usa', 'spain',    '2026-07-10', 'SCHEDULED')], // QF
			'2026-07-14': [match('usa', 'france',   '2026-07-14', 'SCHEDULED')], // SF
			'2026-07-19': [match('usa', 'brazil',   '2026-07-19', 'SCHEDULED')], // Final
		}
		const out = buildActualBracket(daily)
		expect(out.r32).toHaveLength(1)
		expect(out.r16).toHaveLength(1)
		expect(out.qf).toHaveLength(1)
		expect(out.sf).toHaveLength(1)
		expect(out.final).toHaveLength(1)
	})

	it('leaves winnerId undefined for draws (waiting on PK data)', () => {
		const daily = { '2026-06-28': [match('a', 'b', '2026-06-28', 'FINISHED', 1, 1)] }
		const out = buildActualBracket(daily)
		expect(out.r32[0].winnerId).toBeUndefined()
	})
})
