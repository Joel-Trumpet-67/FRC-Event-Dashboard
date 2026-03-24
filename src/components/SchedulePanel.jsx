import React, { useState, useEffect } from 'react'
import { fetchTeamMatches, fetchEventMatches, fetchEventInfo } from '../utils/tbaApi'
import { fetchTeamEventStats }             from '../utils/statboticsApi'
import { loadScheduleCache, saveScheduleCache } from '../utils/storage'

// How long to use cached data before re-fetching (5 minutes)
const CACHE_TTL_MS = 5 * 60 * 1000

// =============================================================================
// Helpers
// =============================================================================

// Returns short display name for a match: "Q12", "SF2-1", "F2", etc.
function matchName(match) {
  const { comp_level: lvl, match_number: n, set_number: s } = match
  if (lvl === 'qm') return `Q${n}`
  if (lvl === 'ef') return `EF${s}-${n}`
  if (lvl === 'qf') return `QF${s}-${n}`
  if (lvl === 'sf') return `SF${s}-${n}`
  if (lvl === 'f')  return `F${n}`
  return `${lvl.toUpperCase()}${n}`
}

// TBA timestamps are Unix seconds — convert to local time string
function formatTime(unixSeconds) {
  if (!unixSeconds) return '—'
  return new Date(unixSeconds * 1000).toLocaleTimeString([], {
    hour:   '2-digit',
    minute: '2-digit',
  })
}

// Formats a millisecond duration as "1h 23m" or "4m 12s" countdown
function formatCountdown(ms) {
  if (ms <= 0) return 'NOW'
  const totalSecs = Math.floor(ms / 1000)
  const hours = Math.floor(totalSecs / 3600)
  const mins  = Math.floor((totalSecs % 3600) / 60)
  const secs  = totalSecs % 60
  if (hours > 0) return `${hours}h ${mins}m`
  if (mins  > 0) return `${mins}m ${secs.toString().padStart(2, '0')}s`
  return `${secs}s`
}

// True if a match has been played (score assigned or actual_time recorded)
function isPlayed(match) {
  if (match.actual_time) return true
  const red  = match.alliances?.red?.score  ?? -1
  const blue = match.alliances?.blue?.score ?? -1
  return red >= 0 && blue >= 0
}

// Best time to use for sorting / countdown: predicted > scheduled
function matchTime(match) {
  return match.predicted_time ?? match.time ?? 0
}

// Sort order across competition levels: quals → EF → QF → SF → Finals
const LEVEL_ORDER = { qm: 0, ef: 1, qf: 2, sf: 3, f: 4 }
function sortMatches(a, b) {
  const levelDiff = (LEVEL_ORDER[a.comp_level] ?? 9) - (LEVEL_ORDER[b.comp_level] ?? 9)
  if (levelDiff !== 0) return levelDiff
  const timeDiff = matchTime(a) - matchTime(b)
  if (timeDiff !== 0) return timeDiff
  return (a.set_number ?? 0) - (b.set_number ?? 0) || a.match_number - b.match_number
}

// =============================================================================
// SchedulePanel
// =============================================================================

/**
 * Full match schedule for the team's event, pulled from:
 *   - The Blue Alliance (match times, alliances, scores)
 *   - Statbotics (EPA, rank, record)
 *
 * Data is cached in localStorage for 5 minutes so re-opening the panel
 * is instant. Hit the refresh button to force a new fetch.
 *
 * Requires in settings: teamNumber, tbaKey, eventCode
 */
export default function SchedulePanel({ settings, onClose }) {
  const [matches,   setMatches]   = useState(null)
  const [stats,     setStats]     = useState(null)
  const [eventInfo, setEventInfo] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)

  // 1-second tick for the live countdown to next match
  const [now, setNow] = useState(Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // Fetch on mount
  useEffect(() => { loadData() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ---------------------------------------------------------------------------
  // loadData — fetches TBA + Statbotics in parallel, with localStorage cache
  // ---------------------------------------------------------------------------
  async function loadData(forceRefresh = false) {
    const { teamNumber, tbaKey, eventCode } = settings

    // Validate required settings before hitting any API
    if (!teamNumber) { setError('Enter your team number in Settings first.'); setLoading(false); return }
    if (!tbaKey)     { setError('Enter your TBA API key in Settings first.'); setLoading(false); return }
    if (!eventCode)  { setError('Enter an event code in Settings first.\n\nExample: 2024casj\nFind yours at thebluealliance.com/events'); setLoading(false); return }

    // Serve from cache if fresh enough and for the same team + event
    if (!forceRefresh) {
      const cached = loadScheduleCache()
      if (
        cached &&
        cached.eventCode   === eventCode &&
        String(cached.teamNumber) === String(teamNumber) &&
        Date.now() - cached.fetchedAt < CACHE_TTL_MS
      ) {
        setMatches(cached.matches)
        setStats(cached.stats)
        setEventInfo(cached.eventInfo)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    // Fetch event info + Statbotics in parallel — failures won't block the schedule
    const [eventResult, statsResult] = await Promise.allSettled([
      fetchEventInfo(eventCode, tbaKey),
      fetchTeamEventStats(teamNumber, eventCode),
    ])

    // --- Step 1: try the team-specific endpoint ---
    let resolvedMatches = []

    try {
      const teamMatches = await fetchTeamMatches(teamNumber, eventCode, tbaKey)
      if (Array.isArray(teamMatches)) resolvedMatches = teamMatches
    } catch (err) {
      // --- Step 2: fall back to event-wide endpoint and filter by team ---
      try {
        const allMatches = await fetchEventMatches(eventCode, tbaKey)
        if (!Array.isArray(allMatches)) {
          throw new Error(`Unexpected TBA response: ${JSON.stringify(allMatches).slice(0, 120)}`)
        }
        const key = `frc${teamNumber}`
        resolvedMatches = allMatches.filter(m =>
          m.alliances?.red?.team_keys?.includes(key) ||
          m.alliances?.blue?.team_keys?.includes(key)
        )
      } catch (fallbackErr) {
        setError(
          `Could not load schedule.\n\n${fallbackErr.message}\n\n` +
          `Check your TBA API key and event code (${eventCode}).`
        )
        setLoading(false)
        return
      }
    }
    const resolvedEventInfo = eventResult.status  === 'fulfilled' ? eventResult.value  : null
    const resolvedStats     = statsResult.status  === 'fulfilled' ? statsResult.value  : null

    setMatches(resolvedMatches)
    setEventInfo(resolvedEventInfo)
    setStats(resolvedStats)
    setLoading(false)

    saveScheduleCache({
      matches:   resolvedMatches,
      eventInfo: resolvedEventInfo,
      stats:     resolvedStats,
      eventCode,
      teamNumber,
      fetchedAt: Date.now(),
    })
  }

  // ---------------------------------------------------------------------------
  // Derived data — only computed when matches are loaded
  // ---------------------------------------------------------------------------
  const teamKey = `frc${settings.teamNumber}`

  const sortedMatches = matches ? [...matches].sort(sortMatches) : []

  // First upcoming (unplayed) match is the "next" match
  const nextMatch = sortedMatches.find(m => !isPlayed(m)) ?? null

  // Milliseconds until the next match starts (can be negative if overdue)
  const countdownMs = nextMatch ? matchTime(nextMatch) * 1000 - now : null

  // Statbotics fields — all optional-chained since response shape may vary
  const epa        = stats?.epa?.total_points?.mean  ?? stats?.epa?.mean  ?? null
  const rankNum    = stats?.rank      ?? null
  const numTeams   = stats?.num_teams ?? null
  const qualWins   = stats?.record?.qual?.wins   ?? stats?.record?.wins   ?? null
  const qualLosses = stats?.record?.qual?.losses ?? stats?.record?.losses ?? null
  const qualTies   = stats?.record?.qual?.ties   ?? stats?.record?.ties   ?? null
  const hasRecord  = qualWins !== null

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal schedule-modal" onClick={e => e.stopPropagation()}>

        {/* ── Header ── */}
        <div className="modal-header">
          <span className="modal-title">
            📅 {eventInfo?.name ?? settings.eventCode ?? 'Match Schedule'}
          </span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button
              className="icon-btn"
              onClick={() => loadData(true)}
              title="Refresh"
              aria-label="Refresh schedule"
              disabled={loading}
            >
              🔄
            </button>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>
        </div>

        <div className="modal-body">

          {/* ── Loading ── */}
          {loading && (
            <div className="schedule-loading">
              <div className="schedule-spinner" />
              Fetching schedule…
            </div>
          )}

          {/* ── Error ── */}
          {!loading && error && (
            <div className="schedule-error">
              <div className="schedule-error-msg">{error}</div>
              <button className="schedule-retry-btn" onClick={() => loadData(true)}>
                Retry
              </button>
            </div>
          )}

          {/* ── Content ── */}
          {!loading && !error && matches && (
            <>
              {/* Statbotics stats bar */}
              {stats && (
                <div className="schedule-stats">
                  {rankNum !== null && (
                    <div className="schedule-stat">
                      <span className="schedule-stat-label">Rank</span>
                      <span className="schedule-stat-value">
                        {rankNum}{numTeams ? `/${numTeams}` : ''}
                      </span>
                    </div>
                  )}
                  {epa !== null && (
                    <div className="schedule-stat">
                      <span className="schedule-stat-label">EPA</span>
                      <span className="schedule-stat-value">{epa.toFixed(1)}</span>
                    </div>
                  )}
                  {hasRecord && (
                    <div className="schedule-stat">
                      <span className="schedule-stat-label">Record</span>
                      <span className="schedule-stat-value">
                        {qualWins}-{qualLosses}{qualTies > 0 ? `-${qualTies}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Next match countdown */}
              {nextMatch && countdownMs !== null && (
                <div className={`schedule-countdown ${countdownMs <= 0 ? 'urgent' : ''}`}>
                  <span className="schedule-countdown-label">
                    {countdownMs <= 0 ? '⚡ MATCH IS ON' : '⏱ NEXT MATCH IN'}
                  </span>
                  <span className="schedule-countdown-time">
                    {formatCountdown(countdownMs)}
                  </span>
                  <span className="schedule-countdown-name">
                    {matchName(nextMatch)} · {formatTime(matchTime(nextMatch))}
                  </span>
                </div>
              )}

              {!nextMatch && sortedMatches.length > 0 && (
                <div className="schedule-done">✅ All matches complete</div>
              )}

              {/* Match list */}
              {sortedMatches.length === 0 ? (
                <div className="schedule-empty">
                  No matches found at <strong>{settings.eventCode}</strong>.<br/>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                    The event may not have matches posted yet.<br/>
                    Event codes are lowercase — e.g. <strong>2024casj</strong><br/>
                    Find yours at thebluealliance.com/events
                  </span>
                </div>
              ) : (
                <div className="schedule-list">
                  {sortedMatches.map(match => {
                    const played   = isPlayed(match)
                    const isNext   = nextMatch?.key === match.key
                    const redKeys  = match.alliances?.red?.blue_keys  ?? match.alliances?.red?.team_keys  ?? []
                    const blueKeys = match.alliances?.blue?.team_keys ?? []
                    // Fix: always use team_keys
                    const redTeams  = match.alliances?.red?.team_keys  ?? []
                    const blueTeams = match.alliances?.blue?.team_keys ?? []
                    const onRed   = redTeams.includes(teamKey)
                    const onBlue  = blueTeams.includes(teamKey)
                    const redScore  = match.alliances?.red?.score  ?? -1
                    const blueScore = match.alliances?.blue?.score ?? -1
                    const weWon = (onRed && redScore > blueScore) || (onBlue && blueScore > redScore)

                    return (
                      <div
                        key={match.key}
                        className={[
                          'schedule-match',
                          played  ? 'played'  : '',
                          isNext  ? 'next'    : '',
                          onRed   ? 'on-red'  : '',
                          onBlue  ? 'on-blue' : '',
                        ].filter(Boolean).join(' ')}
                      >
                        {/* Match name + time */}
                        <div className="schedule-match-info">
                          <span className="schedule-match-name">
                            {isNext ? '▶ ' : played ? '✓ ' : '  '}
                            {matchName(match)}
                          </span>
                          <span className="schedule-match-time">
                            {formatTime(matchTime(match))}
                          </span>
                        </div>

                        {/* Alliances */}
                        <div className="schedule-alliances">
                          <Alliance
                            teams={redTeams}
                            color="red"
                            ourTeam={teamKey}
                            score={played ? redScore : null}
                          />
                          <Alliance
                            teams={blueTeams}
                            color="blue"
                            ourTeam={teamKey}
                            score={played ? blueScore : null}
                          />
                        </div>

                        {/* Win/loss badge for played matches */}
                        {played && (onRed || onBlue) && (
                          <div className={`schedule-result ${weWon ? 'win' : 'loss'}`}>
                            {weWon ? 'W' : 'L'}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}

              <div className="schedule-footer">
                Data from The Blue Alliance &amp; Statbotics
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  )
}

// =============================================================================
// Alliance — renders one alliance row (3 teams + optional score)
// =============================================================================
function Alliance({ teams, color, ourTeam, score }) {
  return (
    <div className={`schedule-alliance schedule-alliance-${color}`}>
      <div className="schedule-alliance-teams">
        {teams.map(key => (
          <span
            key={key}
            className={`schedule-team ${key === ourTeam ? 'our-team' : ''}`}
          >
            {key.replace('frc', '')}
          </span>
        ))}
      </div>
      {score !== null && score >= 0 && (
        <span className="schedule-alliance-score">{score}</span>
      )}
    </div>
  )
}
