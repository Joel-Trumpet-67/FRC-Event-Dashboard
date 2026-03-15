/**
 * Format milliseconds into a human-readable elapsed string.
 * e.g. 90000 → "1m 30s", 3700000 → "1h 1m"
 */
export function formatElapsed(ms) {
  if (ms == null || ms < 0) return '—'
  const totalSec = Math.floor(ms / 1000)
  const h = Math.floor(totalSec / 3600)
  const m = Math.floor((totalSec % 3600) / 60)
  const s = totalSec % 60

  if (h > 0) return `${h}h ${m}m`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

/**
 * Format a timestamp into a short local time string. e.g. "2:34 PM"
 */
export function formatTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Format a timestamp into date + time. e.g. "Mar 14, 2:34 PM"
 */
export function formatDateTime(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

/**
 * Clamp a number between min and max.
 */
export function clamp(val, min, max) {
  return Math.min(Math.max(val, min), max)
}

/**
 * Returns a 0–100 charge progress estimate based on elapsed time vs threshold.
 * Caps at 100.
 */
export function estimateChargePercent(chargeStartTime, thresholdMs) {
  if (!chargeStartTime || !thresholdMs) return 0
  const elapsed = Date.now() - chargeStartTime
  return clamp(Math.round((elapsed / thresholdMs) * 100), 0, 100)
}

/**
 * Returns a 0–100 cool-down progress (how close to cool).
 */
export function estimateCoolPercent(coolStartTime, thresholdMs) {
  if (!coolStartTime || !thresholdMs) return 0
  const elapsed = Date.now() - coolStartTime
  return clamp(Math.round((elapsed / thresholdMs) * 100), 0, 100)
}
