/**
 * Core battery recommendation and status logic for FRC pit management.
 *
 * Battery statuses:
 *   depleted  – needs charging, not on charger
 *   charging  – on charger, timestamp recorded
 *   cooling   – just pulled from bot/charger, needs to cool before re-charging
 *   ready     – fully charged and available
 *   in_bot    – currently installed in the robot
 */

export const STATUS = {
  DEPLETED: 'depleted',
  CHARGING: 'charging',
  COOLING: 'cooling',
  READY: 'ready',
  IN_BOT: 'in_bot',
}

export const STATUS_LABEL = {
  depleted: 'Depleted',
  charging: 'Charging',
  cooling: 'Cooling',
  ready: 'Ready',
  in_bot: 'In Bot',
}

export const STATUS_COLOR = {
  depleted: '#ef4444',   // red
  charging: '#f59e0b',   // amber
  cooling: '#f97316',    // orange
  ready: '#22c55e',      // green
  in_bot: '#3b82f6',     // blue
}

export const STATUS_BG = {
  depleted: '#450a0a',
  charging: '#451a03',
  cooling: '#431407',
  ready: '#052e16',
  in_bot: '#172554',
}

/**
 * Create a fresh battery object.
 */
export function createBattery(id) {
  return {
    id,
    label: `Battery ${id}`,
    status: STATUS.DEPLETED,
    chargeStartTime: null,    // when charging began
    chargeEndTime: null,      // when marked ready
    putInBotTime: null,       // when put into robot
    removedFromBotTime: null, // when removed from robot
    coolStartTime: null,      // when cooling began
    voltage: null,            // last measured voltage (V)
    internalResistance: null, // last measured IR (mΩ)
    cycleCount: 0,            // number of full charge/use cycles
    notes: '',
    history: [],              // [{action, timestamp, details}]
  }
}

/**
 * Append an event to a battery's history log.
 */
export function addHistory(battery, action, details = '') {
  return {
    ...battery,
    history: [
      { action, timestamp: Date.now(), details },
      ...battery.history,
    ].slice(0, 50), // keep last 50 events
  }
}

/**
 * Determine the single best battery to use next.
 *
 * Priority order:
 *  1. Batteries marked 'ready'
 *  2. Batteries 'charging' past the threshold (treated as ready)
 *
 * Within each tier, prefer:
 *  - Higher voltage (if recorded)
 *  - Longer charge time (more likely fully charged)
 *  - Lower cycle count (fresher battery)
 *
 * Returns null if no suitable battery is found.
 *
 * @param {Array}  batteries
 * @param {number} chargeThresholdMin  - minutes before charging battery is "ready"
 */
export function getBestNextBattery(batteries, chargeThresholdMin = 60) {
  const thresholdMs = chargeThresholdMin * 60 * 1000
  const now = Date.now()

  const candidates = batteries.filter(b => {
    if (b.status === STATUS.READY) return true
    if (b.status === STATUS.CHARGING && b.chargeStartTime) {
      return now - b.chargeStartTime >= thresholdMs
    }
    return false
  })

  if (candidates.length === 0) return null

  return candidates.sort((a, b) => {
    // Tier 1: prefer explicitly 'ready' over 'charging'
    if (a.status === STATUS.READY && b.status !== STATUS.READY) return -1
    if (b.status === STATUS.READY && a.status !== STATUS.READY) return 1

    // Tier 2: prefer higher voltage
    if (a.voltage !== null && b.voltage !== null && a.voltage !== b.voltage) {
      return b.voltage - a.voltage
    }
    if (a.voltage !== null && b.voltage === null) return -1
    if (b.voltage !== null && a.voltage === null) return 1

    // Tier 3: prefer longer charge time
    const aElapsed = a.chargeStartTime ? now - a.chargeStartTime : 0
    const bElapsed = b.chargeStartTime ? now - b.chargeStartTime : 0
    if (Math.abs(aElapsed - bElapsed) > 5 * 60 * 1000) {
      return bElapsed - aElapsed // more time = better
    }

    // Tier 4: prefer fewer cycles (healthier battery)
    return a.cycleCount - b.cycleCount
  })[0]
}

/**
 * Returns the battery that is currently in the bot, or null.
 */
export function getInBotBattery(batteries) {
  return batteries.find(b => b.status === STATUS.IN_BOT) || null
}

/**
 * Returns milliseconds until the earliest charging battery is expected to be ready.
 * Returns null if no batteries are charging.
 */
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

/**
 * Validate a voltage reading (FRC SLA batteries: 12V nominal, ~12.6–13.1V fully charged)
 * Returns { valid, warning } where warning is a string or null.
 */
export function assessVoltage(voltage) {
  if (voltage == null) return { valid: true, warning: null }
  if (voltage < 10.5) return { valid: true, warning: 'Very low — may be damaged' }
  if (voltage < 12.0) return { valid: true, warning: 'Low — needs full charge' }
  if (voltage > 13.5) return { valid: true, warning: 'High — check reading' }
  return { valid: true, warning: null }
}

/**
 * Validate an internal resistance reading (FRC: good < 15mΩ, bad > 20mΩ)
 */
export function assessIR(ir) {
  if (ir == null) return { valid: true, warning: null, label: null }
  if (ir < 10) return { valid: true, warning: null, label: 'Excellent' }
  if (ir < 15) return { valid: true, warning: null, label: 'Good' }
  if (ir < 20) return { valid: true, warning: 'Above average — monitor closely', label: 'Fair' }
  return { valid: true, warning: 'High resistance — consider retiring battery', label: 'Poor' }
}

/**
 * Get a short summary string for a battery's health based on cycles and IR.
 */
export function getBatteryHealth(battery) {
  if (battery.internalResistance != null) {
    const { label } = assessIR(battery.internalResistance)
    return label || 'Unknown'
  }
  if (battery.cycleCount > 200) return 'High mileage'
  if (battery.cycleCount > 100) return 'Moderate'
  return 'Good'
}
