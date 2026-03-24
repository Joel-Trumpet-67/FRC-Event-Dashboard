// =============================================================================
// tbaApi.js
// -----------------------------------------------------------------------------
// The Blue Alliance API v3 helpers.
// Docs: https://www.thebluealliance.com/apidocs/v3
//
// Requires a free TBA API key — get one at thebluealliance.com/account
// All requests pass the key as an X-TBA-Auth-Key header.
//
// Note: TBA timestamps are Unix seconds (not ms) — multiply by 1000 for JS Date.
// =============================================================================

const TBA_BASE = 'https://www.thebluealliance.com/api/v3'

// -----------------------------------------------------------------------------
// tbaFetch — shared fetch wrapper with auth header and error checking
// -----------------------------------------------------------------------------
async function tbaFetch(path, apiKey) {
  const res = await fetch(`${TBA_BASE}${path}`, {
    headers: { 'X-TBA-Auth-Key': apiKey },
  })
  if (!res.ok) throw new Error(`TBA ${res.status}: ${res.statusText}`)
  return res.json()
}

// -----------------------------------------------------------------------------
// fetchTeamMatches — returns all matches for a team at a specific event.
//
// Each match object includes:
//   key, comp_level, set_number, match_number,
//   alliances.red/blue.team_keys, alliances.red/blue.score,
//   time, predicted_time, actual_time, winning_alliance
//
// @param {string|number} teamNumber  — e.g. 254
// @param {string}        eventCode   — e.g. "2024casj"
// @param {string}        apiKey
// @returns {Array}
// -----------------------------------------------------------------------------
export async function fetchTeamMatches(teamNumber, eventCode, apiKey) {
  return tbaFetch(
    `/team/frc${teamNumber}/event/${eventCode}/matches/simple`,
    apiKey
  )
}

// -----------------------------------------------------------------------------
// fetchEventMatches — returns ALL matches at an event (all teams).
// Used as a fallback when the team-specific endpoint returns an empty array
// (e.g. event not yet started, or team key mismatch).
// Filter the result client-side by checking alliances.red/blue.team_keys.
//
// @param {string} eventCode — e.g. "2024casj"
// @param {string} apiKey
// @returns {Array}
// -----------------------------------------------------------------------------
export async function fetchEventMatches(eventCode, apiKey) {
  return tbaFetch(`/event/${eventCode}/matches/simple`, apiKey)
}

// -----------------------------------------------------------------------------
// fetchEventInfo — returns basic info about an event (name, location, dates).
//
// @param {string} eventCode — e.g. "2024casj"
// @param {string} apiKey
// @returns {object}
// -----------------------------------------------------------------------------
export async function fetchEventInfo(eventCode, apiKey) {
  return tbaFetch(`/event/${eventCode}/simple`, apiKey)
}
