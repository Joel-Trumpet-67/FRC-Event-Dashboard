// =============================================================================
// batteryConstants.js
// -----------------------------------------------------------------------------
// All status constants, labels, and colours for battery states.
// Imported by every file that needs to read or display a battery status.
//
// ⚠️  WARNING: The STATUS string values (e.g. 'depleted', 'in_bot') are saved
//     directly to localStorage and Firebase. Do NOT rename them without writing
//     a migration to update existing saved data.
// =============================================================================

// -----------------------------------------------------------------------------
// STATUS — the possible states a battery can be in
// -----------------------------------------------------------------------------
export const STATUS = {
  DEPLETED: 'depleted', // needs charging, not currently on charger
  CHARGING: 'charging', // on the charger, timestamp recorded
  COOLING:  'cooling',  // recently removed from bot or charger, needs to cool
  READY:    'ready',    // fully charged and available to use
  STANDBY:  'standby',  // charged and held in reserve — not the primary next battery
  IN_BOT:   'in_bot',   // currently installed in the robot
}

// -----------------------------------------------------------------------------
// STATUS_LABEL — human-readable display text for each status
// Used in BatteryCard status pills and BatteryModal header
// -----------------------------------------------------------------------------
export const STATUS_LABEL = {
  depleted: 'Depleted',
  charging: 'Charging',
  cooling:  'Cooling',
  ready:    'Ready',
  standby:  'Standby',
  in_bot:   'In Bot',
}

// -----------------------------------------------------------------------------
// STATUS_COLOR — border / text colour for each status
// Used in BatteryCard borders, BatteryModal header, and the legend in App.jsx
// -----------------------------------------------------------------------------
export const STATUS_COLOR = {
  depleted: '#ef4444',  // red
  charging: '#f59e0b',  // amber
  cooling:  '#f97316',  // orange
  ready:    '#22c55e',  // green
  standby:  '#8b5cf6',  // violet
  in_bot:   '#3b82f6',  // blue
}

// -----------------------------------------------------------------------------
// STATUS_BG — dark background fill colour for each status
// Used in BatteryCard background tinting
// -----------------------------------------------------------------------------
export const STATUS_BG = {
  depleted: '#450a0a',
  charging: '#451a03',
  cooling:  '#431407',
  ready:    '#052e16',
  standby:  '#2e1065',
  in_bot:   '#172554',
}
