import { useQuery } from '@tanstack/react-query'
import { ESPN_SLUG_MAP } from '../data/tournamentSchedule'
import { ID_TO_FLAG, TLA_TO_ID } from '../components/ui/teamLookup'
import { ESPN_TEAM_URL, ESPN_SCOREBOARD_URL } from '../constants'

interface TeamRecord {
	summary: string
	stats: Record<string, number>
}

export interface NextEvent {
	opponent: string
	opponentFlag: string
	date: string
	venue: string
	broadcasts: string[]
	isHome: boolean
	isLive: boolean
	clock?: string
	score?: string
}

export interface TeamLink {
	rel: string
	href: string
	text: string
	isDesktop: boolean
}

export interface TeamRecordData {
	record: TeamRecord | null
	standingSummary: string | null
	nextEvent: NextEvent | null
	links: TeamLink[]
}

// Flag lookup by ESPN's TLA (`abbreviation` field). Note ESPN uses 'RDC'
// instead of FIFA's 'COD' for DR Congo, so we override that single case.
function flagFromEspnTla(tla?: string): string {
	if (!tla) return '🏳️'
	const upper = tla.toUpperCase()
	const id = upper === 'RDC' ? 'drcongo' : TLA_TO_ID[upper]
	return id ? (ID_TO_FLAG[id] ?? '🏳️') : '🏳️'
}

const EMPTY: TeamRecordData = { record: null, standingSummary: null, nextEvent: null, links: [] }

const LINK_RELS_TO_KEEP = new Set(['clubhouse', 'stats', 'roster', 'schedule'])

/**
 * ESPN's score field shape varies: the scoreboard endpoint returns a primitive
 * string like '2', while the team endpoint returns an object
 * `{value: 2.0, displayValue: '2', winner: true, ...}`. Normalize both.
 */
function parseEspnScore(score: unknown): number {
	if (score == null) return 0
	if (typeof score === 'number') return Math.floor(score)
	if (typeof score === 'string') return parseInt(score, 10) || 0
	if (typeof score === 'object') {
		const obj = score as { displayValue?: string; value?: number }
		if (typeof obj.displayValue === 'string') return parseInt(obj.displayValue, 10) || 0
		if (typeof obj.value === 'number') return Math.floor(obj.value)
	}
	return 0
}

async function fetchTeamRecordWithLiveFallback(
	slug: string,
	signal: AbortSignal
): Promise<TeamRecordData> {
	const res = await fetch(`${ESPN_TEAM_URL}/${slug}?_=${Date.now()}`, { signal })
	const json = await res.json()
	const team = json?.team
	if (!team) return EMPTY

	const recordItem = team.record?.items?.[0]
	let record: TeamRecord | null = null
	if (recordItem) {
		const stats: Record<string, number> = {}
		for (const s of recordItem.stats ?? []) {
			if (s.name) stats[s.name] = s.value
		}
		record = { summary: recordItem.summary ?? '0-0-0', stats }
	}

	let nextEvent: NextEvent | null = null
	let isLive = false

	const evt = team.nextEvent?.[0]
	if (evt) {
		const comp = evt.competitions?.[0]
		const competitors = comp?.competitors ?? []
		const home = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')
		const away = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')
		const opp = String(home?.team?.id) === String(team.id) ? away : home
		const broadcasts: string[] = []
		for (const b of comp?.broadcasts ?? []) {
			if (b.media?.shortName) broadcasts.push(b.media.shortName)
		}

		const statusState = comp?.status?.type?.state
		const statusDetail = comp?.status?.type?.detail
		isLive = statusState === 'in'
		const clock = isLive ? statusDetail || undefined : undefined
		// Score must read as `myScore-opponentScore` since the Hero renders teams
		// in `MyTeam vs Opponent` order — not as ESPN's home-away format.
		const evtIsHome = String(home?.team?.id) === String(team.id)
		const myScore = evtIsHome ? parseEspnScore(home?.score) : parseEspnScore(away?.score)
		const oppScore = evtIsHome ? parseEspnScore(away?.score) : parseEspnScore(home?.score)
		const score = isLive ? `${myScore}-${oppScore}` : undefined

		nextEvent = {
			opponent: opp?.team?.displayName ?? 'TBD',
			opponentFlag: flagFromEspnTla(opp?.team?.abbreviation),
			date: evt.date ?? '',
			venue: comp?.venue?.fullName ?? '',
			broadcasts,
			isHome: evtIsHome,
			isLive,
			clock,
			score,
		}
	}

	// The team API's scores lag during live matches. Always cross-check with the
	// scoreboard when the game is live or when nextEvent is missing (team is playing now).
	if (!nextEvent || isLive) {
		const todayYMD = new Date().toISOString().slice(0, 10).replace(/-/g, '')
		const sbRes = await fetch(`${ESPN_SCOREBOARD_URL}?dates=${todayYMD}&_=${Date.now()}`, {
			signal,
		})
		if (sbRes.ok) {
			const sbJson = await sbRes.json()
			for (const event of sbJson?.events ?? []) {
				const comp = event.competitions?.[0]
				const state = comp?.status?.type?.state
				if (state !== 'in') continue
				const competitors = comp?.competitors ?? []
				const myComp = competitors.find(
					(cp: { team?: { id?: string | number } }) => String(cp.team?.id) === String(team.id)
				)
				if (!myComp) continue

				const home = competitors.find((cp: { homeAway: string }) => cp.homeAway === 'home')
				const away = competitors.find((cp: { homeAway: string }) => cp.homeAway === 'away')
				// Orient as myScore-opponentScore to match the Hero's `MyTeam vs Opp` layout.
				const sbIsHome = String(home?.team?.id) === String(team.id)
				const myScore = sbIsHome ? parseEspnScore(home?.score) : parseEspnScore(away?.score)
				const oppScore = sbIsHome ? parseEspnScore(away?.score) : parseEspnScore(home?.score)
				const liveScore = `${myScore}-${oppScore}`
				const liveClock = comp?.status?.type?.detail || 'LIVE'

				if (nextEvent) {
					// Update stale team-API score with real-time scoreboard data
					nextEvent.score = liveScore
					nextEvent.clock = liveClock
				} else {
					const opp = String(home?.team?.id) === String(team.id) ? away : home
					const broadcasts: string[] = []
					for (const b of comp?.geoBroadcasts ?? []) {
						if (b.media?.shortName) broadcasts.push(b.media.shortName)
					}
					nextEvent = {
						opponent: opp?.team?.displayName ?? 'TBD',
						opponentFlag: flagFromEspnTla(opp?.team?.abbreviation),
						date: event.date ?? '',
						venue: comp?.venue?.fullName ?? '',
						broadcasts,
						isHome: String(home?.team?.id) === String(team.id),
						isLive: true,
						clock: liveClock,
						score: liveScore,
					}
				}
				break
			}
		}
	}

	const links: TeamLink[] = []
	for (const l of team.links ?? []) {
		const rels: string[] = Array.isArray(l?.rel) ? l.rel : []
		const match = rels.find((r: string) => LINK_RELS_TO_KEEP.has(r))
		if (match && l?.href && l?.text) {
			links.push({ rel: match, href: l.href, text: l.text, isDesktop: rels.includes('desktop') })
		}
	}

	return { record, standingSummary: team.standingSummary ?? null, nextEvent, links }
}

export function useTeamRecord(
	teamId: string,
	isHistorical: boolean
): TeamRecordData & { error: boolean; loading: boolean } {
	const slug = isHistorical ? null : (ESPN_SLUG_MAP[teamId] ?? null)

	const {
		data = EMPTY,
		isError,
		isLoading,
	} = useQuery({
		queryKey: ['teamRecord', slug],
		queryFn: ({ signal }) => fetchTeamRecordWithLiveFallback(slug!, signal),
		enabled: !!slug,
		refetchInterval: (query) => (query.state.data?.nextEvent?.isLive ? 90_000 : false),
		staleTime: 30_000,
	})

	return { ...data, error: isError, loading: isLoading }
}
