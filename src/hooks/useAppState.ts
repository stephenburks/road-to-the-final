import { useState, useEffect, useCallback, useMemo } from 'react'
import { DEFAULT_TEAM } from '../constants'
import { readURLParams, writeURLParams, lsGet, lsSet } from '../utils'

export interface UseAppStateReturn {
	selectedTeamId: string
	selectedDate: string
	selectedStage: string
	isHistorical: boolean
	handleTeamChange: (id: string) => void
	handleDateChange: (date: string) => void
	handleStageSelect: (stage: string) => void
}

export function useAppState(): UseAppStateReturn {
	const urlParams  = useMemo(() => readURLParams(), [])
	const storedTeam = useMemo(() => lsGet('wc26_team'), [])

	const [selectedTeamId, setSelectedTeamId] = useState<string>(
		urlParams.team  ?? storedTeam ?? DEFAULT_TEAM
	)
	const [selectedDate, setSelectedDate] = useState<string>(urlParams.date ?? 'live')
	const [selectedStage, setSelectedStage] = useState<string>(urlParams.stage ?? 'auto')

	const isHistorical = selectedDate !== 'live'

	useEffect(() => {
		writeURLParams(selectedTeamId, selectedDate, selectedStage)
		lsSet('wc26_team', selectedTeamId)
	}, [selectedTeamId, selectedDate, selectedStage])

	const handleTeamChange  = useCallback((id: string) => {
		setSelectedTeamId(id)
		setSelectedStage('auto')
	}, [])
	const handleDateChange  = useCallback((date: string) => setSelectedDate(date), [])
	const handleStageSelect = useCallback((stage: string) => setSelectedStage(stage), [])

	return {
		selectedTeamId,
		selectedDate,
		selectedStage,
		isHistorical,
		handleTeamChange,
		handleDateChange,
		handleStageSelect,
	}
}