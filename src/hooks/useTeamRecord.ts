import { useQuery } from '@tanstack/react-query'
import { ESPN_SLUG_MAP } from '../data/tournamentSchedule'
import { ESPN_TEAM_URL, ESPN_SCOREBOARD_URL } from '../constants'

interface TeamRecord {
	summary: string
	stats: Record<string, number>
}

interface NextEvent {
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

const ESPN_FLAG_MAP: Record<string, string> = {
	USA: '🇺🇸',
	MEX: '🇲🇽',
	CAN: '🇨🇦',
	BRA: '🇧🇷',
	ARG: '🇦🇷',
	COL: '🇨🇴',
	ECU: '🇪🇨',
	URU: '🇺🇾',
	PAR: '🇵🇾',
	ESP: '🇪🇸',
	FRA: '🇫🇷',
	GER: '🇩🇪',
	ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
	NED: '🇳🇱',
	POR: '🇵🇹',
	BEL: '🇧🇪',
	SUI: '🇨🇭',
	CRO: '🇭🇷',
	AUT: '🇦🇹',
	SWE: '🇸🇪',
	NOR: '🇳🇴',
	SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
	CZE: '🇨🇿',
	BIH: '🇧🇦',
	TUR: '🇹🇷',
	MAR: '🇲🇦',
	SEN: '🇸🇳',
	EGY: '🇪🇬',
	CIV: '🇨🇮',
	GHA: '🇬🇭',
	RSA: '🇿🇦',
	ALG: '🇩🇿',
	TUN: '🇹🇳',
	RDC: '🇨🇩',
	CPV: '🇨🇻',
	KSA: '🇸🇦',
	JPN: '🇯🇵',
	KOR: '🇰🇷',
	AUS: '🇦🇺',
	IRN: '🇮🇷',
	IRQ: '🇮🇶',
	QAT: '🇶🇦',
	JOR: '🇯🇴',
	UZB: '🇺🇿',
	NZL: '🇳🇿',
	HAI: '🇭🇹',
	PAN: '🇵🇦',
	CUW: '🇨🇼',
}

const EMPTY: TeamRecordData = { record: null, standingSummary: null, nextEvent: null, links: [] }

const LINK_RELS_TO_KEEP = new Set(['clubhouse', 'stats', 'roster', 'schedule'])

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
		const opp = home?.team?.id === team.id ? away : home
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
		const evtIsHome = home?.team?.id === team.id
		const myScore = evtIsHome ? parseInt(home?.score, 10) || 0 : parseInt(away?.score, 10) || 0
		const oppScore = evtIsHome ? parseInt(away?.score, 10) || 0 : parseInt(home?.score, 10) || 0
		const score = isLive ? `${myScore}-${oppScore}` : undefined

		nextEvent = {
			opponent: opp?.team?.displayName ?? 'TBD',
			opponentFlag: opp?.team?.abbreviation ? (ESPN_FLAG_MAP[opp.team.abbreviation] ?? '🏳️') : '🏳️',
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
				const myScore = sbIsHome ? parseInt(home?.score, 10) || 0 : parseInt(away?.score, 10) || 0
				const oppScore = sbIsHome ? parseInt(away?.score, 10) || 0 : parseInt(home?.score, 10) || 0
				const liveScore = `${myScore}-${oppScore}`
				const liveClock = comp?.status?.type?.detail || 'LIVE'

				if (nextEvent) {
					// Update stale team-API score with real-time scoreboard data
					nextEvent.score = liveScore
					nextEvent.clock = liveClock
				} else {
					const opp = home?.team?.id === team.id ? away : home
					const broadcasts: string[] = []
					for (const b of comp?.geoBroadcasts ?? []) {
						if (b.media?.shortName) broadcasts.push(b.media.shortName)
					}
					nextEvent = {
						opponent: opp?.team?.displayName ?? 'TBD',
						opponentFlag: opp?.team?.abbreviation
							? (ESPN_FLAG_MAP[opp.team.abbreviation] ?? '🏳️')
							: '🏳️',
						date: event.date ?? '',
						venue: comp?.venue?.fullName ?? '',
						broadcasts,
						isHome: home?.team?.id === team.id,
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
