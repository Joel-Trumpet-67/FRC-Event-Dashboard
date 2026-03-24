// =============================================================================
// batteryFactory.js
// -----------------------------------------------------------------------------
// Functions that CREATE or MUTATE battery objects.
// All battery objects in the app share the same shape — it is defined here
// in createBattery(). If you add a new field to a battery, add it here.
// =============================================================================

import { STATUS } from './batteryConstants'

// -----------------------------------------------------------------------------
// createBattery — builds a fresh battery object with all default values.
//
// @param {number} id — unique numeric ID (1-based, matches position in the array)
//
// Called when:
//   - The app loads for the first time (no saved data)
//   - The user increases the battery count in settings
//   - The user hits "Reset All"
// -----------------------------------------------------------------------------
export function createBattery(id) {
  return {
    id,
    label:               `Battery ${id}`, // display name — user can rename this
    status:              STATUS.DEPLETED,  // every new battery starts as depleted

    // Timestamps — all null until the relevant action happens
    chargeStartTime:     null,  // when charging began
    chargeEndTime:       null,  // when marked ready (charge complete)
    putInBotTime:        null,  // when put into the robot
    removedFromBotTime:  null,  // when removed from the robot
    coolStartTime:       null,  // when cooling period began

    // Readings — filled in by the user via the battery detail modal
    voltage:             null,  // last measured voltage (V)
    internalResistance:  null,  // last measured internal resistance (mΩ)

    // Metadata
    cycleCount:          0,     // number of times this battery has been used in the bot
    notes:               '',    // free-text notes field

    // History log — array of { action, timestamp, details } objects
    // Capped at 50 entries. See addHistory() below.
    history:             [],
  }
}

// -----------------------------------------------------------------------------
// addHistory — appends a new event to a battery's history log.
//
// @param {object} battery — the battery to update (not mutated — returns a copy)
// @param {string} action  — short description, e.g. "Started charging"
// @param {string} details — optional extra info, e.g. "Cycle #3"
//
// Keeps only the last 50 events to prevent the history growing forever.
// New events are prepended (newest first).
//
// ⚠️  Firebase can convert empty arrays to null — the `|| []` guard handles that.
// -----------------------------------------------------------------------------
export function addHistory(battery, action, details = '') {
  return {
    ...battery,
    history: [
      { action, timestamp: Date.now(), details },
      ...(battery.history || []),
    ].slice(0, 50),
  }
}
