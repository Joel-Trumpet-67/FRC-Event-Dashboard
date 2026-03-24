// =============================================================================
// batteryRecommend.js
// -----------------------------------------------------------------------------
// Functions that ANALYSE the battery array and make recommendations.
// Used by App.jsx and StatusBanner to guide the pit crew on which battery
// to use next and how long until the next one is ready.
// =============================================================================

import { STATUS } from './batteryConstants'

// -----------------------------------------------------------------------------
// getBestNextBattery — returns the single best battery to grab next.
//
// Priority order:
//   1. Batteries explicitly marked 'ready'
//   2. Batteries still 'charging' but past the charge threshold (treated as ready)
//
// Within each tier, prefers:
//   - Higher voltage reading (if available)
//   - Longer time on charge (more likely fully charged)
//   - Fewer cycles (healthier, less worn battery)
//
// Returns null if no suitable battery is available.
//
// @param {Array}  batteries
// @param {number} chargeThresholdMin — minutes of charge before battery is "ready"
// -----------------------------------------------------------------------------
export function getBestNextBattery(batteries, chargeThresholdMin = 60) {
  const thresholdMs = chargeThresholdMin * 60 * 1000
  const now = Date.now()

  // Step 1: filter to only usable batteries.
  // STANDBY batteries are intentionally excluded — they are held in reserve
  // and should only be used when the crew explicitly chooses them.
  const candidates = batteries.filter(b => {
    if (b.status === STATUS.READY) return true
    if (b.status === STATUS.CHARGING && b.chargeStartTime) {
      return now - b.chargeStartTime >= thresholdMs
    }
    return false
  })

  if (candidates.length === 0) return null

  // Step 2: sort by priority and return the best one
  return candidates.sort((a, b) => {
    // Tier 1: explicitly ready beats still-charging
    if (a.status === STATUS.READY && b.status !== STATUS.READY) return -1
    if (b.status === STATUS.READY && a.status !== STATUS.READY) return 1

    // Tier 2: higher voltage is better
    if (a.voltage !== null && b.voltage !== null && a.voltage !== b.voltage) {
      return b.voltage - a.voltage
    }
    if (a.voltage !== null && b.voltage === null) return -1
    if (b.voltage !== null && a.voltage === null) return 1

    // Tier 3: longer charge time = more likely fully charged
    const aElapsed = a.chargeStartTime ? now - a.chargeStartTime : 0
    const bElapsed = b.chargeStartTime ? now - b.chargeStartTime : 0
    if (Math.abs(aElapsed - bElapsed) > 5 * 60 * 1000) {
      return bElapsed - aElapsed
    }

    // Tier 4: fewer cycles = healthier battery
    return a.cycleCount - b.cycleCount
  })[0]
}

// -----------------------------------------------------------------------------
// getInBotBattery — returns the battery currently in the robot, or null.
// Used by StatusBanner and App.jsx to highlight the active battery.
//
// @param {Array} batteries
// -----------------------------------------------------------------------------
export function getInBotBattery(batteries) {
  return batteries.find(b => b.status === STATUS.IN_BOT) || null
}

// -----------------------------------------------------------------------------
// getNextReadyEta — returns milliseconds until the soonest charging battery
// is expected to be ready. Returns null if nothing is charging.
//
// Used by StatusBanner to show a countdown to the crew.
//
// @param {Array}  batteries
// @param {number} chargeThresholdMin
// -----------------------------------------------------------------------------
export function getNextReadyEta(batteries, chargeThresholdMin = 60) {
  const thresholdMs = chargeThresholdMin * 60 * 1000
  const now = Date.now()

  const charging = batteries.filter(b => b.status === STATUS.CHARGING && b.chargeStartTime)
  if (charging.length === 0) return null

  const remaining = charging.map(b => {
    const elapsed = now - b.chargeStartTime
    return Math.max(0, thresholdMs - elapsed)
  })

  return Math.min(...remaining)
}
