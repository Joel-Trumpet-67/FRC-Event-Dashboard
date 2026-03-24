// =============================================================================
// batteryHealth.js
// -----------------------------------------------------------------------------
// Functions that ASSESS battery health from voltage and internal resistance.
// Returns warning messages and health labels used in BatteryModal and BatteryCard.
//
// FRC SLA battery reference values:
//   Voltage:  nominal 12V, fully charged ~12.6–13.1V, damaged < 10.5V
//   IR:       excellent < 10mΩ, good < 15mΩ, fair < 20mΩ, poor >= 20mΩ
// =============================================================================

// -----------------------------------------------------------------------------
// assessVoltage — checks whether a voltage reading is in a healthy range.
//
// @param {number|null} voltage — measured voltage in volts
// @returns {{ valid: boolean, warning: string|null }}
//   warning is null if the reading looks fine, or a short message if not
// -----------------------------------------------------------------------------
export function assessVoltage(voltage) {
  if (voltage == null) return { valid: true, warning: null }
  if (voltage < 10.5)  return { valid: true, warning: 'Very low — may be damaged' }
  if (voltage < 12.0)  return { valid: true, warning: 'Low — needs full charge' }
  if (voltage > 13.5)  return { valid: true, warning: 'High — check reading' }
  return { valid: true, warning: null }
}

// -----------------------------------------------------------------------------
// assessIR — checks whether an internal resistance reading is acceptable.
//
// @param {number|null} ir — measured internal resistance in milliohms (mΩ)
// @returns {{ valid: boolean, warning: string|null, label: string|null }}
//   label is a one-word quality rating ('Excellent', 'Good', 'Fair', 'Poor')
//   warning is null for good readings, or advice for concerning ones
// -----------------------------------------------------------------------------
export function assessIR(ir) {
  if (ir == null) return { valid: true, warning: null, label: null }
  if (ir < 10)    return { valid: true, warning: null,                                          label: 'Excellent' }
  if (ir < 15)    return { valid: true, warning: null,                                          label: 'Good'      }
  if (ir < 20)    return { valid: true, warning: 'Above average — monitor closely',             label: 'Fair'      }
  return            { valid: true, warning: 'High resistance — consider retiring battery',      label: 'Poor'      }
}

// -----------------------------------------------------------------------------
// getBatteryHealth — returns a short summary string of a battery's overall health.
//
// Prefers IR-based assessment when a reading is available.
// Falls back to cycle count if no IR reading has been recorded.
//
// @param {object} battery — a battery object from the batteries array
// @returns {string} — e.g. 'Excellent', 'Good', 'High mileage'
// -----------------------------------------------------------------------------
export function getBatteryHealth(battery) {
  // IR reading is the most reliable health indicator — use it if we have one
  if (battery.internalResistance != null) {
    const { label } = assessIR(battery.internalResistance)
    return label || 'Unknown'
  }

  // Fall back to cycle count as a rough proxy for wear
  if (battery.cycleCount > 200) return 'High mileage'
  if (battery.cycleCount > 100) return 'Moderate'
  return 'Good'
}
