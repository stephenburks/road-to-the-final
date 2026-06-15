import { useMemo, useEffect } from 'react'
import { DEFAULT_TEAM } from './constants'
import { resolveActiveStage } from './utils'
import { useData } from './hooks/useData'
import { useAppState } from './hooks/useAppState'
import Header           from './components/Header'
import Nav              from './components/Nav'
import StageTabs        from './components/StageTabs'
import Hero             from './components/Hero'
import RoadBracket      from './components/RoadBracket'
import GroupStage       from './components/GroupStage'
import OpponentWatchlist from './components/OpponentWatchlist'
import ScheduledMatches from './components/ScheduledMatches'
import Disclaimer       from './components/Disclaimer'
import Footer           from './components/Footer'
import Loading          from './components/ui/Loading'
import EliminatedView   from './components/ui/EliminatedView'

function HistoricalBanner({ date, label, onGoLive }: { date: string; label: string; onGoLive: () => void }) {
  return (
    <div role="alert" aria-live="polite" style={{ background:'rgba(245,158,11,0.07)', borderBottom:'1px solid rgba(245,158,11,0.2)', fontSize:12, color:'#fcd34d', fontFamily:'var(--font-mono)' }}>
      <div className="wrap" style={{ padding:'9px 0', display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
        <span className="emoji" aria-hidden="true">📅</span> Viewing snapshot from <strong>{label ?? date}</strong> — probabilities reflect that day
        <button onClick={onGoLive} aria-label="Return to live data" style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:5, border:'1px solid rgba(245,158,11,0.3)', color:'#fcd34d', fontSize:10, fontFamily:'var(--font-mono)', cursor:'pointer', background:'transparent' }}>
          ← Back to Live
        </button>
      </div>
    </div>
  )
}

function ErrorScreen({ message }: { message: string }) {
  return (
    <div role="alert" style={{ minHeight:'100vh', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, fontFamily:'var(--font-mono)', color:'var(--red)', fontSize:12, textAlign:'center', padding:24 }}>
      <span className="emoji" style={{ fontSize:28 }}>⚠️</span>
      <p>{message}</p>
      <p style={{ color:'var(--text-dim)', marginTop:8 }}>
        Run <code style={{ background:'rgba(255,255,255,0.06)', padding:'1px 6px', borderRadius:3 }}>npm run dev</code> to serve the app locally.
      </p>
    </div>
  )
}

export default function App() {
  const { selectedTeamId, selectedDate, selectedStage, isHistorical, handleTeamChange, handleDateChange, handleStageSelect } = useAppState()

  const { liveData, manifest, snapData, loadingSnap, error } = useData(selectedDate)

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

  useEffect(() => {
    if (!team) return
    document.title = `${team.name} • Road to the Final • World Cup 2026`
  }, [team])

  if (error)     return <ErrorScreen message={error} />
  if (!liveData) return <Loading message="Loading match data…" />
  if (!team)     return <Loading message="Finding team data…" />
  if (!data)     return <Loading message="Loading data…" />

  const snapLabel  = isHistorical ? (manifest?.labels?.[selectedDate] ?? selectedDate) : null
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
      <Nav isHistorical={isHistorical} />

      {isHistorical && snapLabel && (
        <HistoricalBanner date={selectedDate} label={snapLabel} onGoLive={() => handleDateChange('live')} />
      )}

      {loadingSnap ? <Loading message="Loading historical snapshot…" /> : (
        <main id="main-content">
          <div className="wrap" style={{ paddingTop:22, paddingBottom:0 }}>
            <StageTabs team={team} selectedStage={activeStage} onSelect={handleStageSelect} />
          </div>

          <Hero team={team} activeStage={activeStage} isHistorical={isHistorical} />
          <RoadBracket team={team} activeStage={activeStage} onStageSelect={handleStageSelect} />

          {showGroups && !showElim && <GroupStage team={team} data={data} />}

          {showElim ? (
            <EliminatedView team={team} />
          ) : (
            <>
              <OpponentWatchlist team={team} activeStage={activeStage} data={data} />
              <ScheduledMatches team={team} />
            </>
          )}
        </main>
      )}

      <Disclaimer />
      <Footer />
    </>
  )
}
