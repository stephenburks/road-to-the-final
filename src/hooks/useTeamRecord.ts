import { useState, useEffect } from 'react'
import { ESPN_SLUG_MAP } from '../data/tournamentSchedule'

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

export interface TeamRecordData {
	record: TeamRecord | null
	standingSummary: string | null
	nextEvent: NextEvent | null
}

const ESPN_TEAM_URL = 'https://site.api.espn.com/apis/site/v2/sports/soccer/fifa.world/teams'

const ESPN_FLAG_MAP: Record<string, string> = {
	USA: '🇺🇸', MEX: '🇲🇽', CAN: '🇨🇦', BRA: '🇧🇷', ARG: '🇦🇷', COL: '🇨🇴',
	ECU: '🇪🇨', URU: '🇺🇾', PAR: '🇵🇾', ESP: '🇪🇸', FRA: '🇫🇷', GER: '🇩🇪',
	ENG: '🏴󠁧󠁢󠁥󠁮󠁧󠁿', NED: '🇳🇱', POR: '🇵🇹', BEL: '🇧🇪', SUI: '🇨🇭',
	CRO: '🇭🇷', AUT: '🇦🇹', SWE: '🇸🇪', NOR: '🇳🇴', SCO: '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
	CZE: '🇨🇿', BIH: '🇧🇦', TUR: '🇹🇷', MAR: '🇲🇦', SEN: '🇸🇳',
	EGY: '🇪🇬', CIV: '🇨🇮', GHA: '🇬🇭', RSA: '🇿🇦', ALG: '🇩🇿',
	TUN: '🇹🇳', RDC: '🇨🇩', CPV: '🇨🇻', KSA: '🇸🇦',
	JPN: '🇯🇵', KOR: '🇰🇷', AUS: '🇦🇺', IRN: '🇮🇷', IRQ: '🇮🇶',
	QAT: '🇶🇦', JOR: '🇯🇴', UZB: '🇺🇿', NZL: '🇳🇿',
	HAI: '🇭🇹', PAN: '🇵🇦', CUW: '🇨🇼',
}

const EMPTY: TeamRecordData = { record: null, standingSummary: null, nextEvent: null }

export function useTeamRecord(teamId: string, isHistorical: boolean): TeamRecordData {
	const [data, setData] = useState<TeamRecordData>(EMPTY)

	const slug = isHistorical ? null : (ESPN_SLUG_MAP[teamId] ?? null)

	useEffect(() => {
		if (!slug) {
			setData(EMPTY) // eslint-disable-line react-hooks/set-state-in-effect
			return
		}

		let cancelled = false

		fetch(`${ESPN_TEAM_URL}/${slug}`)
			.then(res => res.json())
			.then(json => {
				if (cancelled) return
				const team = json?.team
				if (!team) {
					setData(EMPTY)
					return
				}

				const recordItem = team.record?.items?.[0]
				let record: TeamRecord | null = null
				if (recordItem) {
					const stats: Record<string, number> = {}
					for (const s of (recordItem.stats ?? [])) {
						if (s.name) stats[s.name] = s.value
					}
					record = { summary: recordItem.summary ?? '0-0-0', stats }
				}

				let nextEvent: NextEvent | null = null
				const evt = team.nextEvent?.[0]
				if (evt) {
					const comp = evt.competitions?.[0]
					const competitors = comp?.competitors ?? []
					const home = competitors.find((c: { homeAway: string }) => c.homeAway === 'home')
					const away = competitors.find((c: { homeAway: string }) => c.homeAway === 'away')
					const opp = home?.team?.id === team.id ? away : home
					const broadcasts: string[] = []
					for (const b of (comp?.broadcasts ?? [])) {
						if (b.media?.shortName) broadcasts.push(b.media.shortName)
					}

					const statusState = comp?.status?.type?.state
					const statusDetail = comp?.status?.type?.detail
					const isLive = statusState === 'in'
					const clock = isLive ? (statusDetail || undefined) : undefined
					const score = isLive
						? `${parseInt(home?.score, 10) || 0}-${parseInt(away?.score, 10) || 0}`
						: undefined

					nextEvent = {
						opponent: opp?.team?.displayName ?? 'TBD',
						opponentFlag: opp?.team?.abbreviation
							? (ESPN_FLAG_MAP[opp.team.abbreviation] ?? '🏳️')
							: '🏳️',
						date: evt.date ?? '',
						venue: comp?.venue?.fullName ?? '',
						broadcasts,
						isHome: home?.team?.id === team.id,
						isLive,
						clock,
						score,
					}
				}

				setData({
					record,
					standingSummary: team.standingSummary ?? null,
					nextEvent,
				})
			})
			.catch(() => {
				if (!cancelled) setData(EMPTY)
			})

		return () => { cancelled = true }
	}, [slug])

	return data
}
