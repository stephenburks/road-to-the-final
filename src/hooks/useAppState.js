import { useState, useEffect, useCallback, useMemo } from 'react'
import { DEFAULT_TEAM } from '../constants'
import { readURLParams, writeURLParams, lsGet, lsSet } from '../utils'

export function useAppState() {
	const urlParams  = useMemo(() => readURLParams(), [])
	const storedTeam = useMemo(() => lsGet('wc26_team'), [])

	const [selectedTeamId, setSelectedTeamId] = useState(
		urlParams.team  ?? storedTeam ?? DEFAULT_TEAM
	)
	const [selectedDate, setSelectedDate] = useState(urlParams.date ?? 'live')
	const [selectedStage, setSelectedStage] = useState(urlParams.stage ?? 'auto')

	const isHistorical = selectedDate !== 'live'

	useEffect(() => {
		writeURLParams(selectedTeamId, selectedDate, selectedStage)
		lsSet('wc26_team', selectedTeamId)
	}, [selectedTeamId, selectedDate, selectedStage])

	const handleTeamChange  = useCallback((id) => {
		setSelectedTeamId(id)
		setSelectedStage('auto')
	}, [])
	const handleDateChange  = useCallback((date) => setSelectedDate(date), [])
	const handleStageSelect = useCallback((stage) => setSelectedStage(stage), [])

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
