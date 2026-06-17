import { useMemo, useEffect } from 'react'
import { DEFAULT_TEAM } from './constants'
import { resolveActiveStage } from './utils'
import { useData } from './hooks/useData'
import { useAppState } from './hooks/useAppState'
import { useRoster } from './hooks/useRoster'
import Header           from './components/Header'
import Nav              from './components/Nav'
import StageTabs        from './components/StageTabs'
import Hero             from './components/Hero'
import Roster           from './components/Roster'
import RoadBracket      from './components/RoadBracket'
import GamesToWatch     from './components/GamesToWatch'
import GroupStage       from './components/GroupStage'
import OpponentWatchlist from './components/OpponentWatchlist'
import ScheduledMatches from './components/ScheduledMatches'
import Disclaimer       from './components/Disclaimer'
import Footer           from './components/Footer'
import Loading          from './components/ui/Loading'
import EliminatedView   from './components/ui/EliminatedView'
import ErrorBoundary    from './components/ui/ErrorBoundary'
import HomePage         from './components/HomePage'
import StandingsPage    from './components/StandingsPage'
import styles           from './App.module.css'

function HistoricalBanner({ date, label, onGoLive }: { date: string; label: string; onGoLive: () => void }) {
  return (
    <div role="alert" aria-live="polite" className={styles.historicalBanner}>
      <div className={`wrap ${styles.historicalInner}`}>
        <span className={styles.historicalBannerIcon} aria-hidden="true" /> Viewing snapshot from <strong>{label ?? date}</strong> {'\u2014'} probabilities reflect that day
        <button onClick={onGoLive} aria-label="Return to live data" className={styles.historicalBtn}>
          {'\u2190'} Back to Live
        </button>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div role="alert" className={styles.errorScreen}>
      <span className={styles.errorIcon} />
      <p>{message}</p>
      <p className={styles.errorSubtext}>
        Run <code className={styles.errorCode}>npm run dev</code> to serve the app locally.
      </p>
    </div>
  )
}

export default function App() {
  const { selectedTeamId, selectedDate, selectedStage, view, isHistorical, handleTeamChange, handleDateChange, handleStageSelect, handleViewChange } = useAppState()

  const { liveData, manifest, snapData, loadingSnap, error } = useData(selectedDate)

  const { players: rosterPlayers, loading: rosterLoading } = useRoster(selectedTeamId, isHistorical)

  const data       = selectedDate === 'live' ? liveData : snapData

  const teamsMap = useMemo(() => {
    if (!data?.teams && !liveData?.teams) return new Map()
    const source = data?.teams ?? liveData?.teams ?? []
    return new Map(source.map(t => [t.id, t]))
  }, [data, liveData])

  const team = useMemo(
    () => teamsMap.get(selectedTeamId) ?? teamsMap.get(DEFAULT_TEAM) ?? null,
    [teamsMap, selectedTeamId]
  )

  const activeStage = useMemo(() => resolveActiveStage(selectedStage, team), [selectedStage, team])

	const groupWinProb = useMemo(() => {
		if (!team || !data?.groups) return undefined
		const group = data.groups[team.group]
		if (!group?.winProbabilities) return undefined
		const probability = group.winProbabilities[team.id]
		if (probability == null) return undefined
		return { probability, groupLetter: team.group }
	}, [team, data])

  useEffect(() => {
    if (!team) return
    document.title = `${team.name} • Road to the Final • World Cup 2026`
  }, [team])

  useEffect(() => {
    if (view === 'home') {
      document.title = 'Road to the Final • World Cup 2026'
    } else if (view === 'standings') {
      document.title = 'Standings • Road to the Final • World Cup 2026'
    }
  }, [view])

  if (error)     return <ErrorScreen message={error} />
  if (!liveData) return <Loading message="Loading match data…" />
  if (!data)     return <Loading message="Loading data…" />

  const snapLabel  = isHistorical ? (manifest?.labels?.[selectedDate] ?? selectedDate) : null

  // Home and Standings views don't need a resolved team
  if (view === 'home' || view === 'standings') {
    return (
      <>
        <Header
          data={liveData}
          selectedTeamId={selectedTeamId}
          onTeamChange={handleTeamChange}
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          manifest={manifest}
        />
        <Nav view={view} onViewChange={handleViewChange} isHistorical={isHistorical} />

        {isHistorical && snapLabel && (
          <HistoricalBanner date={selectedDate} label={snapLabel} onGoLive={() => handleDateChange('live')} />
        )}

        {loadingSnap ? <Loading message="Loading historical snapshot…" /> : (
          <main id="main-content">
            {view === 'home' && (
              <HomePage
                data={data}
                selectedTeamId={selectedTeamId}
                onTeamChange={handleTeamChange}
                onViewChange={handleViewChange}
              />
            )}
            {view === 'standings' && (
              <StandingsPage
                data={data}
                selectedTeamId={selectedTeamId}
              />
            )}
          </main>
        )}

        <Disclaimer />
        <Footer />
      </>
    )
  }

  // Team view needs a resolved team
  if (!team)     return <Loading message="Finding team data…" />

  const showGroups = activeStage === 'group_stage'
  const showElim   = team.eliminated

  return (
    <>
      <Header
        data={liveData}
        selectedTeamId={selectedTeamId}
        onTeamChange={handleTeamChange}
        selectedDate={selectedDate}
        onDateChange={handleDateChange}
        manifest={manifest}
      />
      <Nav view={view} onViewChange={handleViewChange} isHistorical={isHistorical} />

      {isHistorical && snapLabel && (
        <HistoricalBanner date={selectedDate} label={snapLabel} onGoLive={() => handleDateChange('live')} />
      )}

      {loadingSnap ? <Loading message="Loading historical snapshot…" /> : (
        <main id="main-content">
          <div className={`wrap ${styles.tabWrapper}`}>
            <StageTabs team={team} selectedStage={activeStage} onSelect={handleStageSelect} />
          </div>

			<ErrorBoundary name="team overview"><Hero team={team} activeStage={activeStage} isHistorical={isHistorical} groupWinProb={groupWinProb} /></ErrorBoundary>
			{!team.eliminated && <ErrorBoundary name="upcoming matches"><GamesToWatch team={team} data={data} /></ErrorBoundary>}
			<ErrorBoundary name="bracket"><RoadBracket team={team} activeStage={activeStage} onStageSelect={handleStageSelect} /></ErrorBoundary>

          {showGroups && !showElim && <ErrorBoundary name="group stage"><GroupStage team={team} data={data} /></ErrorBoundary>}

          {showElim ? (
            <EliminatedView team={team} />
          ) : (
            <>
              <ErrorBoundary name="opponent watchlist"><OpponentWatchlist team={team} activeStage={activeStage} data={data} /></ErrorBoundary>
              <ErrorBoundary name="schedule"><ScheduledMatches team={team} /></ErrorBoundary>
            </>
          )}
          <ErrorBoundary name="squad roster"><Roster players={rosterPlayers} loading={rosterLoading} /></ErrorBoundary>
        </main>
      )}

      <Disclaimer />
      <Footer />
    </>
  )
}
