import { describe, it, expect } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useTeamSearch } from './useTeamSearch'
import type { Team } from '../types'

function mkTeam(overrides: Partial<Team>): Team {
	return {
		id: 'test',
		name: 'Test',
		flag: '🏳️',
		group: 'A',
		confederation: 'UEFA',
		fifaRank: 10,
		eliminated: false,
		currentStage: 'group_stage',
		groupResults: [],
		advanceProbabilities: {
			r32: 100, r16: 90, qf: 60, sf: 30, final: 10, winner: 5,
			source: 'calculated',
		},
		path: {
			group_stage: { status: 'active' },
			r32: null, r16: null, qf: null, sf: null, final: null,
		},
		possibleOpponents: { r32: [], r16: [] },
		...overrides,
	}
}

const CONFEDERATIONS = ['UEFA', 'CONMEBOL', 'CONCACAF'] as const

describe('useTeamSearch', () => {
	it('groups teams by confederation', () => {
		const teams: Team[] = [
			mkTeam({ id: 'ger', name: 'Germany', confederation: 'UEFA' }),
			mkTeam({ id: 'bra', name: 'Brazil', confederation: 'CONMEBOL' }),
			mkTeam({ id: 'usa', name: 'USA', confederation: 'CONCACAF' }),
		]

		const { result } = renderHook(() =>
			useTeamSearch(teams, '', [...CONFEDERATIONS])
		)

		expect(result.current.grouped['UEFA']).toHaveLength(1)
		expect(result.current.grouped['UEFA'][0].id).toBe('ger')
		expect(result.current.grouped['CONMEBOL']).toHaveLength(1)
		expect(result.current.grouped['CONCACAF']).toHaveLength(1)
	})

	it('filters by query (case-insensitive, matches name)', () => {
		const teams: Team[] = [
			mkTeam({ id: 'ger', name: 'Germany', confederation: 'UEFA' }),
			mkTeam({ id: 'bra', name: 'Brazil', confederation: 'CONMEBOL' }),
			mkTeam({ id: 'usa', name: 'USA', confederation: 'CONCACAF' }),
		]

		const { result } = renderHook(() =>
			useTeamSearch(teams, 'ger', [...CONFEDERATIONS])
		)

		expect(result.current.grouped['UEFA']).toHaveLength(1)
		expect(result.current.grouped['UEFA'][0].id).toBe('ger')
		expect(result.current.grouped['CONMEBOL']).toHaveLength(0)
		expect(result.current.grouped['CONCACAF']).toHaveLength(0)
	})

	it('filters by query matching confederation name', () => {
		const teams: Team[] = [
			mkTeam({ id: 'ger', name: 'Germany', confederation: 'UEFA' }),
			mkTeam({ id: 'bra', name: 'Brazil', confederation: 'CONMEBOL' }),
		]

		const { result } = renderHook(() =>
			useTeamSearch(teams, 'conmebol', [...CONFEDERATIONS])
		)

		expect(result.current.grouped['CONMEBOL']).toHaveLength(1)
		expect(result.current.grouped['CONMEBOL'][0].id).toBe('bra')
	})

	it('sorts by winner probability descending within each group', () => {
		const teams: Team[] = [
			mkTeam({ id: 'a', name: 'Team A', confederation: 'UEFA', advanceProbabilities: { r32: 100, r16: 90, qf: 60, sf: 30, final: 10, winner: 5, source: 'calculated' } }),
			mkTeam({ id: 'b', name: 'Team B', confederation: 'UEFA', advanceProbabilities: { r32: 100, r16: 80, qf: 50, sf: 20, final: 5, winner: 15, source: 'calculated' } }),
			mkTeam({ id: 'c', name: 'Team C', confederation: 'UEFA', advanceProbabilities: { r32: 100, r16: 70, qf: 40, sf: 10, final: 2, winner: 1, source: 'calculated' } }),
		]

		const { result } = renderHook(() =>
			useTeamSearch(teams, '', [...CONFEDERATIONS])
		)

		const uefa = result.current.grouped['UEFA']
		expect(uefa).toHaveLength(3)
		expect(uefa[0].id).toBe('b') // winner prob 15
		expect(uefa[1].id).toBe('a') // winner prob 5
		expect(uefa[2].id).toBe('c') // winner prob 1
	})

	it('puts eliminated teams in Eliminated group', () => {
		const teams: Team[] = [
			mkTeam({ id: 'ger', name: 'Germany', confederation: 'UEFA' }),
			mkTeam({ id: 'out', name: 'Out Team', confederation: 'UEFA', eliminated: true }),
		]

		const { result } = renderHook(() =>
			useTeamSearch(teams, '', [...CONFEDERATIONS])
		)

		expect(result.current.grouped['Eliminated']).toHaveLength(1)
		expect(result.current.grouped['Eliminated'][0].id).toBe('out')
		expect(result.current.grouped['UEFA']).toHaveLength(1)
		expect(result.current.grouped['UEFA'][0].id).toBe('ger')
	})

	it('flatItems preserves confederation order', () => {
		const teams: Team[] = [
			mkTeam({ id: 'ger', name: 'Germany', confederation: 'UEFA' }),
			mkTeam({ id: 'bra', name: 'Brazil', confederation: 'CONMEBOL' }),
			mkTeam({ id: 'usa', name: 'USA', confederation: 'CONCACAF' }),
			mkTeam({ id: 'out', name: 'Out Team', confederation: 'UEFA', eliminated: true }),
		]

		const { result } = renderHook(() =>
			useTeamSearch(teams, '', [...CONFEDERATIONS])
		)

		const ids = result.current.flatItems.map(t => t.id)
		expect(ids[0]).toBe('ger')   // UEFA
		expect(ids[1]).toBe('bra')   // CONMEBOL
		expect(ids[2]).toBe('usa')   // CONCACAF
		expect(ids[3]).toBe('out')   // Eliminated
	})
})
