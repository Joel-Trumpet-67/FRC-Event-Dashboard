// =============================================================================
// batteryLogic.js — BARREL FILE
// -----------------------------------------------------------------------------
// This file re-exports everything from the split utility files so that all
// existing imports (e.g. `from '../utils/batteryLogic'`) continue to work
// without any changes.
//
// The actual logic now lives in:
//   batteryConstants.js  — STATUS, STATUS_LABEL, STATUS_COLOR, STATUS_BG
//   batteryFactory.js    — createBattery(), addHistory()
//   batteryRecommend.js  — getBestNextBattery(), getInBotBattery(), getNextReadyEta()
//   batteryHealth.js     — assessVoltage(), assessIR(), getBatteryHealth()
// =============================================================================

export * from './batteryConstants'
export * from './batteryFactory'
export * from './batteryRecommend'
export * from './batteryHealth'
