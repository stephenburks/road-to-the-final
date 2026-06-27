import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const {
	computeStandings,
	buildGroupStandings,
	buildGroupResults,
	injectScorers,
	injectCards,
} = require('./standings.js')

// ── computeStandings ──────────────────────────────────────────────────────

describe('computeStandings', () => {
	it('returns 12 groups (A–L), each with 4 entries, even with no matches', () => {
		const result = computeStandings(new Map())
		const letters = Object.keys(result).sort()
		expect(letters).toEqual('ABCDEFGHIJKL'.split(''))
		for (const g of letters) {
			expect(result[g]).toHaveLength(4)
			for (const row of result[g]) {
				expect(row).toMatchObject({ played: 0, pts: 0, gd: 0 })
			}
		}
	})

	it('awards 3 pts for a win, 0 for loss, accumulates gd', () => {
		const matches = new Map([
			['usa:paraguay', { homeId: 'usa', awayId: 'paraguay', date: '2026-06-12', homeScore: 2, awayScore: 0, status: 'FINISHED' }],
		])
		const D = computeStandings(matches).D
		const usa = D.find(r => r.teamId === 'usa')
		const par = D.find(r => r.teamId === 'paraguay')
		expect(usa).toMatchObject({ pts: 3, w: 1, l: 0, d: 0, gf: 2, ga: 0, gd: 2 })
		expect(par).toMatchObject({ pts: 0, w: 0, l: 1, d: 0, gf: 0, ga: 2, gd: -2 })
	})

	it('handles a draw correctly', () => {
		const matches = new Map([
			['usa:paraguay', { homeId: 'usa', awayId: 'paraguay', date: '2026-06-12', homeScore: 1, awayScore: 1, status: 'FINISHED' }],
		])
		const D = computeStandings(matches).D
		const usa = D.find(r => r.teamId === 'usa')
		expect(usa).toMatchObject({ pts: 1, d: 1 })
	})

	it('ignores unfinished matches', () => {
		const matches = new Map([
			['usa:paraguay', { homeId: 'usa', awayId: 'paraguay', date: '2026-06-12', homeScore: 5, awayScore: 0, status: 'IN_PROGRESS' }],
		])
		const D = computeStandings(matches).D
		const usa = D.find(r => r.teamId === 'usa')
		expect(usa).toMatchObject({ played: 0, pts: 0 })
	})

	it('sorts by pts → gd → gf and assigns pos 1..4', () => {
		const matches = new Map([
			['usa:paraguay',  { homeId: 'usa',  awayId: 'paraguay',  date: '2026-06-12', homeScore: 3, awayScore: 0, status: 'FINISHED' }],
			['turkey:usa',    { homeId: 'turkey', awayId: 'usa',    date: '2026-06-25', homeScore: 0, awayScore: 1, status: 'FINISHED' }],
		])
		const D = computeStandings(matches).D
		expect(D[0].teamId).toBe('usa')
		expect(D[0].pos).toBe(1)
		expect(D[0].pts).toBe(6)
	})
})

// ── buildGroupStandings ────────────────────────────────────────────────────

describe('buildGroupStandings', () => {
	it('enriches rows with canonical name + flag from the registry', () => {
		const raw = { D: [{ teamId: 'usa', team: 'usa', pos: 1, pts: 3, played: 1, w: 1, d: 0, l: 0, gf: 2, ga: 0, gd: 2 }] }
		const result = buildGroupStandings('D', raw)
		expect(result[0].team).toBe('USA')
		expect(result[0].flag).toBe('🇺🇸')
	})

	it('falls back to schedule order when no raw data is present', () => {
		const result = buildGroupStandings('A', {})
		expect(result).toHaveLength(4)
		expect(result.every(r => r.played === 0)).toBe(true)
		expect(result[0]).toMatchObject({ pos: 1, played: 0 })
	})
})

// ── buildGroupResults ─────────────────────────────────────────────────────

describe('buildGroupResults', () => {
	it('returns one row per group game for the team, sorted by matchday', () => {
		const result = buildGroupResults('usa', 'D', new Map())
		expect(result).toHaveLength(3)
		expect(result.map(r => r.matchday)).toEqual([1, 2, 3])
		expect(result.every(r => r.result === null)).toBe(true)
	})

	it('records the result oriented from the chosen teamʼs POV', () => {
		// USA host Paraguay 2–0 on matchday 1.
		const matchIndex = new Map([
			['usa:paraguay', { status: 'FINISHED', homeScore: 2, awayScore: 0 }],
		])
		const result = buildGroupResults('usa', 'D', matchIndex)
		const md1 = result.find(r => r.matchday === 1)
		expect(md1).toMatchObject({ result: 'W', score: '2-0', opponent: 'Paraguay' })

		const parResult = buildGroupResults('paraguay', 'D', matchIndex)
		const parMd1 = parResult.find(r => r.matchday === 1)
		expect(parMd1).toMatchObject({ result: 'L', score: '0-2', opponent: 'USA' })
	})

	it('preserves prior scorers/cards when no new match data is present', () => {
		const existing = [
			{ matchday: 1, opponent: 'Paraguay', scorers: ['Pulisic 12'], cards: [{ player: 'X', minute: '20', type: 'yellow' }] },
		]
		const result = buildGroupResults('usa', 'D', new Map(), existing)
		const md1 = result.find(r => r.matchday === 1)
		expect(md1.scorers).toEqual(['Pulisic 12'])
		expect(md1.cards).toHaveLength(1)
	})
})

// ── injectScorers / injectCards ────────────────────────────────────────────

describe('injectScorers', () => {
	it('returns input unchanged when no scorers available', () => {
		const input = [{ matchday: 1, result: 'W', scorers: [], date: '2026-06-12' }]
		expect(injectScorers(input, [])).toEqual(input)
	})

	it('matches scorers by date to the right row', () => {
		const input = [
			{ matchday: 1, result: 'W', scorers: [], date: '2026-06-12' },
			{ matchday: 2, result: 'W', scorers: [], date: '2026-06-19' },
		]
		const scorers = [
			{ label: 'Adams 33',  date: '2026-06-12' },
			{ label: 'Pulisic 12', date: '2026-06-19' },
		]
		const result = injectScorers(input, scorers)
		expect(result[0].scorers).toEqual(['Adams 33'])
		expect(result[1].scorers).toEqual(['Pulisic 12'])
	})

	it('does not overwrite rows that already have scorers', () => {
		const input = [{ matchday: 1, result: 'W', scorers: ['Existing'], date: '2026-06-12' }]
		const scorers = [{ label: 'New', date: '2026-06-12' }]
		const result = injectScorers(input, scorers)
		expect(result[0].scorers).toEqual(['Existing'])
	})
})

describe('injectCards', () => {
	it('attaches matching-date cards to the right row', () => {
		const input = [
			{ matchday: 1, result: 'W', cards: [], date: '2026-06-12' },
			{ matchday: 2, result: 'L', cards: [], date: '2026-06-19' },
		]
		const cards = [
			{ player: 'A', minute: '20', type: 'yellow', date: '2026-06-12' },
			{ player: 'B', minute: '70', type: 'red',    date: '2026-06-19' },
		]
		const result = injectCards(input, cards)
		expect(result[0].cards).toHaveLength(1)
		expect(result[0].cards[0].player).toBe('A')
		expect(result[1].cards).toHaveLength(1)
		expect(result[1].cards[0].player).toBe('B')
	})
})
