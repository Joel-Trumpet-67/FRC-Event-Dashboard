// =============================================================================
// App.jsx
//
// EFFICIENCY NOTES:
//   [PERF-7]: The 10-second tick still re-renders the full tree. A future
//             improvement would be to move the tick into BatteryCard/BatteryModal
//             directly so only those components refresh elapsed time displays.
//
//   [PERF-8]: BatteryCard is wrapped in React.memo — only cards whose battery
//             data actually changed will re-render when the array updates.
// -----------------------------------------------------------------------------
// Root component. Owns all top-level state and wires every sub-component together.
//
// Responsibilities:
//   - Load and persist settings (team number, thresholds, battery count, sync)
//   - Load and persist match number
//   - Pass settings into useBatteries hook
//   - Delegate modal state to useModals hook
//   - Handle Firebase sync status display
//   - Decide whether to render normal pit view or field/view-only view
// =============================================================================

import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react'

// --- Components ---
import Header        from './components/Header'
import StatusBanner  from './components/StatusBanner'
import BatteryGrid   from './components/BatteryGrid'
import BatteryModal  from './components/BatteryModal'
import SettingsPanel from './components/SettingsPanel'
import FieldView     from './components/FieldView'

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

// =============================================================================
// SECTION 1 — DEFAULT SETTINGS
// -----------------------------------------------------------------------------
// Fallback values used on first launch (before anything is saved to localStorage).
// Merged with any previously saved settings at startup.
// =============================================================================
const DEFAULT_SETTINGS = {
  teamNumber:      '',    // FRC team number (display only)
  batteryCount:    6,     // how many batteries to track
  chargeThreshold: 60,    // minutes before a charging battery is considered "ready"
  coolThreshold:   15,    // minutes a battery should cool before re-charging
  syncCode:        '',    // shared Firebase room key — empty = local-only mode
  viewOnly:        false, // if true, hides all action buttons (field phone mode)
}

// =============================================================================
// SECTION 2 — URL FLAGS
// -----------------------------------------------------------------------------
// ?field in the URL immediately forces field/view-only mode, bypassing settings.
// Useful for a dedicated field-side phone that never needs pit controls.
// =============================================================================
const URL_FIELD_MODE = new URLSearchParams(window.location.search).has('field')

// =============================================================================
// COMPONENT
// =============================================================================
export default function App() {

  // ---------------------------------------------------------------------------
  // STATE — Settings
  // Merges saved settings from localStorage with defaults on first render.
  // ---------------------------------------------------------------------------
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(loadSettings() || {}),
  }))

  // ---------------------------------------------------------------------------
  // STATE — Match Number
  // Loaded from localStorage. User increments this before each match.
  // ---------------------------------------------------------------------------
  const [matchNumber, setMatchNumber] = useState(loadMatchNumber)

  // ---------------------------------------------------------------------------
  // STATE — Firebase Sync Status
  //   'local'  = no sync code or Firebase not configured
  //   'live'   = connected and receiving updates
  //   'error'  = sync code set but connection failed
  // ---------------------------------------------------------------------------
  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured && settings.syncCode ? 'error' : 'local'
  )

  // Callback passed to useBatteries — fires whenever Firebase connection changes
  const handleSyncStatus = useCallback((connected) => {
    setSyncStatus(connected ? 'live' : 'error')
  }, [])

  // ---------------------------------------------------------------------------
  // HOOK — Battery State + Actions
  // All battery data, sync, and status-transition actions.
  // ---------------------------------------------------------------------------
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
    markStandby,
  } = useBatteries(settings.batteryCount, settings.syncCode, handleSyncStatus)

  // ---------------------------------------------------------------------------
  // HOOK — Modal State
  // Manages battery detail modal and settings panel open/close + back button.
  // ---------------------------------------------------------------------------
  const {
    selectedBattery,
    setSelectedBattery,
    showSettings,
    setShowSettings,
    closeModal,
  } = useModals()

  // ==========================================================================
  // SECTION 3 — SIDE EFFECTS
  // ==========================================================================

  // 10-second tick — forces re-render so elapsed times stay current
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  // Persist settings to localStorage whenever they change
  useEffect(() => { saveSettings(settings) }, [settings])

  // Persist match number to localStorage whenever it changes
  useEffect(() => { saveMatchNumber(matchNumber) }, [matchNumber])

  // ---------------------------------------------------------------------------
  // EFFECT — Auto-reset cycles when Match Day advances
  // Every time the user increments Match Day (taps ›), cycle counts and
  // readings are wiped so stats start clean for the new day.
  // Decrementing (taps ‹) does NOT reset — prevents accidental data loss.
  // useRef tracks the previous value without causing an extra render.
  // ---------------------------------------------------------------------------
  const prevMatchNumber = useRef(matchNumber)
  useEffect(() => {
    if (matchNumber > prevMatchNumber.current) {
      resetStats()
    }
    prevMatchNumber.current = matchNumber
  }, [matchNumber]) // eslint-disable-line react-hooks/exhaustive-deps

  // Reset sync status to 'local' when syncCode is cleared
  useEffect(() => {
    if (!isFirebaseConfigured || !settings.syncCode) setSyncStatus('local')
  }, [settings.syncCode])

  // ==========================================================================
  // SECTION 4 — DERIVED STATE
  // Computed fresh each render from the current battery array + settings.
  // ==========================================================================

  // The battery the pit crew should grab next (memoized — PERF-3)
  const bestNext = useMemo(
    () => getBestNextBattery(batteries, settings.chargeThreshold),
    [batteries, settings.chargeThreshold]
  )

  // The battery currently installed in the robot, or null (memoized — PERF-3)
  const inBotBattery = useMemo(
    () => getInBotBattery(batteries),
    [batteries]
  )

  // The battery whose detail modal is open — kept in sync with the live array
  const modalBattery = selectedBattery
    ? batteries.find(b => b.id === selectedBattery.id) || null
    : null

  // ==========================================================================
  // SECTION 5 — EVENT HANDLERS
  // Thin wrappers combining hook actions with UI side-effects.
  // ==========================================================================

  // Save updated settings from SettingsPanel
  function handleSaveSettings(newSettings) { setSettings(newSettings) }

  // Reset all battery data (called from SettingsPanel danger zone)
  function handleResetAll(count) { resetAll(count); closeModal() }

  // Reset only cycle counts + readings — keeps labels, notes, status, history
  function handleResetStats() { resetStats() }

  // Put battery in bot AND close the detail modal
  function handlePutInBot(id) { putInBot(id); closeModal() }

  // Mark a battery as standby (does not close the modal)
  function handleMarkStandby(id) { markStandby(id) }

  // ==========================================================================
  // SECTION 6 — RENDER
  // Field mode = simplified read-only view (no action buttons).
  // Normal mode = full pit management UI.
  // ==========================================================================

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

  return (
    <div className="app">

      {/* Top bar: team number, match counter, sync indicator, settings button */}
      <Header
        teamNumber={settings.teamNumber}
        matchNumber={matchNumber}
        onMatchChange={setMatchNumber}
        onSettingsOpen={() => setShowSettings(true)}
        syncStatus={syncStatus}
      />

      <main className="main-content">

        {/* Banner: current in-bot battery + best next recommendation */}
        <StatusBanner
          batteries={batteries}
          inBotBattery={inBotBattery}
          bestNext={bestNext}
          chargeThresholdMin={settings.chargeThreshold}
          onBatteryClick={setSelectedBattery}
        />

        {/* Grid: one card per battery — tap to open detail modal */}
        <BatteryGrid
          batteries={batteries}
          bestNext={bestNext}
          chargeThresholdMin={settings.chargeThreshold}
          coolThresholdMin={settings.coolThreshold}
          onCardPress={setSelectedBattery}
        />

        {/* Colour legend */}
        <div className="legend">
          <span className="legend-item" style={{ color: '#ef4444' }}>● Depleted</span>
          <span className="legend-item" style={{ color: '#f59e0b' }}>● Charging</span>
          <span className="legend-item" style={{ color: '#f97316' }}>● Cooling</span>
          <span className="legend-item" style={{ color: '#22c55e' }}>● Ready</span>
          <span className="legend-item" style={{ color: '#8b5cf6' }}>● Standby</span>
          <span className="legend-item" style={{ color: '#3b82f6' }}>● In Bot</span>
        </div>
      </main>

      {/* Battery detail modal — only rendered when a card is tapped */}
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
          onMarkStandby={() => handleMarkStandby(modalBattery.id)}
        />
      )}

      {/* Settings panel — slides up when gear icon is tapped */}
      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onResetAll={handleResetAll}
          onResetStats={handleResetStats}
          onClose={() => setShowSettings(false)}
        />
      )}

    </div>
  )
}
