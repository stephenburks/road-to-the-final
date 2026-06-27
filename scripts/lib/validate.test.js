import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { validateAppData, ValidationError } from './validate.js'

// Load the real current world-cup-2026.json as a "happy-path" fixture so the
// validator gets exercised against actual production data on every test run.
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const liveDataPath = path.join(__dirname, '..', '..', 'public', 'data', 'world-cup-2026.json')
const liveData = fs.existsSync(liveDataPath) ? JSON.parse(fs.readFileSync(liveDataPath, 'utf8')) : null

function clone(obj) { return JSON.parse(JSON.stringify(obj)) }

describe('validateAppData', () => {
	it('accepts the currently-shipped world-cup-2026.json', () => {
		if (!liveData) {
			console.warn('Skipping — public/data/world-cup-2026.json not present')
			return
		}
		expect(() => validateAppData(liveData)).not.toThrow()
	})

	it('throws ValidationError when root is not an object', () => {
		expect(() => validateAppData(null)).toThrow(ValidationError)
		expect(() => validateAppData('hello')).toThrow(ValidationError)
	})

	it('throws when required top-level fields are missing', () => {
		expect(() => validateAppData({})).toThrow(/lastUpdated/)
	})

	it('flags a missing group entry', () => {
		if (!liveData) return
		const broken = clone(liveData)
		delete broken.groups.D
		expect(() => validateAppData(broken)).toThrow(/groups\.D/)
	})

	it('flags a teams array of the wrong length', () => {
		if (!liveData) return
		const broken = clone(liveData)
		broken.teams.pop()
		expect(() => validateAppData(broken)).toThrow(/teams must contain 48/)
	})

	it('flags duplicate team ids', () => {
		if (!liveData) return
		const broken = clone(liveData)
		broken.teams[1].id = broken.teams[0].id
		expect(() => validateAppData(broken)).toThrow(/duplicate/)
	})

	it('flags an out-of-range advanceProbabilities value', () => {
		if (!liveData) return
		const broken = clone(liveData)
		broken.teams[0].advanceProbabilities.r32 = 150
		expect(() => validateAppData(broken)).toThrow(/advanceProbabilities\.r32/)
	})

	it('flags monotonicity violation (later stage > earlier stage)', () => {
		if (!liveData) return
		const broken = clone(liveData)
		// Force a hard violation: set winner to be 20 points above final.
		broken.teams[0].advanceProbabilities.final = 5
		broken.teams[0].advanceProbabilities.winner = 25
		expect(() => validateAppData(broken)).toThrow(/monotonically/)
	})

	it('flags a non-ISO dailyMatches date key', () => {
		if (!liveData) return
		const broken = clone(liveData)
		broken.dailyMatches['not-a-date'] = []
		expect(() => validateAppData(broken)).toThrow(/non-ISO/)
	})

	it('flags an invalid match status', () => {
		if (!liveData) return
		const broken = clone(liveData)
		const firstDate = Object.keys(broken.dailyMatches)[0]
		if (broken.dailyMatches[firstDate]?.length) {
			broken.dailyMatches[firstDate][0].status = 'GHOST'
			expect(() => validateAppData(broken)).toThrow(/status invalid/)
		}
	})

	it('flags a missing tournament stage', () => {
		if (!liveData) return
		const broken = clone(liveData)
		delete broken.tournament.stages.qf
		expect(() => validateAppData(broken)).toThrow(/tournament\.stages\.qf/)
	})
})
