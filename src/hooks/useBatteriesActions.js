// =============================================================================
// useBatteriesActions.js
//
// EFFICIENCY NOTES:
//   [PERF-5]: All actions use prev.map() which creates a new array even when
//             only one battery changes. Consider immer (produce) for larger
//             battery counts if performance becomes a concern.
//
//   [PERF-6]: updateMeta intentionally does NOT call addHistory — label/notes
//             changes are silent. updateReadings DOES log to history.
//             Keep this distinction when adding new actions.
// -----------------------------------------------------------------------------
// All battery status-transition actions. Called internally by useBatteries.js.
//
// Every action here:
//   - Takes a battery ID
//   - Finds that battery in the array via setBatteries
//   - Returns a new battery object with the updated status + timestamps
//   - Appends an entry to the battery's history log via addHistory()
// =============================================================================

import { useCallback } from 'react'
import { addHistory, STATUS } from '../utils/batteryLogic'

// -----------------------------------------------------------------------------
// useBatteriesActions
//
// @param {Function} setBatteries — the wrapped setter from useBatteries.js
// @param {number}   batteryCount — current count, needed for resetAll default
// @param {Function} buildDefault — function(count) that builds a fresh array
//
// @returns {object} — all action functions, ready to be returned by useBatteries
// -----------------------------------------------------------------------------
export function useBatteriesActions(setBatteries, batteryCount, buildDefault) {

  // ---------------------------------------------------------------------------
  // startCharging — puts a battery on the charger, records the start time
  // ---------------------------------------------------------------------------
  const startCharging = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status:          STATUS.CHARGING,
        chargeStartTime: Date.now(),
        chargeEndTime:   null,
      }, 'Started charging', `Status was: ${b.status}`)
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // markReady — marks a battery as fully charged, records the end time
  // ---------------------------------------------------------------------------
  const markReady = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status:        STATUS.READY,
        chargeEndTime: Date.now(),
      }, 'Marked ready', 'Charge complete')
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // cancelCharging — cancels a charge in progress, reverts battery to depleted
  // ---------------------------------------------------------------------------
  const cancelCharging = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status:          STATUS.DEPLETED,
        chargeStartTime: null,
        chargeEndTime:   null,
      }, 'Charge cancelled')
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // putInBot — installs a battery into the robot, increments cycle count.
  //
  // Pass 1: move the target battery to IN_BOT, auto-cool the previous in-bot.
  // Pass 2: if no backup is already designated, find the best remaining READY
  //         battery and auto-promote it to BACKUP so the crew always has a
  //         reserve identified after every bot placement.
  //
  // "Best" = highest voltage → fewest cycles (same priority as USE NEXT).
  // ---------------------------------------------------------------------------
  const putInBot = useCallback((id) => {
    setBatteries(prev => {
      const now = Date.now()

      // Pass 1 — handle in-bot transition and auto-cooling of previous battery
      const afterInBot = prev.map(b => {
        if (b.id === id) {
          const updated = {
            ...b,
            status:             STATUS.IN_BOT,
            putInBotTime:       now,
            removedFromBotTime: null,
            cycleCount:         b.cycleCount + 1,
          }
          return addHistory(updated, 'Put in bot', `Cycle #${updated.cycleCount}`)
        }
        if (b.status === STATUS.IN_BOT) {
          return addHistory({
            ...b,
            status:             STATUS.COOLING,
            removedFromBotTime: now,
            coolStartTime:      now,
          }, 'Removed from bot (auto)', 'Replaced by new battery')
        }
        return b
      })

      // Pass 2 — auto-fill backup slot if it is currently empty
      const hasBackup = afterInBot.some(b => b.status === STATUS.BACKUP)
      if (hasBackup) return afterInBot

      // Find the best READY battery: highest voltage, then fewest cycles
      const readyBatteries = afterInBot.filter(b => b.status === STATUS.READY)
      if (readyBatteries.length === 0) return afterInBot

      const best = readyBatteries.sort((a, b) => {
        if (a.voltage !== null && b.voltage !== null) return b.voltage - a.voltage
        if (a.voltage !== null) return -1
        if (b.voltage !== null) return 1
        return a.cycleCount - b.cycleCount
      })[0]

      return afterInBot.map(b => {
        if (b.id !== best.id) return b
        return addHistory({ ...b, status: STATUS.BACKUP }, 'Auto-marked backup', 'Best available after bot placement')
      })
    })
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // removeFromBot — takes a battery out of the robot manually.
  // @param {boolean} depleted — if true, marks it depleted instead of cooling
  // ---------------------------------------------------------------------------
  const removeFromBot = useCallback((id, depleted = false) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const now = Date.now()
      return addHistory({
        ...b,
        status:             depleted ? STATUS.DEPLETED : STATUS.COOLING,
        removedFromBotTime: now,
        coolStartTime:      depleted ? null : now,
      }, depleted ? 'Removed from bot (depleted)' : 'Removed from bot (cooling)')
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // markDepleted — manually marks a battery as depleted, clears all timestamps
  // ---------------------------------------------------------------------------
  const markDepleted = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status:             STATUS.DEPLETED,
        chargeStartTime:    null,
        chargeEndTime:      null,
        coolStartTime:      null,
        putInBotTime:       null,
        removedFromBotTime: null,
      }, 'Marked depleted')
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // updateReadings — saves a new voltage and/or IR measurement.
  // Both fields are optional — only provided values are updated.
  // ---------------------------------------------------------------------------
  const updateReadings = useCallback((id, { voltage, internalResistance }) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const patch = {}
      if (voltage            !== undefined) patch.voltage            = voltage
      if (internalResistance !== undefined) patch.internalResistance = internalResistance
      const details = [
        voltage            !== undefined ? `${voltage}V`      : null,
        internalResistance !== undefined ? `${internalResistance}mΩ` : null,
      ].filter(Boolean).join(', ')
      return addHistory({ ...b, ...patch }, 'Readings updated', details)
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // updateMeta — updates the display label and/or notes. Does NOT log to history.
  // ---------------------------------------------------------------------------
  const updateMeta = useCallback((id, { label, notes }) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const patch = {}
      if (label !== undefined) patch.label = label
      if (notes !== undefined) patch.notes = notes
      return { ...b, ...patch }
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // resetAll — wipes everything and rebuilds the array from scratch.
  // Labels, notes, readings, history, status — all gone.
  // @param {number} newCount — defaults to current batteryCount from settings
  // ---------------------------------------------------------------------------
  const resetAll = useCallback((newCount = batteryCount) => {
    setBatteries(buildDefault(newCount))
  }, [setBatteries, batteryCount, buildDefault])

  // ---------------------------------------------------------------------------
  // resetStats — resets ONLY cycle counts and battery readings (voltage + IR).
  // Keeps labels, notes, current status, timestamps, and history intact.
  // Use this between events to start fresh stats without losing battery names.
  // ---------------------------------------------------------------------------
  const resetStats = useCallback(() => {
    setBatteries(prev => prev.map(b => addHistory({
      ...b,
      cycleCount:         0,
      voltage:            null,
      internalResistance: null,
    }, 'Stats reset', 'Cycles and readings cleared')))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // markBackup — moves a battery to BACKUP (charged but held in reserve).
  // Backup batteries are excluded from the "USE NEXT" recommendation so
  // the crew has explicit control over when this reserve battery gets used.
  // Can be called from READY. To return to use, call markReady.
  //
  // If another battery is already BACKUP it is displaced — sent straight to
  // CHARGING so it gets a top-up rather than sitting idle at READY.
  // ---------------------------------------------------------------------------
  const markBackup = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      // Displace any existing backup → send it to charging for a top-up
      if (b.id !== id && b.status === STATUS.BACKUP) {
        return addHistory({
          ...b,
          status:          STATUS.CHARGING,
          chargeStartTime: Date.now(),
          chargeEndTime:   null,
        }, 'Backup displaced → charging', 'Replaced by new backup')
      }
      if (b.id !== id) return b
      return addHistory({ ...b, status: STATUS.BACKUP }, 'Marked backup', 'Held in reserve')
    }))
  }, [setBatteries])

  // ---------------------------------------------------------------------------
  // Return all actions so useBatteries.js can expose them to components
  // ---------------------------------------------------------------------------
  return {
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
  }
}
