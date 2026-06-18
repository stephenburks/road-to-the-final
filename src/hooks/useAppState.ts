import { useState, useEffect, useCallback, useMemo } from 'react'
import { DEFAULT_TEAM } from '../constants'
import { readURLParams, writeURLParams, lsGet, lsSet } from '../utils'

export type View = 'home' | 'standings' | 'team'

export interface UseAppStateReturn {
	selectedTeamId: string        // currently viewing (URL-driven, transient)
	preferredTeamId: string       // user's saved favorite (localStorage)
	isBrowsing: boolean           // true when viewing !== preferred
	selectedDate: string
	selectedStage: string
	view: View
	isHistorical: boolean
	handleTeamChange: (id: string) => void       // sets both — explicit team-picker action
	handleTeamPeek: (id: string) => void         // sets only viewing — transient browse
	handleReturnToPreferred: () => void          // viewing = preferred
	handleDateChange: (date: string) => void
	handleStageSelect: (stage: string) => void
	handleViewChange: (v: View) => void
}

export function useAppState(): UseAppStateReturn {
	const urlParams  = useMemo(() => readURLParams(), [])
	const storedTeam = useMemo(() => lsGet('wc26_team'), [])

	const initialPreferred = storedTeam ?? DEFAULT_TEAM
	const initialViewing   = urlParams.team ?? initialPreferred

	const [preferredTeamId, setPreferredTeamId] = useState<string>(initialPreferred)
	const [selectedTeamId, setSelectedTeamId]   = useState<string>(initialViewing)
	const [selectedDate, setSelectedDate]       = useState<string>(urlParams.date ?? 'live')
	const [selectedStage, setSelectedStage]     = useState<string>(urlParams.stage ?? 'auto')

	const initialView: View = useMemo(() => {
		if (urlParams.view === 'standings' || urlParams.view === 'home' || urlParams.view === 'team') {
			return urlParams.view
		}
		return urlParams.team ? 'team' : 'home'
	}, [urlParams.view, urlParams.team])

	const [view, setView] = useState<View>(initialView)

	const isHistorical = selectedDate !== 'live'
	const isBrowsing   = selectedTeamId !== preferredTeamId

	useEffect(() => {
		writeURLParams(selectedTeamId, selectedDate, selectedStage, view)
	}, [selectedTeamId, selectedDate, selectedStage, view])

	useEffect(() => {
		lsSet('wc26_team', preferredTeamId)
	}, [preferredTeamId])

	const handleTeamChange  = useCallback((id: string) => {
		setPreferredTeamId(id)
		setSelectedTeamId(id)
		setSelectedStage('auto')
		setView('team')
	}, [])
	const handleTeamPeek = useCallback((id: string) => {
		setSelectedTeamId(id)
		setSelectedStage('auto')
		setView('team')
	}, [])
	const handleReturnToPreferred = useCallback(() => {
		setSelectedTeamId(preferredTeamId)
		setSelectedStage('auto')
		setView('team')
	}, [preferredTeamId])
	const handleDateChange  = useCallback((date: string) => setSelectedDate(date), [])
	const handleStageSelect = useCallback((stage: string) => setSelectedStage(stage), [])
	const handleViewChange  = useCallback((v: View) => setView(v), [])

	return {
		selectedTeamId,
		preferredTeamId,
		isBrowsing,
		selectedDate,
		selectedStage,
		view,
		isHistorical,
		handleTeamChange,
		handleTeamPeek,
		handleReturnToPreferred,
		handleDateChange,
		handleStageSelect,
		handleViewChange,
	}
}