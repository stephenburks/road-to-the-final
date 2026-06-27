import { ID_TO_RANK } from './teams.js'

export const STAGES = ['r32', 'r16', 'qf', 'sf', 'final', 'winner']
const PER_ROUND_FALLOFF = 0.48

/**
 * Compute a team's per-stage advancement probabilities. Uses Polymarket
 * directly for every stage that has a market price and only interpolates the
 * gaps. Stages missing from the current fetch but present in the previous
 * snapshot (with source='market') are carried forward — protects against
 * transient Polymarket gaps degrading data quality.
 *
 * Returns { r32, r16, qf, sf, final, winner, source: 'market' | 'calculated' }.
 */
export function calcProbs(teamId, group, standings, polyData, existingProbs) {
	const market = {
		r32:    polyData?.r32?.[teamId],
		r16:    polyData?.r16?.[teamId],
		qf:     polyData?.qf?.[teamId],
		sf:     polyData?.sf?.[teamId],
		final:  polyData?.final?.[teamId],
		winner: polyData?.winner?.[teamId],
	}

	const known = STAGES
		.map((key, idx) => ({ key, idx, val: market[key] }))
		.filter(s => typeof s.val === 'number')

	if (known.length === 0) return calcProbsFallback(teamId, group, standings)

	const prevWasMarket = existingProbs?.source === 'market'

	const result = {}
	for (let i = 0; i < STAGES.length; i++) {
		const stageKey = STAGES[i]
		if (typeof market[stageKey] === 'number') {
			result[stageKey] = market[stageKey]
			continue
		}
		if (prevWasMarket && typeof existingProbs?.[stageKey] === 'number') {
			result[stageKey] = existingProbs[stageKey]
			continue
		}
		const before = [...known].reverse().find(k => k.idx < i)
		const after = known.find(k => k.idx > i)

		if (before && after) {
			const steps = after.idx - before.idx
			const t = (i - before.idx) / steps
			result[stageKey] = Math.round(before.val * Math.pow(after.val / before.val, t))
		} else if (before) {
			const stepsFrom = i - before.idx
			result[stageKey] = Math.round(before.val * Math.pow(PER_ROUND_FALLOFF, stepsFrom))
		} else if (after) {
			const stepsTo = after.idx - i
			result[stageKey] = Math.min(Math.round(after.val * Math.pow(1 / PER_ROUND_FALLOFF, stepsTo)), 99)
		}
	}

	// Enforce monotonicity — Polymarket markets for adjacent stages aren't
	// always perfectly consistent, but the UI assumes each later stage <= earlier.
	for (let i = 1; i < STAGES.length; i++) {
		if (result[STAGES[i]] > result[STAGES[i - 1]]) {
			result[STAGES[i]] = result[STAGES[i - 1]]
		}
	}

	return { ...result, source: 'market' }
}

/** Standings/ranking-based fallback when Polymarket has no data for the team. */
export function calcProbsFallback(teamId, group, standings) {
	const rows = standings[group] || []
	const row = rows.find(r => r.teamId === teamId)
	const base = ID_TO_RANK[teamId] ?? 50

	const hasStandings = rows.length > 0
	const pos = hasStandings ? (row?.pos ?? 4) : 4
	const rankScore = Math.max(1, 50 - base)

	let seed
	if (hasStandings) {
		const posMult = { 1: 1.0, 2: 0.65, 3: 0.3, 4: 0.05 }[pos] ?? 0.5
		seed = Math.round(rankScore * posMult)
	} else {
		const tiers = [
			{ max: 10, pct: 25 }, { max: 20, pct: 18 }, { max: 30, pct: 12 },
			{ max: 40, pct: 8 },  { max: 50, pct: 5 },  { max: Infinity, pct: 2 },
		]
		const tier = tiers.find(t => base <= t.max)
		seed = tier ? Math.round(tier.pct * (rankScore / 50)) : 2
	}

	const seedWinner = Math.min(seed, 30)
	const r32   = Math.min(Math.round(seedWinner * 2.8 + (pos <= 2 ? 20 : 5)), 99)
	const r16   = Math.round(r32 * 0.55)
	const qf    = Math.round(r16 * 0.52)
	const sf    = Math.round(qf  * 0.50)
	const final = Math.round(sf  * 0.50)
	// Derive winner from the chain so monotonicity holds.
	const winner = Math.round(final * 0.50)

	return { r32, r16, qf, sf, final, winner, source: 'calculated' }
}

// ─── Difficulty scoring helpers (for opponent watchlists) ────────────────────
export function diffRating(rank) {
	if (!rank)      return 3
	if (rank <= 10) return 5
	if (rank <= 20) return 4
	if (rank <= 35) return 3
	if (rank <= 55) return 2
	return 1
}

export function diffLabel(r) {
	return ['', 'Favorable', 'Favorable', 'Moderate', 'Tough', 'Danger'][r] || 'Moderate'
}

export function diffColor(r) {
	return ['', '#22C55E', '#22C55E', '#F59E0B', '#FB923C', '#EF4444'][r] || '#F59E0B'
}
