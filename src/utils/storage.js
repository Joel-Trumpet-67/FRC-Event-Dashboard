// Keys for localStorage
const KEYS = {
  BATTERIES:      'frc_batteries',
  SETTINGS:       'frc_settings',
  MATCH_NUMBER:   'frc_match_number',
  MATCH_LOG:      'frc_match_log',
  SCHEDULE_CACHE: 'frc_schedule_cache', // TBA + Statbotics data cache
  CHECKLIST:      'frc_checklist',
  ALLIANCE:       'frc_alliance',
  NOTES:          'frc_notes',
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

// -----------------------------------------------------------------------------
// Schedule cache — stores TBA + Statbotics response data with a timestamp.
// Includes eventCode + teamNumber so stale cache for a different event is ignored.
// -----------------------------------------------------------------------------
export function loadScheduleCache() {
  try {
    const raw = localStorage.getItem(KEYS.SCHEDULE_CACHE)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function saveScheduleCache(data) {
  localStorage.setItem(KEYS.SCHEDULE_CACHE, JSON.stringify(data))
}

export function clearScheduleCache() {
  localStorage.removeItem(KEYS.SCHEDULE_CACHE)
}

// -----------------------------------------------------------------------------
// Checklist — { items: [{id, text, isDefault}], checked: { [id]: bool } }
// -----------------------------------------------------------------------------
export function loadChecklist() {
  try {
    const raw = localStorage.getItem(KEYS.CHECKLIST)
    return raw ? JSON.parse(raw) : null
  } catch { return null }
}
export function saveChecklist(data) {
  localStorage.setItem(KEYS.CHECKLIST, JSON.stringify(data))
}

// -----------------------------------------------------------------------------
// Alliance — [{ teamNumber, name, status: 'want'|'avoid'|'picked'|'neutral' }]
// -----------------------------------------------------------------------------
export function loadAlliance() {
  try {
    const raw = localStorage.getItem(KEYS.ALLIANCE)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}
export function saveAlliance(teams) {
  localStorage.setItem(KEYS.ALLIANCE, JSON.stringify(teams))
}

// -----------------------------------------------------------------------------
// Match Notes — { [matchNumber]: string }
// -----------------------------------------------------------------------------
export function loadMatchNotes() {
  try {
    const raw = localStorage.getItem(KEYS.NOTES)
    return raw ? JSON.parse(raw) : {}
  } catch { return {} }
}
export function saveMatchNotes(notes) {
  localStorage.setItem(KEYS.NOTES, JSON.stringify(notes))
}

export function clearAll() {
  Object.values(KEYS).forEach(k => localStorage.removeItem(k))
}
