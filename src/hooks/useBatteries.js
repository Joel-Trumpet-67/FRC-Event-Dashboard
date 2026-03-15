import { useState, useEffect, useCallback } from 'react'
import { createBattery, addHistory, STATUS } from '../utils/batteryLogic'
import { loadBatteries, saveBatteries } from '../utils/storage'

const DEFAULT_COUNT = 6

function buildDefaultBatteries(count = DEFAULT_COUNT) {
  return Array.from({ length: count }, (_, i) => createBattery(i + 1))
}

/**
 * Central hook for all battery state management.
 * All mutations go through this hook so localStorage stays in sync.
 */
export function useBatteries(batteryCount = DEFAULT_COUNT) {
  const [batteries, setBatteriesRaw] = useState(() => {
    const saved = loadBatteries()
    if (saved && Array.isArray(saved) && saved.length === batteryCount) {
      return saved
    }
    return buildDefaultBatteries(batteryCount)
  })

  // Keep localStorage in sync whenever batteries change
  useEffect(() => {
    saveBatteries(batteries)
  }, [batteries])

  const setBatteries = useCallback((updater) => {
    setBatteriesRaw(prev => {
      const next = typeof updater === 'function' ? updater(prev) : updater
      return next
    })
  }, [])

  // Replace a single battery by id
  const updateBattery = useCallback((id, patch) => {
    setBatteries(prev =>
      prev.map(b => (b.id === id ? { ...b, ...patch } : b))
    )
  }, [setBatteries])

  // ─── Status transition actions ────────────────────────────────────────────

  /**
   * Begin charging. Valid from: depleted, cooling.
   */
  const startCharging = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const updated = {
        ...b,
        status: STATUS.CHARGING,
        chargeStartTime: Date.now(),
        chargeEndTime: null,
      }
      return addHistory(updated, 'Started charging', `Status was: ${b.status}`)
    }))
  }, [setBatteries])

  /**
   * Mark a battery as ready (fully charged). Valid from: charging.
   */
  const markReady = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const updated = {
        ...b,
        status: STATUS.READY,
        chargeEndTime: Date.now(),
      }
      return addHistory(updated, 'Marked ready', 'Charge complete')
    }))
  }, [setBatteries])

  /**
   * Cancel charging without marking ready. Returns to depleted.
   */
  const cancelCharging = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const updated = {
        ...b,
        status: STATUS.DEPLETED,
        chargeStartTime: null,
        chargeEndTime: null,
      }
      return addHistory(updated, 'Charge cancelled')
    }))
  }, [setBatteries])

  /**
   * Install battery into the robot. Valid from: ready.
   * Automatically removes any previously in-bot battery to cooling.
   */
  const putInBot = useCallback((id) => {
    setBatteries(prev => {
      const now = Date.now()
      return prev.map(b => {
        if (b.id === id) {
          // Installing this battery
          const updated = {
            ...b,
            status: STATUS.IN_BOT,
            putInBotTime: now,
            removedFromBotTime: null,
            cycleCount: b.cycleCount + 1,
          }
          return addHistory(updated, 'Put in bot', `Cycle #${updated.cycleCount}`)
        }
        if (b.status === STATUS.IN_BOT) {
          // Previous in-bot battery → cooling
          const updated = {
            ...b,
            status: STATUS.COOLING,
            removedFromBotTime: now,
            coolStartTime: now,
          }
          return addHistory(updated, 'Removed from bot (auto)', 'Replaced by new battery')
        }
        return b
      })
    })
  }, [setBatteries])

  /**
   * Remove battery from bot, sending it to cooling. Valid from: in_bot.
   * @param {boolean} depleted - if true, mark depleted instead of cooling
   */
  const removeFromBot = useCallback((id, depleted = false) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const now = Date.now()
      const nextStatus = depleted ? STATUS.DEPLETED : STATUS.COOLING
      const updated = {
        ...b,
        status: nextStatus,
        removedFromBotTime: now,
        coolStartTime: depleted ? null : now,
      }
      return addHistory(updated, depleted ? 'Removed from bot (depleted)' : 'Removed from bot (cooling)')
    }))
  }, [setBatteries])

  /**
   * Mark any battery as depleted (needs charging). Valid from any status.
   */
  const markDepleted = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const updated = {
        ...b,
        status: STATUS.DEPLETED,
        chargeStartTime: null,
        chargeEndTime: null,
        coolStartTime: null,
        putInBotTime: null,
        removedFromBotTime: null,
      }
      return addHistory(updated, 'Marked depleted')
    }))
  }, [setBatteries])

  /**
   * Update voltage reading and/or IR reading.
   */
  const updateReadings = useCallback((id, { voltage, internalResistance }) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const patch = {}
      if (voltage !== undefined) patch.voltage = voltage
      if (internalResistance !== undefined) patch.internalResistance = internalResistance
      const details = [
        voltage !== undefined ? `${voltage}V` : null,
        internalResistance !== undefined ? `${internalResistance}mΩ` : null,
      ].filter(Boolean).join(', ')
      return addHistory({ ...b, ...patch }, 'Readings updated', details)
    }))
  }, [setBatteries])

  /**
   * Update battery label or notes.
   */
  const updateMeta = useCallback((id, { label, notes }) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const patch = {}
      if (label !== undefined) patch.label = label
      if (notes !== undefined) patch.notes = notes
      return { ...b, ...patch }
    }))
  }, [setBatteries])

  /**
   * Reset all batteries to factory defaults (confirmation required in UI).
   */
  const resetAll = useCallback((newCount = batteryCount) => {
    setBatteries(buildDefaultBatteries(newCount))
  }, [setBatteries, batteryCount])

  return {
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
  }
}
