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

	it('resolves winnerId from the penalty shootout on a knockout draw', () => {
		const daily = {
			'2026-06-29': [{ ...match('germany', 'paraguay', '2026-06-29', 'FINISHED', 1, 1), homeShootout: 3, awayShootout: 4 }],
		}
		const out = buildActualBracket(daily)
		expect(out.r32[0]).toMatchObject({ winnerId: 'paraguay', homeShootout: 3, awayShootout: 4 })
	})

	it('resolves a shootout winner via the scoreboard-only path', () => {
		const scoreboard = [{
			eventId: '760489', stage: 'r32', date: '2026-06-29', venue: 'Gillette',
			status: 'FINISHED', homeScore: 1, awayScore: 1, homeShootout: 3, awayShootout: 4,
			home: { teamId: 'germany' }, away: { teamId: 'paraguay' },
		}]
		const out = buildActualBracket({}, scoreboard)
		expect(out.r32[0]).toMatchObject({ winnerId: 'paraguay', homeShootout: 3, awayShootout: 4 })
	})
})

describe('buildActualBracket — carry-forward when bracket structure is unavailable', () => {
	// A minimal known-good bracket: one resolved R16 match feeding a placeholder QF.
	const existing = {
		r32: [],
		r16: [
			{ eventId: '700', bracketLocation: 1, date: '2026-07-04', venue: 'A',
			  status: 'FINISHED', homeId: 'usa', awayId: 'germany', homeScore: 2, awayScore: 1, winnerId: 'usa' },
		],
		qf: [
			{ eventId: null, bracketLocation: 1, date: null, venue: null,
			  status: 'SCHEDULED', homeFeederEventId: '700', awayFeederEventId: '701', homeScore: 0, awayScore: 0 },
		],
		sf: [],
		final: [],
	}

	it('carries the existing bracket forward instead of degrading to placeholders', () => {
		const out = buildActualBracket({}, [], null, existing)
		expect(out.r16[0]).toMatchObject({ homeId: 'usa', awayId: 'germany', winnerId: 'usa' })
		// The QF feeder graph survives rather than collapsing to a bare slot.
		expect(out.qf[0].homeFeederEventId).toBe('700')
		expect(out.qf[0].awayFeederEventId).toBe('701')
	})

	it('refreshes scores/status from the current scoreboard while carrying forward', () => {
		const scoreboard = [
			{ eventId: '700', stage: 'r16', date: '2026-07-04', venue: 'A',
			  status: 'FINISHED', homeScore: 3, awayScore: 1,
			  home: { teamId: 'usa' }, away: { teamId: 'germany' } },
		]
		const out = buildActualBracket({}, scoreboard, null, existing)
		expect(out.r16[0]).toMatchObject({ homeScore: 3, awayScore: 1, winnerId: 'usa' })
	})

	it('resolves a placeholder side that has since become a concrete team', () => {
		const scoreboard = [
			{ eventId: '702', stage: 'qf', date: '2026-07-09', venue: 'B',
			  status: 'SCHEDULED', homeScore: 0, awayScore: 0,
			  home: { teamId: 'usa' }, away: { tbd: true } },
		]
		const withEvent = {
			...existing,
			qf: [{ ...existing.qf[0], eventId: '702' }],
		}
		const out = buildActualBracket({}, scoreboard, null, withEvent)
		expect(out.qf[0].homeId).toBe('usa')
		expect(out.qf[0].homeFeederEventId).toBeUndefined()
		// Away side stays a feeder reference until it too resolves.
		expect(out.qf[0].awayFeederEventId).toBe('701')
	})

	it('falls back to a fresh build when there is no existing structure to carry', () => {
		const daily = { '2026-06-28': [match('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1)] }
		const out = buildActualBracket(daily, [], null, { r32: [], r16: [], qf: [], sf: [], final: [] })
		expect(out.r32).toHaveLength(1)
		expect(out.r32[0]).toMatchObject({ homeId: 'southafrica', awayId: 'canada', winnerId: 'canada' })
	})

	it('does NOT carry forward a scoreboard-only bracket (no bracketLocation fingerprint)', () => {
		// A bracket built by buildFromScoreboardOnly has R16 entries but no
		// bracketLocation — its pairings may be wrong, so it must not be trusted
		// as last-known-good. With empty structure + a scoreboard event present,
		// the code should rebuild from the scoreboard, not carry the stale one.
		const scoreboardOnlyExisting = {
			r32: [{ eventId: '760489', homeId: 'germany', awayId: 'paraguay', status: 'FINISHED', homeScore: 1, awayScore: 1, winnerId: 'paraguay' }],
			r16: [{ eventId: '900', homeFeederEventId: '999-wrong', awayFeederEventId: '998-wrong', status: 'SCHEDULED', homeScore: 0, awayScore: 0 }],
			qf: [], sf: [], final: [],
		}
		const scoreboard = [{
			eventId: '760489', stage: 'r32', date: '2026-06-29', venue: 'X',
			status: 'FINISHED', homeScore: 1, awayScore: 1, homeShootout: 3, awayShootout: 4,
			home: { teamId: 'germany' }, away: { teamId: 'paraguay' },
		}]
		const out = buildActualBracket({}, scoreboard, null, scoreboardOnlyExisting)
		// Rebuilt from scoreboard: the wrong R16 feeder refs are gone.
		expect(out.r16.find(e => e.homeFeederEventId === '999-wrong')).toBeUndefined()
	})
})
