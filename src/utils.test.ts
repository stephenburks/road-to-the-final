import { describe, it, expect } from 'vitest'
import { daysUntil, formatDate, stageIndex, resolveActiveStage, getFeederGroup } from './utils'
import type { Team, AppData } from './types'

describe('daysUntil', () => {
	it('returns null for empty string', () => {
		expect(daysUntil('')).toBeNull()
	})

	it('returns null for non-date strings', () => {
		expect(daysUntil('hello')).toBeNull()
	})

	it('returns a number for valid date strings', () => {
		const result = daysUntil('2030-01-01')
		expect(typeof result).toBe('number')
	})

	it('returns negative numbers for past dates', () => {
		const result = daysUntil('2020-01-01')
		expect(result).toBeLessThan(0)
	})
})

describe('formatDate', () => {
	it('returns empty string for undefined', () => {
		expect(formatDate(undefined)).toBe('')
	})

	it('returns empty string for empty string', () => {
		expect(formatDate('')).toBe('')
	})

	it('formats ISO date to short date', () => {
		const result = formatDate('2026-07-01')
		expect(result).toBeTruthy()
		expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
	})

	it('formats another ISO date', () => {
		const result = formatDate('2026-06-12')
		expect(result).toBeTruthy()
		expect(result).toMatch(/^[A-Z][a-z]{2} \d{1,2}$/)
	})
})

describe('stageIndex', () => {
	it('returns index for all known stages', () => {
		expect(stageIndex('group_stage')).toBe(0)
		expect(stageIndex('r32')).toBe(1)
		expect(stageIndex('r16')).toBe(2)
		expect(stageIndex('qf')).toBe(3)
		expect(stageIndex('sf')).toBe(4)
		expect(stageIndex('final')).toBe(5)
	})
})

describe('resolveActiveStage', () => {
	it('returns team currentStage when selectedStage is auto', () => {
		const team = { currentStage: 'r32' } as unknown as Team
		expect(resolveActiveStage('auto', team)).toBe('r32')
	})

	it('returns selectedStage when not auto', () => {
		const team = { currentStage: 'group_stage' } as unknown as Team
		expect(resolveActiveStage('qf', team)).toBe('qf')
	})

	it('falls back to group_stage when team is null', () => {
		expect(resolveActiveStage('auto', null)).toBe('group_stage')
	})

	it('falls back to group_stage when team is undefined', () => {
		expect(resolveActiveStage('auto', undefined)).toBe('group_stage')
	})
})

describe('getFeederGroup', () => {
	const mkData = (groups: Record<string, unknown> = {}) =>
		({ groups } as unknown as AppData)

	it('returns null when data has no groups', () => {
		expect(getFeederGroup({ group: 'D' } as unknown as Team, 'r16', null)).toBeNull()
	})

	it('returns null when opponentDesc does not contain group reference', () => {
		const team = { group: 'D', path: { r16: { opponentDesc: 'Winner Match 94' } } } as unknown as Team
		expect(getFeederGroup(team, 'r16', mkData())).toBeNull()
	})

	it('extracts feeder group from "Winner Group G" pattern', () => {
		const team = { group: 'D', path: { r16: { opponentDesc: 'Winner Group G' } } } as unknown as Team
		const result = getFeederGroup(team, 'r16', mkData({ G: { standings: [], winProbabilities: {} } }))
		expect(result).not.toBeNull()
		expect(result!.key).toBe('G')
	})

	it('extracts feeder group from "Runner-up Group D" pattern', () => {
		const team = { group: 'C', path: { r32: { opponentDesc: 'Runner-up Group D' } } } as unknown as Team
		const result = getFeederGroup(team, 'r32', mkData({ D: { standings: [], winProbabilities: {} } }))
		expect(result).not.toBeNull()
		expect(result!.key).toBe('D')
	})

	it('returns null when feeder group is same as team group', () => {
		const team = { group: 'D', path: { r16: { opponentDesc: 'Winner Group D' } } } as unknown as Team
		expect(getFeederGroup(team, 'r16', mkData({ D: { standings: [], winProbabilities: {} } }))).toBeNull()
	})
})