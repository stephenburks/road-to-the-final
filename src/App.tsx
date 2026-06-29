import { useMemo, useEffect } from 'react'
import { DEFAULT_TEAM } from './constants'
import { resolveActiveStage } from './utils'
import { useData } from './hooks/useData'
import { useAppState } from './hooks/useAppState'
import { useRoster } from './hooks/useRoster'
import { useLiveOverlay } from './hooks/useLiveOverlay'
import { LiveOverlayProvider } from './hooks/LiveOverlayProvider'
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
import TournamentBracket from './components/TournamentBracket'
import BrowsingBanner   from './components/ui/BrowsingBanner'
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
  const { selectedTeamId, preferredTeamId, isBrowsing, selectedDate, selectedStage, view, isHistorical, handleTeamChange, handleTeamPeek, handleReturnToPreferred, handleDateChange, handleStageSelect, handleViewChange } = useAppState()

  const { liveData, manifest, snapData, loadingSnap, error } = useData(selectedDate)

  const { players: rosterPlayers, loading: rosterLoading, error: rosterError } = useRoster(selectedTeamId, isHistorical)

  const staticData = selectedDate === 'live' ? liveData : snapData
  const overlay    = useLiveOverlay(staticData, isHistorical)
  const data       = overlay.data

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

	const clinchedTeamIds = useMemo(() => {
		const set = new Set<string>()
		for (const t of (data?.teams ?? [])) {
			if ((t.advanceProbabilities?.r32 ?? 0) >= 100) set.add(t.id)
		}
		return set
	}, [data?.teams])

	const eliminatedTeamIds = useMemo(() => {
		const set = new Set<string>()
		for (const t of (data?.teams ?? [])) {
			if (t.eliminated) set.add(t.id)
		}
		return set
	}, [data?.teams])

	const groupWinProb = useMemo(() => {
		if (!team || !data?.groups) return undefined
		const group = data.groups[team.group]
		if (!group?.winProbabilities) return undefined
		const probability = group.winProbabilities[team.id]
		if (probability == null) return undefined
		return { probability, groupLetter: team.group }
	}, [team, data])

	const groupPosition = useMemo(() => {
		if (!team || !data?.groups) return undefined
		const standings = data.groups[team.group]?.standings ?? []
		const row = standings.find(r => r.teamId === team.id)
		return row?.pos
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
    } else if (view === 'bracket') {
      document.title = 'Bracket • Road to the Final • World Cup 2026'
    }
  }, [view])

  if (error)     return <ErrorScreen message={error} />
  if (!liveData) return <Loading message="Loading match data…" />
  if (!data)     return <Loading message="Loading data…" />

  const snapLabel  = isHistorical ? (manifest?.labels?.[selectedDate] ?? selectedDate) : null

  // Home, Standings, and Bracket views don't need a resolved team
  if (view === 'home' || view === 'standings' || view === 'bracket') {
    return (
      <LiveOverlayProvider value={overlay}>
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
                onTeamPeek={handleTeamPeek}
                onViewChange={handleViewChange}
              />
            )}
            {view === 'standings' && (
              <StandingsPage
                data={data}
                selectedTeamId={selectedTeamId}
                clinchedTeamIds={clinchedTeamIds}
                onTeamPeek={handleTeamPeek}
              />
            )}
            {view === 'bracket' && (
              <ErrorBoundary name="tournament bracket">
                <TournamentBracket
                  data={data}
                  selectedTeamId={selectedTeamId}
                  onTeamPeek={handleTeamPeek}
                />
              </ErrorBoundary>
            )}
          </main>
        )}

        <Disclaimer />
        <Footer />
      </LiveOverlayProvider>
    )
  }

  // Team view needs a resolved team
  if (!team)     return <Loading message="Finding team data…" />

  const showGroups = activeStage === 'group_stage'
  const showElim   = team.eliminated

  return (
    <LiveOverlayProvider value={overlay}>
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
          {isBrowsing && view === 'team' && team && (() => {
            const preferred = teamsMap.get(preferredTeamId)
            return preferred ? <BrowsingBanner viewing={team} preferred={preferred} onReturn={handleReturnToPreferred} /> : null
          })()}
          <div className={`wrap ${styles.tabWrapper}`}>
            <StageTabs team={team} selectedStage={activeStage} onSelect={handleStageSelect} />
          </div>

			<ErrorBoundary name="team overview"><Hero team={team} activeStage={activeStage} isHistorical={isHistorical} groupWinProb={groupWinProb} groupPosition={groupPosition} data={data} onTeamPeek={handleTeamPeek} /></ErrorBoundary>
			{!team.eliminated && <ErrorBoundary name="upcoming matches"><GamesToWatch team={team} data={data} onTeamPeek={handleTeamPeek} /></ErrorBoundary>}
			<ErrorBoundary name="bracket"><RoadBracket team={team} activeStage={activeStage} onStageSelect={handleStageSelect} /></ErrorBoundary>

          {showGroups && !showElim && <ErrorBoundary name="group stage"><GroupStage team={team} data={data} eliminatedTeamIds={eliminatedTeamIds} clinchedTeamIds={clinchedTeamIds} onTeamPeek={handleTeamPeek} /></ErrorBoundary>}

          {showElim ? (
            <EliminatedView team={team} />
          ) : (
            <>
              <ErrorBoundary name="opponent watchlist"><OpponentWatchlist team={team} activeStage={activeStage} data={data} eliminatedTeamIds={eliminatedTeamIds} clinchedTeamIds={clinchedTeamIds} onTeamPeek={handleTeamPeek} /></ErrorBoundary>
              <ErrorBoundary name="schedule"><ScheduledMatches team={team} onTeamPeek={handleTeamPeek} /></ErrorBoundary>
            </>
          )}
          <ErrorBoundary name="squad roster"><Roster players={rosterPlayers} loading={rosterLoading} error={rosterError} /></ErrorBoundary>
        </main>
      )}

      <Disclaimer />
      <Footer />
    </LiveOverlayProvider>
  )
}
