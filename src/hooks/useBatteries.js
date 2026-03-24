// =============================================================================
// useBatteries.js
//
// EFFICIENCY NOTES:
//   [PERF-3]: bestNext and inBotBattery are memoized with useMemo in App.jsx —
//             they only recompute when batteries or chargeThreshold actually change.
//
//   [PERF-4]: The resize effect uses a useRef to skip running when batteryCount
//             hasn't actually changed, avoiding an unnecessary setBatteriesRaw call.
// -----------------------------------------------------------------------------
// Central hook for all battery state. Composes the sync and actions sub-hooks.
//
// Sub-files:
//   useBatteriesSync.js    — Firebase listener + localStorage persistence
//   useBatteriesActions.js — all status-transition actions (startCharging, etc.)
//
// This file owns:
//   - The batteries state array (useState)
//   - The isRemoteUpdate ref (Firebase echo guard)
//   - The internal setBatteries wrapper
//   - The resize effect (adjusts array length when batteryCount setting changes)
// =============================================================================

import { useState, useEffect, useCallback, useRef } from 'react'
import { createBattery } from '../utils/batteryLogic'
import { loadBatteries, saveBatteries } from '../utils/storage'
import { useBatteriesSync } from './useBatteriesSync'
import { useBatteriesActions } from './useBatteriesActions'

// -----------------------------------------------------------------------------
// CONSTANTS
// -----------------------------------------------------------------------------

// Default number of batteries if none specified via settings
const DEFAULT_COUNT = 6

// -----------------------------------------------------------------------------
// HELPERS
// Builds a fresh array of batteries with sequential IDs (1, 2, 3 … count).
// Passed down to useBatteriesActions so resetAll can use it too.
// -----------------------------------------------------------------------------
function buildDefaultBatteries(count = DEFAULT_COUNT) {
  return Array.from({ length: count }, (_, i) => createBattery(i + 1))
}

// =============================================================================
// HOOK: useBatteries
// -----------------------------------------------------------------------------
// @param {number}   batteryCount  — how many batteries to track (from settings)
// @param {string}   syncCode      — Firebase room key, empty = local-only mode
// @param {Function} onSyncStatus  — callback(true/false) for connection status
// =============================================================================
export function useBatteries(batteryCount = DEFAULT_COUNT, syncCode = '', onSyncStatus = null) {

  // ---------------------------------------------------------------------------
  // STATE — Battery Array
  // On first mount: load from localStorage if the saved count matches.
  // Otherwise build a fresh default array.
  // (useState only runs this initialiser once — the resize effect below handles
  //  count changes after mount.)
  // ---------------------------------------------------------------------------
  const [batteries, setBatteriesRaw] = useState(() => {
    const saved = loadBatteries()
    if (saved && Array.isArray(saved) && saved.length === batteryCount) {
      return saved
    }
    return buildDefaultBatteries(batteryCount)
  })

  // ---------------------------------------------------------------------------
  // REF — Remote Update Guard
  // Set to true by useBatteriesSync when a change arrives FROM Firebase.
  // Prevents useBatteriesSync from echoing that change back up to Firebase.
  // ---------------------------------------------------------------------------
  const isRemoteUpdate = useRef(false)

  // ---------------------------------------------------------------------------
  // SYNC — Firebase + localStorage
  // Delegates to useBatteriesSync (see useBatteriesSync.js)
  // ---------------------------------------------------------------------------
  useBatteriesSync(
    batteries,
    setBatteriesRaw,
    syncCode,
    onSyncStatus,
    isRemoteUpdate,
    saveBatteries,
  )

  // Tracks the previous batteryCount so the resize effect only runs when
  // the count genuinely changes, not on every render (PERF-4).
  const prevCountRef = useRef(batteryCount)

  // ---------------------------------------------------------------------------
  // EFFECT — Resize Battery Array When batteryCount Setting Changes
  // When the user changes the battery count in Settings:
  //   - Increasing: appends new blank batteries to fill the extra slots
  //   - Decreasing: trims batteries from the end of the array
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (prevCountRef.current === batteryCount) return
    prevCountRef.current = batteryCount

    setBatteriesRaw(prev => {
      if (prev.length < batteryCount) {
        const extras = Array.from(
          { length: batteryCount - prev.length },
          (_, i) => createBattery(prev.length + i + 1)
        )
        return [...prev, ...extras]
      }
      // Trim excess batteries from the end
      return prev.slice(0, batteryCount)
    })
  }, [batteryCount])

  // ---------------------------------------------------------------------------
  // INTERNAL SETTER — setBatteries
  // Wraps setBatteriesRaw to support both direct values and updater functions.
  // All action callbacks in useBatteriesActions use this instead of raw setter.
  // ---------------------------------------------------------------------------
  const setBatteries = useCallback((updater) => {
    setBatteriesRaw(prev =>
      typeof updater === 'function' ? updater(prev) : updater
    )
  }, [])

  // ---------------------------------------------------------------------------
  // ACTIONS — Status Transitions
  // Delegates to useBatteriesActions (see useBatteriesActions.js)
  // ---------------------------------------------------------------------------
  const actions = useBatteriesActions(setBatteries, batteryCount, buildDefaultBatteries)

  // ---------------------------------------------------------------------------
  // RETURN — Expose state and all actions to consuming components
  // ---------------------------------------------------------------------------
  return {
    batteries,
    ...actions,
  }
}
