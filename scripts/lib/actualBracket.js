import { KNOCKOUT_STAGES } from './tournament.js'
import { stageForKnockoutDate } from './elimination.js'

/**
 * Reconstruct the actual knockout bracket from observed ESPN matches.
 *
 * This is the canonical source of truth for the bracket view — it reflects
 * what FIFA / ESPN actually scheduled and played, not what our static
 * BRACKET_PATHS predicted. The two can drift (host pairings, schedule shifts,
 * unexpected seedings) and the predicted bracket should never override
 * observed reality.
 *
 * Returns:
 *   { r32: BracketMatch[], r16: [...], qf: [...], sf: [...], final: [...] }
 *
 * BracketMatch:
 *   { date, homeId, awayId, homeScore, awayScore, status, winnerId?,
 *     homeFlag, awayFlag, homeTeam, awayTeam, venue?, broadcasts?, clock? }
 *
 * Matches are sorted within each stage by date then by homeId for stability.
 * Only matches that map cleanly to a knockout stage are included (group-stage
 * matches and any malformed date are skipped).
 */
export function buildActualBracket(dailyMatches) {
	const out = {}
	for (const stage of KNOCKOUT_STAGES) out[stage] = []

	for (const matches of Object.values(dailyMatches ?? {})) {
		for (const m of matches) {
			const stage = stageForKnockoutDate(m.date)
			if (!stage) continue

			const entry = {
				date: m.date,
				homeId: m.homeId,
				awayId: m.awayId,
				homeTeam: m.homeTeam,
				awayTeam: m.awayTeam,
				homeFlag: m.homeFlag,
				awayFlag: m.awayFlag,
				homeScore: m.homeScore,
				awayScore: m.awayScore,
				status: m.status,
				clock: m.clock,
				venue: m.venue,
				broadcasts: m.broadcasts,
			}

			if (m.status === 'FINISHED') {
				if (m.homeScore > m.awayScore)      entry.winnerId = m.homeId
				else if (m.homeScore < m.awayScore) entry.winnerId = m.awayId
				// Ties in knockouts go to penalties — ESPN should mark a winner
				// even after PKs but if it didn't, leave winnerId undefined and
				// let the UI render "after PKs" once we have access to PK data.
			}

			out[stage].push(entry)
		}
	}

	for (const stage of KNOCKOUT_STAGES) {
		out[stage].sort((a, b) => (a.date ?? '').localeCompare(b.date ?? '') || (a.homeId ?? '').localeCompare(b.homeId ?? ''))
	}

	return out
}
