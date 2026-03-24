// =============================================================================
// statboticsApi.js
// -----------------------------------------------------------------------------
// Statbotics API v3 helpers.
// Docs: https://api.statbotics.io/v3/docs
//
// No API key required — Statbotics is a free public API.
// Returns EPA (Expected Points Added) and event-specific team stats.
// =============================================================================

const STATBOTICS_BASE = 'https://api.statbotics.io/v3'

// -----------------------------------------------------------------------------
// fetchTeamEventStats — returns a team's stats for one specific event.
//
// Key fields in the response:
//   epa.total_points.mean  — team's average EPA at this event
//   epa.total_points.sd    — standard deviation
//   record.qual.wins/losses/ties — qual record
//   rank                   — current qual rank
//   num_teams              — total teams at event (for "rank of N" display)
//
// Returns null-safe — wrap call in try/catch as Statbotics may 404
// if the event hasn't started or the team isn't attending.
//
// @param {string|number} teamNumber  — e.g. 254
// @param {string}        eventCode   — e.g. "2024casj"
// @returns {object}
// -----------------------------------------------------------------------------
export async function fetchTeamEventStats(teamNumber, eventCode) {
  const res = await fetch(
    `${STATBOTICS_BASE}/team_event/${teamNumber}/${eventCode}`
  )
  if (!res.ok) throw new Error(`Statbotics ${res.status}: ${res.statusText}`)
  return res.json()
}
