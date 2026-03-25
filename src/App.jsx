import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// --- Views ---
import HomeScreen      from './components/HomeScreen'
import SchedulePanel   from './components/SchedulePanel'
import RankingsView    from './components/RankingsView'
import TeamLookup      from './components/TeamLookup'
import AllianceTracker from './components/AllianceTracker'
import RobotChecklist  from './components/RobotChecklist'
import MatchNotes      from './components/MatchNotes'

// --- Battery view components ---
import Header       from './components/Header'
import StatusBanner from './components/StatusBanner'
import BatteryGrid  from './components/BatteryGrid'
import BatteryModal from './components/BatteryModal'
import SettingsPanel from './components/SettingsPanel'
import FieldView    from './components/FieldView'

// --- Hooks ---
import { useBatteries } from './hooks/useBatteries'
import { useModals }    from './hooks/useModals'

// --- Utils ---
import { getBestNextBattery, getInBotBattery } from './utils/batteryLogic'
import {
  loadSettings,
  saveSettings,
  loadMatchNumber,
  saveMatchNumber,
} from './utils/storage'
import { isFirebaseConfigured } from './firebase'

const DEFAULT_SETTINGS = {
  teamNumber:      '',
  batteryCount:    6,
  chargeThreshold: 60,
  coolThreshold:   15,
  syncCode:        '',
  viewOnly:        false,
  tbaKey:          '',
  eventCode:       '',
  watchedTeams:    '',
  driver:          '',
  operator:        '',
  coach:           '',
}

const URL_FIELD_MODE = new URLSearchParams(window.location.search).has('field')

export default function App() {
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(loadSettings() || {}),
  }))

  const [matchNumber, setMatchNumber] = useState(loadMatchNumber)
  const [activeView,  setActiveView]  = useState(null) // null = home screen

  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured && settings.syncCode ? 'error' : 'local'
  )

  const handleSyncStatus = useCallback((connected) => {
    setSyncStatus(connected ? 'live' : 'error')
  }, [])

  const {
    batteries,
    startCharging,
    markReady,
    cancelCharging,
    putInBot,
    removeFromBot,
    markDepleted,
    updateReadings,
    updateMeta,
    resetAll,
    resetStats,
    markBackup,
  } = useBatteries(settings.batteryCount, settings.syncCode, handleSyncStatus)

  // goHome — used by useModals as a back-button fallback when no modals are open
  const goHome = useCallback(() => setActiveView(null), [])

  const {
    selectedBattery,
    setSelectedBattery,
    showSettings,
    setShowSettings,
    closeModal,
  } = useModals(activeView !== null ? goHome : undefined)

  // Navigate to a view, pushing history so browser back works
  function navigate(view) {
    window.history.pushState({ view }, '')
    setActiveView(view)
  }

  // 10-second tick — keeps elapsed time displays current
  const [tick, setTick] = useState(0) // eslint-disable-line no-unused-vars
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => { saveMatchNumber(matchNumber) }, [matchNumber])

  // Auto-reset cycles when match day advances
  const prevMatchNumber = useRef(matchNumber)
  useEffect(() => {
    if (matchNumber > prevMatchNumber.current) resetStats()
    prevMatchNumber.current = matchNumber
  }, [matchNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!isFirebaseConfigured || !settings.syncCode) setSyncStatus('local')
  }, [settings.syncCode])

  const bestNext = useMemo(
    () => getBestNextBattery(batteries, settings.chargeThreshold),
    [batteries, settings.chargeThreshold]
  )
  const inBotBattery = useMemo(() => getInBotBattery(batteries), [batteries])
  const modalBattery = selectedBattery
    ? batteries.find(b => b.id === selectedBattery.id) || null
    : null

  function handleSaveSettings(newSettings) { setSettings(newSettings) }
  function handleResetAll(count)           { resetAll(count); closeModal() }
  function handleResetStats()              { resetStats() }
  function handlePutInBot(id)              { putInBot(id); closeModal() }

  // ── Field view ────────────────────────────────────────────────
  const isFieldMode = URL_FIELD_MODE || settings.viewOnly
  if (isFieldMode) {
    return (
      <FieldView
        batteries={batteries}
        matchNumber={matchNumber}
        chargeThresholdMin={settings.chargeThreshold}
        teamNumber={settings.teamNumber}
        syncStatus={syncStatus}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onResetAll={handleResetAll}
        onResetStats={handleResetStats}
        urlFieldMode={URL_FIELD_MODE}
      />
    )
  }

  // ── Settings modal (shared across views) ──────────────────────
  const settingsModal = showSettings && (
    <SettingsPanel
      settings={settings}
      onSave={handleSaveSettings}
      onResetAll={handleResetAll}
      onResetStats={handleResetStats}
      onClose={() => setShowSettings(false)}
    />
  )

  // ── Home screen ───────────────────────────────────────────────
  if (activeView === null) {
    return (
      <>
        <HomeScreen
          teamNumber={settings.teamNumber}
          syncStatus={syncStatus}
          onNavigate={navigate}
          onOpenSettings={() => setShowSettings(true)}
        />
        {settingsModal}
      </>
    )
  }

  // ── Schedule ──────────────────────────────────────────────────
  if (activeView === 'schedule') {
    return <SchedulePanel settings={settings} onClose={goHome} />
  }

  // ── Rankings ──────────────────────────────────────────────────
  if (activeView === 'rankings') {
    return <RankingsView settings={settings} onBack={goHome} />
  }

  // ── Team Lookup ───────────────────────────────────────────────
  if (activeView === 'teamlookup') {
    return <TeamLookup settings={settings} onBack={goHome} />
  }

  // ── Alliance Tracker ──────────────────────────────────────────
  if (activeView === 'alliance') {
    return <AllianceTracker settings={settings} onBack={goHome} />
  }

  // ── Robot Checklist ───────────────────────────────────────────
  if (activeView === 'checklist') {
    return <RobotChecklist onBack={goHome} />
  }

  // ── Match Notes ───────────────────────────────────────────────
  if (activeView === 'notes') {
    return <MatchNotes matchNumber={matchNumber} onBack={goHome} />
  }

  // ── Battery view ──────────────────────────────────────────────
  return (
    <div className="app">
      <Header
        teamNumber={settings.teamNumber}
        matchNumber={matchNumber}
        onMatchChange={setMatchNumber}
        onSettingsOpen={() => setShowSettings(true)}
        onBack={goHome}
        syncStatus={syncStatus}
      />

      <main className="main-content">
        <StatusBanner
          batteries={batteries}
          inBotBattery={inBotBattery}
          bestNext={bestNext}
          chargeThresholdMin={settings.chargeThreshold}
          onBatteryClick={setSelectedBattery}
        />

        <BatteryGrid
          batteries={batteries}
          bestNext={bestNext}
          chargeThresholdMin={settings.chargeThreshold}
          coolThresholdMin={settings.coolThreshold}
          onCardPress={setSelectedBattery}
        />

        <div className="legend">
          <span className="legend-item" style={{ color: '#ef4444' }}>● Depleted</span>
          <span className="legend-item" style={{ color: '#f59e0b' }}>● Charging</span>
          <span className="legend-item" style={{ color: '#f97316' }}>● Cooling</span>
          <span className="legend-item" style={{ color: '#22c55e' }}>● Ready</span>
          <span className="legend-item" style={{ color: '#8b5cf6' }}>● Backup</span>
          <span className="legend-item" style={{ color: '#3b82f6' }}>● In Bot</span>
        </div>
      </main>

      {modalBattery && (
        <BatteryModal
          battery={modalBattery}
          chargeThresholdMin={settings.chargeThreshold}
          coolThresholdMin={settings.coolThreshold}
          viewOnly={settings.viewOnly}
          onClose={closeModal}
          onStartCharging={() => startCharging(modalBattery.id)}
          onMarkReady={() => markReady(modalBattery.id)}
          onCancelCharging={() => cancelCharging(modalBattery.id)}
          onPutInBot={() => handlePutInBot(modalBattery.id)}
          onRemoveFromBot={(depleted) => removeFromBot(modalBattery.id, depleted)}
          onMarkDepleted={() => { markDepleted(modalBattery.id); closeModal() }}
          onUpdateReadings={(data) => updateReadings(modalBattery.id, data)}
          onUpdateMeta={(data) => updateMeta(modalBattery.id, data)}
          onMarkBackup={() => markBackup(modalBattery.id)}
        />
      )}

      {settingsModal}
    </div>
  )
}
