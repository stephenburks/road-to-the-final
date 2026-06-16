import { useState, useEffect, useCallback, useMemo } from 'react'
import { DEFAULT_TEAM } from '../constants'
import { readURLParams, writeURLParams, lsGet, lsSet } from '../utils'

export type View = 'home' | 'standings' | 'team'

export interface UseAppStateReturn {
	selectedTeamId: string
	selectedDate: string
	selectedStage: string
	view: View
	isHistorical: boolean
	handleTeamChange: (id: string) => void
	handleDateChange: (date: string) => void
	handleStageSelect: (stage: string) => void
	handleViewChange: (v: View) => void
}

export function useAppState(): UseAppStateReturn {
	const urlParams  = useMemo(() => readURLParams(), [])
	const storedTeam = useMemo(() => lsGet('wc26_team'), [])

	const [selectedTeamId, setSelectedTeamId] = useState<string>(
		urlParams.team  ?? storedTeam ?? DEFAULT_TEAM
	)
	const [selectedDate, setSelectedDate] = useState<string>(urlParams.date ?? 'live')
	const [selectedStage, setSelectedStage] = useState<string>(urlParams.stage ?? 'auto')

	const initialView: View = useMemo(() => {
		if (urlParams.view === 'standings' || urlParams.view === 'home' || urlParams.view === 'team') {
			return urlParams.view
		}
		return urlParams.team ? 'team' : 'home'
	}, [urlParams.view, urlParams.team])

	const [view, setView] = useState<View>(initialView)

	const isHistorical = selectedDate !== 'live'

	useEffect(() => {
		writeURLParams(selectedTeamId, selectedDate, selectedStage, view)
		lsSet('wc26_team', selectedTeamId)
	}, [selectedTeamId, selectedDate, selectedStage, view])

	const handleTeamChange  = useCallback((id: string) => {
		setSelectedTeamId(id)
		setSelectedStage('auto')
		setView('team')
	}, [])
	const handleDateChange  = useCallback((date: string) => setSelectedDate(date), [])
	const handleStageSelect = useCallback((stage: string) => setSelectedStage(stage), [])
	const handleViewChange  = useCallback((v: View) => setView(v), [])

	return {
		selectedTeamId,
		selectedDate,
		selectedStage,
		view,
		isHistorical,
		handleTeamChange,
		handleDateChange,
		handleStageSelect,
		handleViewChange,
	}
}