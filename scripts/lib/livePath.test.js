import { deriveLivePath, derivePossibleOpponents } from './livePath.js'

function staticPath() {
	return {
		group_stage: { status: 'done', city: 'Toronto', venue: 'BMO Field', date: 'Jun 12–24' },
		r32:   { status: 'upcoming', match: 82, date: '2026-07-01', city: 'Seattle',     venue: 'Lumen Field',           opponentDesc: 'Best 3rd from A/E/H/I/J' },
		r16:   { status: 'future',   match: 94, date: '2026-07-06', city: 'Seattle',     venue: 'Lumen Field',           opponentDesc: 'Winner Match 82' },
		qf:    { status: 'future',   match: 98, date: '2026-07-10', city: 'Los Angeles', venue: 'SoFi Stadium',          opponentDesc: 'Winner Match 94' },
		sf:    { status: 'future',   match: 102, date: '2026-07-15', city: 'Atlanta',    venue: 'Mercedes-Benz Stadium', opponentDesc: 'Winner QF bracket' },
		final: { status: 'future',   match: 104, date: '2026-07-19', city: 'New Jersey', venue: 'MetLife Stadium',       opponentDesc: 'Winner other SF' },
	}
}

function bracketMatch(homeId, awayId, date, status, homeScore = 0, awayScore = 0, venue = 'SoFi Stadium, Los Angeles') {
	const m = { homeId, awayId, date, status, homeScore, awayScore, venue, homeTeam: homeId, awayTeam: awayId, homeFlag: '🏳️', awayFlag: '🏳️' }
	if (status === 'FINISHED' && homeScore !== awayScore) m.winnerId = homeScore > awayScore ? homeId : awayId
	return m
}

describe('deriveLivePath', () => {
	it('passes group_stage through unchanged', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = { r32: [], r16: [], qf: [], sf: [], final: [] }
		const path = deriveLivePath(team, ab, staticPath())
		expect(path.group_stage).toEqual(staticPath().group_stage)
	})

	it('uses actualBracket data when a real R32 match exists', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = {
			r32: [bracketMatch('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1)],
			r16: [], qf: [], sf: [], final: [],
		}
		const path = deriveLivePath(team, ab, staticPath())
		expect(path.r32).toMatchObject({
			date: '2026-06-28',
			venue: 'SoFi Stadium',
			city: 'Los Angeles',
			opponentDesc: 'South Africa',
			status: 'done',
		})
	})

	it('shows TBD for reachable future stages not yet drawn', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = {
			r32: [bracketMatch('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1)],
			r16: [], qf: [], sf: [], final: [],
		}
		const path = deriveLivePath(team, ab, staticPath())
		// R16 not drawn → don't show wrong static venue
		expect(path.r16).toMatchObject({
			venue: 'TBD',
			city: 'TBD',
			opponentDesc: 'Opponent TBD',
			status: 'future',
		})
		// All further stages also TBD
		expect(path.qf?.venue).toBe('TBD')
		expect(path.sf?.venue).toBe('TBD')
		expect(path.final?.venue).toBe('TBD')
	})

	it('nulls out stages past elimination', () => {
		const team = { id: 'southafrica', currentStage: 'r32', eliminated: true }
		const ab = {
			r32: [bracketMatch('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1)],
			r16: [], qf: [], sf: [], final: [],
		}
		const path = deriveLivePath(team, ab, staticPath())
		// R32 still rendered (their elimination match)
		expect(path.r32?.opponentDesc).toBe('Canada')
		// But nothing past it
		expect(path.r16).toBeNull()
		expect(path.qf).toBeNull()
		expect(path.sf).toBeNull()
		expect(path.final).toBeNull()
	})

	it('marks SCHEDULED match as upcoming when it is the current stage', () => {
		const team = { id: 'usa', currentStage: 'r32', eliminated: false }
		const ab = {
			r32: [bracketMatch('usa', 'bosnia', '2026-07-02', 'SCHEDULED', 0, 0)],
			r16: [], qf: [], sf: [], final: [],
		}
		const path = deriveLivePath(team, ab, staticPath())
		expect(path.r32?.status).toBe('upcoming')
		expect(path.r32?.opponentDesc).toBe('Bosnia & Herz.')
	})

	it('uses real venue from actualBracket, overriding any static prediction', () => {
		const team = { id: 'mexico', currentStage: 'r32', eliminated: false }
		const ab = {
			r32: [bracketMatch('mexico', 'ecuador', '2026-07-01', 'SCHEDULED', 0, 0, 'Estadio Banorte, Mexico City')],
			r16: [], qf: [], sf: [], final: [],
		}
		const path = deriveLivePath(team, ab, staticPath())
		expect(path.r32?.venue).toBe('Estadio Banorte')
		expect(path.r32?.city).toBe('Mexico City')
	})

	it('returns staticPath only for stages with no actualBracket and no future reachability', () => {
		// Edge: team eliminated in group, no knockout matches.
		const team = { id: 'turkey', currentStage: 'group_stage', eliminated: true }
		const ab = { r32: [], r16: [], qf: [], sf: [], final: [] }
		const path = deriveLivePath(team, ab, staticPath())
		// stageIdx for r32(=1) is > teamStageIdx for group_stage(=0), and eliminated → null
		expect(path.r32).toBeNull()
		expect(path.r16).toBeNull()
	})
})

describe('derivePossibleOpponents', () => {
	it('returns the confirmed opponent for a known R32 match', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = {
			r32: [bracketMatch('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1)],
			r16: [], qf: [], sf: [], final: [],
		}
		const opps = derivePossibleOpponents(team, ab)
		expect(opps.r32).toHaveLength(1)
		expect(opps.r32[0].likelyTeam).toBe('South Africa')
		expect(opps.r32[0].pct).toBe(100)
	})

	it('returns empty arrays for stages with no scheduled match', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = { r32: [], r16: [], qf: [], sf: [], final: [] }
		expect(derivePossibleOpponents(team, ab)).toEqual({ r32: [], r16: [] })
	})

	it('returns r16 opponent when R16 is drawn', () => {
		const team = { id: 'canada', currentStage: 'r16', eliminated: false }
		const ab = {
			r32: [],
			r16: [bracketMatch('canada', 'france', '2026-07-06', 'SCHEDULED')],
			qf: [], sf: [], final: [],
		}
		const opps = derivePossibleOpponents(team, ab)
		expect(opps.r16).toHaveLength(1)
		expect(opps.r16[0].likelyTeam).toBe('France')
	})

	// New API: R16 predictions require ESPN-published placeholder data in
	// actualBracket.r16. The bracketMatch helper produces R32 entries with
	// eventIds; the r16 entries reference those via feederEventIds.
	function r16Placeholder(eventId, date, homeFeederEventId, awayFeederEventId, homeId, awayId) {
		const entry = { eventId, date, status: 'SCHEDULED', homeScore: 0, awayScore: 0 }
		if (homeId) entry.homeId = homeId; else entry.homeFeederEventId = homeFeederEventId
		if (awayId) entry.awayId = awayId; else entry.awayFeederEventId = awayFeederEventId
		return entry
	}
	function bracketMatchWithId(eventId, homeId, awayId, date, status, homeScore = 0, awayScore = 0) {
		const m = bracketMatch(homeId, awayId, date, status, homeScore, awayScore)
		m.eventId = eventId
		return m
	}

	it('predicts R16 candidates from ESPN feeder map when R16 placeholders are present', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = {
			// FIFA bracket: Canada (R32 evt 486) pairs in R16 with the winner
			// of NED/MAR (R32 evt 488), per ESPN's R16 placeholder.
			r32: [
				bracketMatchWithId('486', 'southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1),
				bracketMatchWithId('488', 'netherlands', 'morocco', '2026-06-30', 'SCHEDULED'),
			],
			r16: [
				// R16 placeholder: Canada (resolved from evt 486) vs winner of evt 488.
				r16Placeholder('502', '2026-07-04', '486', '488', 'canada', null),
			],
			qf: [], sf: [], final: [],
		}
		const opps = derivePossibleOpponents(team, ab)
		expect(opps.r16).toHaveLength(2)
		expect(opps.r16.map(o => o.likelyTeam).sort()).toEqual(['Morocco', 'Netherlands'])
		expect(opps.r16.every(o => o.pct === 50)).toBe(true)
	})

	it('returns single confirmed opponent when the feeder R32 has finished', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = {
			r32: [
				bracketMatchWithId('486', 'southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1),
				bracketMatchWithId('488', 'netherlands', 'morocco', '2026-06-30', 'FINISHED', 2, 0),
			],
			r16: [
				r16Placeholder('502', '2026-07-04', '486', '488', 'canada', null),
			],
			qf: [], sf: [], final: [],
		}
		const opps = derivePossibleOpponents(team, ab)
		expect(opps.r16).toHaveLength(1)
		expect(opps.r16[0].likelyTeam).toBe('Netherlands')
		expect(opps.r16[0].pct).toBe(100)
	})

	it('returns no opponents for an eliminated team', () => {
		const team = { id: 'southafrica', currentStage: 'r32', eliminated: true }
		const ab = {
			r32: [
				bracketMatchWithId('486', 'southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1),
			],
			r16: [
				r16Placeholder('502', '2026-07-04', '486', '488', 'canada', null),
			],
			qf: [], sf: [], final: [],
		}
		const opps = derivePossibleOpponents(team, ab)
		expect(opps.r16).toEqual([])
	})

	it('returns empty r16 when no feeder data is available (no prediction without ESPN bracket)', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const ab = {
			// R32 only, no R16 placeholders → no way to predict pairings.
			r32: [
				bracketMatchWithId('486', 'southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1),
			],
			r16: [], qf: [], sf: [], final: [],
		}
		const opps = derivePossibleOpponents(team, ab)
		expect(opps.r16).toEqual([])
	})
})

describe('deriveLivePath predicted opponentDesc', () => {
	function r16Placeholder(eventId, date, homeFeederEventId, awayFeederEventId, homeId, awayId) {
		const entry = { eventId, date, status: 'SCHEDULED', homeScore: 0, awayScore: 0 }
		if (homeId) entry.homeId = homeId; else entry.homeFeederEventId = homeFeederEventId
		if (awayId) entry.awayId = awayId; else entry.awayFeederEventId = awayFeederEventId
		return entry
	}

	it('shows predicted R16 opponent description from feeder map', () => {
		const team = { id: 'canada', currentStage: 'r32', eliminated: false }
		const r32 = [
			{ ...bracketMatch('southafrica', 'canada', '2026-06-28', 'FINISHED', 0, 1), eventId: '486' },
			{ ...bracketMatch('netherlands', 'morocco', '2026-06-30', 'SCHEDULED'),     eventId: '488' },
		]
		const ab = {
			r32,
			r16: [r16Placeholder('502', '2026-07-04', '486', '488', 'canada', null)],
			qf: [], sf: [], final: [],
		}
		const path = deriveLivePath(team, ab, staticPath())
		expect(path.r16?.opponentDesc).toBe('Netherlands or Morocco')
		expect(path.r16?.venue).toBe('TBD')
		expect(path.r16?.conditional).toBe(true)
	})
})
