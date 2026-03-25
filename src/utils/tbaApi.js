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

// -----------------------------------------------------------------------------
// fetchEventRankings — returns qualification rankings for an event.
//
// Response: { rankings: [{rank, team_key, record, sort_orders, ...}], sort_order_info }
//
// @param {string} eventCode
// @param {string} apiKey
// @returns {object}
// -----------------------------------------------------------------------------
export async function fetchEventRankings(eventCode, apiKey) {
  return tbaFetch(`/event/${eventCode}/rankings`, apiKey)
}

// -----------------------------------------------------------------------------
// fetchTeamSimple — returns basic info about a team.
//
// @param {string|number} teamNumber
// @param {string} apiKey
// @returns {object}  { key, team_number, nickname, city, state_prov, country }
// -----------------------------------------------------------------------------
export async function fetchTeamSimple(teamNumber, apiKey) {
  return tbaFetch(`/team/frc${teamNumber}/simple`, apiKey)
}

// -----------------------------------------------------------------------------
// fetchEventTeams — returns all teams at an event.
//
// @param {string} eventCode
// @param {string} apiKey
// @returns {Array}  array of team_simple objects
// -----------------------------------------------------------------------------
export async function fetchEventTeams(eventCode, apiKey) {
  return tbaFetch(`/event/${eventCode}/teams/simple`, apiKey)
}

// -----------------------------------------------------------------------------
// fetchEventOPRs — returns OPR, DPR, and CCWM for all teams at an event.
//
// Response shape:
//   { oprs: { "frc254": 45.2, ... }, dprs: { ... }, ccwms: { ... } }
//
// OPR  = Offensive Power Rating (contribution to alliance score)
// DPR  = Defensive Power Rating (contribution to opponent score — lower is better)
// CCWM = Calculated Contribution to Winning Margin (OPR - DPR)
//
// @param {string} eventCode
// @param {string} apiKey
// @returns {object}
// -----------------------------------------------------------------------------
export async function fetchEventOPRs(eventCode, apiKey) {
  return tbaFetch(`/event/${eventCode}/oprs`, apiKey)
}

// -----------------------------------------------------------------------------
// fetchEventAlliances — returns playoff alliances and their bracket status.
//
// Response: Array of alliance objects:
//   { name, picks: ["frc254", ...], status: { level, record, status } }
//
// @param {string} eventCode
// @param {string} apiKey
// @returns {Array}
// -----------------------------------------------------------------------------
export async function fetchEventAlliances(eventCode, apiKey) {
  return tbaFetch(`/event/${eventCode}/alliances`, apiKey)
}
