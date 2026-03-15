// Keys for localStorage
const KEYS = {
  BATTERIES: 'frc_batteries',
  SETTINGS: 'frc_settings',
  MATCH_NUMBER: 'frc_match_number',
  MATCH_LOG: 'frc_match_log',
}

export function loadBatteries() {
  try {
    const raw = localStorage.getItem(KEYS.BATTERIES)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveBatteries(batteries) {
  localStorage.setItem(KEYS.BATTERIES, JSON.stringify(batteries))
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(KEYS.SETTINGS)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveSettings(settings) {
  localStorage.setItem(KEYS.SETTINGS, JSON.stringify(settings))
}

export function loadMatchNumber() {
  return parseInt(localStorage.getItem(KEYS.MATCH_NUMBER) || '1', 10)
}

export function saveMatchNumber(n) {
  localStorage.setItem(KEYS.MATCH_NUMBER, String(n))
}

export function loadMatchLog() {
  try {
    const raw = localStorage.getItem(KEYS.MATCH_LOG)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

export function saveMatchLog(log) {
  localStorage.setItem(KEYS.MATCH_LOG, JSON.stringify(log))
}

export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
