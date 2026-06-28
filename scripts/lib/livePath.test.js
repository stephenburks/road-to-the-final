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
})
