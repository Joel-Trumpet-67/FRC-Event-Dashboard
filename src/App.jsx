import React, { useState, useEffect, useCallback } from 'react'
import Header from './components/Header'
import StatusBanner from './components/StatusBanner'
import BatteryGrid from './components/BatteryGrid'
import BatteryModal from './components/BatteryModal'
import SettingsPanel from './components/SettingsPanel'
import { useBatteries } from './hooks/useBatteries'
import { getBestNextBattery, getInBotBattery } from './utils/batteryLogic'
import {
  loadSettings,
  saveSettings,
  loadMatchNumber,
  saveMatchNumber,
} from './utils/storage'
import { isFirebaseConfigured } from './firebase'

const DEFAULT_SETTINGS = {
  teamNumber: '',
  batteryCount: 6,
  chargeThreshold: 60,  // minutes
  coolThreshold: 15,    // minutes
  syncCode: '',         // Firebase room key — empty = local only
  viewOnly: false,      // disables all action buttons (field / drive coach phone)
}

export default function App() {
  // ─── Global settings ──────────────────────────────────────────────────────
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(loadSettings() || {}),
  }))

  const [matchNumber, setMatchNumber] = useState(loadMatchNumber)

  // ─── Sync status: 'live' | 'local' | 'error' ──────────────────────────────
  const [syncStatus, setSyncStatus] = useState(
    isFirebaseConfigured && settings.syncCode ? 'error' : 'local'
  )

  const handleSyncStatus = useCallback((connected) => {
    setSyncStatus(connected ? 'live' : 'error')
  }, [])

  // ─── Battery state (hook) ─────────────────────────────────────────────────
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
  } = useBatteries(settings.batteryCount, settings.syncCode, handleSyncStatus)

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [selectedBattery, setSelectedBattery] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // Push a history entry when a modal opens so hardware back button closes it
  useEffect(() => {
    if (selectedBattery || showSettings) {
      window.history.pushState({ modal: true }, '')
    }
  }, [selectedBattery, showSettings])

  // Handle hardware back button (Android) and browser back gesture (iOS swipe)
  useEffect(() => {
    function handlePopState() {
      if (selectedBattery) { setSelectedBattery(null); return }
      if (showSettings) { setShowSettings(false); return }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedBattery, showSettings])

  // Tick every 10s to refresh timer displays
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  // Persist settings
  useEffect(() => { saveSettings(settings) }, [settings])

  // Persist match number
  useEffect(() => { saveMatchNumber(matchNumber) }, [matchNumber])

  // Reset sync status when syncCode is cleared
  useEffect(() => {
    if (!isFirebaseConfigured || !settings.syncCode) setSyncStatus('local')
  }, [settings.syncCode])

  // Recompute recommendation on every tick or battery change
  const bestNext = getBestNextBattery(batteries, settings.chargeThreshold)
  const inBotBattery = getInBotBattery(batteries)

  // Keep modal data fresh from batteries array
  const modalBattery = selectedBattery
    ? batteries.find(b => b.id === selectedBattery.id) || null
    : null

  // ─── Action handlers ───────────────────────────────────────────────────────
  function closeModal() { setSelectedBattery(null) }

  function handleSaveSettings(newSettings) { setSettings(newSettings) }

  function handleResetAll(count) { resetAll(count); setSelectedBattery(null) }

  function handlePutInBot(id) { putInBot(id); closeModal() }

  return (
    <div className="app">
      <Header
        teamNumber={settings.teamNumber}
        matchNumber={matchNumber}
        onMatchChange={setMatchNumber}
        onSettingsOpen={() => setShowSettings(true)}
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
        />
      )}

      {showSettings && (
        <SettingsPanel
          settings={settings}
          onSave={handleSaveSettings}
          onResetAll={handleResetAll}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  )
}
