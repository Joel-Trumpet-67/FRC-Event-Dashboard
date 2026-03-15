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

const DEFAULT_SETTINGS = {
  teamNumber: '',
  batteryCount: 6,
  chargeThreshold: 60,  // minutes
  coolThreshold: 15,    // minutes
}

export default function App() {
  // ─── Global settings ──────────────────────────────────────────────────────
  const [settings, setSettings] = useState(() => ({
    ...DEFAULT_SETTINGS,
    ...(loadSettings() || {}),
  }))

  const [matchNumber, setMatchNumber] = useState(loadMatchNumber)

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
  } = useBatteries(settings.batteryCount)

  // ─── UI state ─────────────────────────────────────────────────────────────
  const [selectedBattery, setSelectedBattery] = useState(null)
  const [showSettings, setShowSettings] = useState(false)

  // Tick every 10s to refresh timer displays
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  // Persist settings
  useEffect(() => {
    saveSettings(settings)
  }, [settings])

  // Persist match number
  useEffect(() => {
    saveMatchNumber(matchNumber)
  }, [matchNumber])

  // Recompute recommendation on every tick or battery change
  const bestNext = getBestNextBattery(batteries, settings.chargeThreshold)
  const inBotBattery = getInBotBattery(batteries)

  // ─── When selected battery changes externally (e.g. after action) ─────────
  // Keep modal data fresh by deriving from batteries array
  const modalBattery = selectedBattery
    ? batteries.find(b => b.id === selectedBattery.id) || null
    : null

  // ─── Action handlers (bridge hook → modal) ────────────────────────────────
  function closeModal() {
    setSelectedBattery(null)
  }

  function handleSaveSettings(newSettings) {
    const countChanged = newSettings.batteryCount !== settings.batteryCount
    setSettings(newSettings)
    if (countChanged) {
      // resetAll will rebuild the battery list with the new count
      // (user confirmed via the reset button in settings)
    }
  }

  function handleResetAll(count) {
    resetAll(count)
    setSelectedBattery(null)
  }

  // Wrap each action so the modal automatically closes when in_bot is set
  // (pit worker shouldn't keep looking at the modal after putting battery in)
  function handlePutInBot(id) {
    putInBot(id)
    closeModal()
  }

  return (
    <div className="app">
      <Header
        teamNumber={settings.teamNumber}
        matchNumber={matchNumber}
        onMatchChange={setMatchNumber}
        onSettingsOpen={() => setShowSettings(true)}
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

        {/* Quick-glance legend */}
        <div className="legend">
          <span className="legend-item" style={{ color: '#ef4444' }}>● Depleted</span>
          <span className="legend-item" style={{ color: '#f59e0b' }}>● Charging</span>
          <span className="legend-item" style={{ color: '#f97316' }}>● Cooling</span>
          <span className="legend-item" style={{ color: '#22c55e' }}>● Ready</span>
          <span className="legend-item" style={{ color: '#3b82f6' }}>● In Bot</span>
        </div>
      </main>

      {/* Battery detail modal */}
      {modalBattery && (
        <BatteryModal
          battery={modalBattery}
          chargeThresholdMin={settings.chargeThreshold}
          coolThresholdMin={settings.coolThreshold}
          onClose={closeModal}
          onStartCharging={() => { startCharging(modalBattery.id) }}
          onMarkReady={() => { markReady(modalBattery.id) }}
          onCancelCharging={() => { cancelCharging(modalBattery.id) }}
          onPutInBot={() => handlePutInBot(modalBattery.id)}
          onRemoveFromBot={(depleted) => { removeFromBot(modalBattery.id, depleted) }}
          onMarkDepleted={() => { markDepleted(modalBattery.id); closeModal() }}
          onUpdateReadings={(data) => updateReadings(modalBattery.id, data)}
          onUpdateMeta={(data) => updateMeta(modalBattery.id, data)}
        />
      )}

      {/* Settings panel */}
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
