// =============================================================================
// useBatteriesSync.js
//
// EFFICIENCY TODOs:
//   TODO [PERF-1]: Replace JSON.stringify comparison with a faster deep-equal
//                  library (e.g. fast-deep-equal) — JSON.stringify is slow on
//                  large arrays and runs on every Firebase snapshot.
//
//   TODO [PERF-2]: Debounce the Firebase push (set()) so rapid local changes
//                  (e.g. user tapping quickly) batch into one write instead of
//                  hammering the database on every state update.
//                  Use a useRef timer: clear + reset on each batteries change,
//                  only call set() after 300–500ms of no changes.
// -----------------------------------------------------------------------------
// Handles ALL Firebase real-time sync and localStorage persistence for the
// batteries array. Called internally by useBatteries.js — not used directly
// by components.
//
// Responsibilities:
//   - Subscribe to Firebase when a syncCode is provided
//   - Write incoming Firebase data into local state (avoiding echo loops)
//   - Save batteries to localStorage on every change
//   - Push local changes up to Firebase (unless the change came FROM Firebase)
// =============================================================================

import { useEffect } from 'react'
import { ref, set, onValue, off } from 'firebase/database'
import { db, isFirebaseConfigured } from '../firebase'

// -----------------------------------------------------------------------------
// useBatteriesSync
//
// @param {Array}    batteries       — current batteries state (read-only here)
// @param {Function} setBatteriesRaw — raw React state setter for batteries
// @param {string}   syncCode        — Firebase room key, e.g. "FRC1234"
// @param {Function} onSyncStatus    — callback(true/false) for connection state
// @param {object}   isRemoteUpdate  — useRef flag: true when change came from Firebase
// @param {Function} saveBatteries   — saves batteries array to localStorage
// -----------------------------------------------------------------------------
export function useBatteriesSync(
  batteries,
  setBatteriesRaw,
  syncCode,
  onSyncStatus,
  isRemoteUpdate,
  saveBatteries,
) {

  // ---------------------------------------------------------------------------
  // EFFECT — Firebase Real-Time Listener
  // Subscribes to /rooms/{syncCode}/batteries whenever syncCode changes.
  // Incoming data from other devices overwrites local state.
  // Cleans up the old listener before creating a new one.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!isFirebaseConfigured || !syncCode) {
      onSyncStatus?.(false)
      return
    }

    const battRef = ref(db, `rooms/${syncCode}/batteries`)

    onValue(
      battRef,
      (snapshot) => {
        onSyncStatus?.(true)
        const remoteData = snapshot.val()
        if (!remoteData || !Array.isArray(remoteData)) return

        // Firebase converts empty arrays [] to null — restore them on every battery
        const sanitized = remoteData.map(b => ({
          ...b,
          history: Array.isArray(b.history) ? b.history : [],
        }))

        // Only update if data actually differs — avoids a re-render from our own echo
        setBatteriesRaw(current => {
          if (JSON.stringify(current) === JSON.stringify(sanitized)) return current
          isRemoteUpdate.current = true  // flag: this change came from Firebase
          return sanitized
        })
      },
      (error) => {
        console.warn('Firebase sync error:', error)
        onSyncStatus?.(false)
      }
    )

    // Cleanup: unsubscribe when syncCode changes or component unmounts
    return () => off(battRef)
  }, [syncCode]) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // EFFECT — Persist to localStorage + Push to Firebase
  // Runs every time the batteries array changes.
  // Always saves to localStorage as an offline backup.
  // Skips pushing to Firebase if the change came FROM Firebase (avoids echo loop).
  // ---------------------------------------------------------------------------
  useEffect(() => {
    saveBatteries(batteries)

    // If this change originated from Firebase, don't send it back
    if (isRemoteUpdate.current) {
      isRemoteUpdate.current = false
      return
    }

    if (!isFirebaseConfigured || !syncCode) return

    const battRef = ref(db, `rooms/${syncCode}/batteries`)
    set(battRef, batteries).catch(err => console.warn('Firebase write failed:', err))
  }, [batteries, syncCode]) // eslint-disable-line react-hooks/exhaustive-deps
}
