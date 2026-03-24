import { useState, useEffect, useCallback, useRef } from 'react'
import { ref, set, onValue, off } from 'firebase/database'
import { createBattery, addHistory, STATUS } from '../utils/batteryLogic'
import { loadBatteries, saveBatteries } from '../utils/storage'
import { db, isFirebaseConfigured } from '../firebase'

const DEFAULT_COUNT = 6

function buildDefaultBatteries(count = DEFAULT_COUNT) {
  return Array.from({ length: count }, (_, i) => createBattery(i + 1))
}

/**
 * Central hook for all battery state management.
 *
 * When syncCode is provided AND Firebase is configured:
 *   - Listens to /rooms/{syncCode}/batteries in Firebase RTDB
 *   - Pushes every local state change to Firebase
 *   - All other devices with the same syncCode see changes in ~200ms
 *
 * When syncCode is empty or Firebase is not configured:
 *   - Falls back to localStorage only (original behavior)
 *
 * @param {number}   batteryCount
 * @param {string}   syncCode      - shared room key, e.g. "FRC1234"
 * @param {Function} onSyncStatus  - called with true (connected) / false
 */
export function useBatteries(batteryCount = DEFAULT_COUNT, syncCode = '', onSyncStatus = null) {
  const [batteries, setBatteriesRaw] = useState(() => {
    const saved = loadBatteries()
    if (saved && Array.isArray(saved) && saved.length === batteryCount) {
      return saved
    }
    return buildDefaultBatteries(batteryCount)
  })

  // Track whether the most recent state change came from a remote Firebase update.
  // Prevents echoing remote updates back to Firebase (infinite loop guard).
  const isRemoteUpdate = useRef(false)

  // ─── Firebase real-time listener ───────────────────────────────────────────
  useEffect(() => {
    if (!isFirebaseConfigured || !syncCode) {
      onSyncStatus?.(false)
      return
    }

    const battRef = ref(db, `rooms/${syncCode}/batteries`)

    const unsubscribe = onValue(
      battRef,
      (snapshot) => {
        onSyncStatus?.(true)
        const remoteData = snapshot.val()
        if (!remoteData || !Array.isArray(remoteData)) return

        // Firebase converts empty arrays [] to null — restore them
        const sanitized = remoteData.map(b => ({
          ...b,
          history: Array.isArray(b.history) ? b.history : [],
        }))

        // Only update if data actually differs (avoids re-render on our own echo)
        setBatteriesRaw(current => {
          if (JSON.stringify(current) === JSON.stringify(sanitized)) return current
          isRemoteUpdate.current = true
          return sanitized
        })
      },
      (error) => {
        console.warn('Firebase sync error:', error)
        onSyncStatus?.(false)
      }
    )

    return () => off(battRef)
  }, [syncCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Persist to localStorage + push to Firebase ────────────────────────────
  useEffect(() => {
    saveBatteries(batteries)

    // If this came from Firebase, don't echo it back
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }

    if (!isFirebaseConfigured || !syncCode) return

    const battRef = ref(db, `rooms/${syncCode}/batteries`)
    set(battRef, batteries).catch(err => console.warn('Firebase write failed:', err))
  }, [batteries, syncCode])

  // ─── Resize batteries array when batteryCount changes ─────────────────────
  useEffect(() => {
    setBatteriesRaw(prev => {
      if (prev.length === batteryCount) return prev
      if (prev.length < batteryCount) {
        // Add new batteries for the extra slots
        const extras = Array.from(
          { length: batteryCount - prev.length },
          (_, i) => createBattery(prev.length + i + 1)
        )
        return [...prev, ...extras]
      }
      // Trim excess batteries
      return prev.slice(0, batteryCount)
    })
  }, [batteryCount])

  // ─── Internal setter ───────────────────────────────────────────────────────
  const setBatteries = useCallback((updater) => {
    setBatteriesRaw(prev =>
      typeof updater === 'function' ? updater(prev) : updater
    )
  }, [])

  // ─── Status transition actions ─────────────────────────────────────────────

  const startCharging = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status: STATUS.CHARGING,
        chargeStartTime: Date.now(),
        chargeEndTime: null,
      }, 'Started charging', `Status was: ${b.status}`)
    }))
  }, [setBatteries])

  const markReady = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status: STATUS.READY,
        chargeEndTime: Date.now(),
      }, 'Marked ready', 'Charge complete')
    }))
  }, [setBatteries])

  const cancelCharging = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status: STATUS.DEPLETED,
        chargeStartTime: null,
        chargeEndTime: null,
      }, 'Charge cancelled')
    }))
  }, [setBatteries])

  const putInBot = useCallback((id) => {
    setBatteries(prev => {
      const now = Date.now()
      return prev.map(b => {
        if (b.id === id) {
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
          return addHistory({
            ...b,
            status: STATUS.COOLING,
            removedFromBotTime: now,
            coolStartTime: now,
          }, 'Removed from bot (auto)', 'Replaced by new battery')
        }
        return b
      })
    })
  }, [setBatteries])

  const removeFromBot = useCallback((id, depleted = false) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const now = Date.now()
      return addHistory({
        ...b,
        status: depleted ? STATUS.DEPLETED : STATUS.COOLING,
        removedFromBotTime: now,
        coolStartTime: depleted ? null : now,
      }, depleted ? 'Removed from bot (depleted)' : 'Removed from bot (cooling)')
    }))
  }, [setBatteries])

  const markDepleted = useCallback((id) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      return addHistory({
        ...b,
        status: STATUS.DEPLETED,
        chargeStartTime: null,
        chargeEndTime: null,
        coolStartTime: null,
        putInBotTime: null,
        removedFromBotTime: null,
      }, 'Marked depleted')
    }))
  }, [setBatteries])

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

  const updateMeta = useCallback((id, { label, notes }) => {
    setBatteries(prev => prev.map(b => {
      if (b.id !== id) return b
      const patch = {}
      if (label !== undefined) patch.label = label
      if (notes !== undefined) patch.notes = notes
      return { ...b, ...patch }
    }))
  }, [setBatteries])

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
