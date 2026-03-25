import React, { useState, useEffect } from 'react'
import { fetchTeamMatches, fetchEventMatches, fetchEventInfo } from '../utils/tbaApi'
import { fetchTeamEventStats, fetchEventMatchPredictions } from '../utils/statboticsApi'
import { loadScheduleCache, saveScheduleCache, clearScheduleCache } from '../utils/storage'

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

// CSS class for event result badge
function eventResultClass(result) {
  if (!result) return ''
  const r = result.toLowerCase()
  if (r.includes('winner') || r.includes('won'))     return 'result-winner'
  if (r.includes('finalist'))                         return 'result-finalist'
  return 'result-elim'
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
 *   - Statbotics (EPA, rank, record, win probability predictions)
 *
 * Data is cached in localStorage for 5 minutes so re-opening the panel
 * is instant. Hit the refresh button to force a new fetch.
 *
 * Requires in settings: teamNumber, tbaKey, eventCode
 */
export default function SchedulePanel({ settings, onClose }) {
  const [matches,          setMatches]          = useState(null)
  const [stats,            setStats]            = useState(null)
  const [predictions,      setPredictions]      = useState(null)
  const [eventInfo,        setEventInfo]        = useState(null)
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState(null)
  const [fetchDebug,       setFetchDebug]       = useState(null) // {totalEventMatches, teamKey}

  // Active tab: 'schedule' | 'predictions'
  const [activeTab, setActiveTab] = useState('schedule')

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

    // Serve from cache if fresh enough, same team + event, and non-empty matches.
    // Skip cache if matches is empty — force a re-fetch so we don't permanently
    // show "no matches" after a bad earlier fetch.
    if (!forceRefresh) {
      const cached = loadScheduleCache()
      if (
        cached &&
        cached.eventCode   === eventCode &&
        String(cached.teamNumber) === String(teamNumber) &&
        Date.now() - cached.fetchedAt < CACHE_TTL_MS &&
        Array.isArray(cached.matches) && cached.matches.length > 0
      ) {
        setMatches(cached.matches)
        setStats(cached.stats)
        setPredictions(cached.predictions ?? null)
        setEventInfo(cached.eventInfo)
        setLoading(false)
        return
      }
    }

    setLoading(true)
    setError(null)

    // Fetch event info, Statbotics team stats, and predictions in parallel
    const [eventResult, statsResult, predsResult] = await Promise.allSettled([
      fetchEventInfo(eventCode, tbaKey),
      fetchTeamEventStats(teamNumber, eventCode),
      fetchEventMatchPredictions(eventCode),
    ])

    // --- Fetch matches ---
    // Strategy: try the team-specific endpoint first (faster, smaller payload).
    // If it throws OR returns an empty array, fall back to the full event
    // endpoint and filter client-side.  TBA legitimately returns [] from the
    // team endpoint when matches haven't been assigned yet, so an empty array
    // is treated the same as a failure here.
    let resolvedMatches = []

    const teamKey = `frc${teamNumber}`
    let totalEventMatches = null

    let teamEndpointOk = false
    try {
      const teamMatches = await fetchTeamMatches(teamNumber, eventCode, tbaKey)
      if (Array.isArray(teamMatches) && teamMatches.length > 0) {
        resolvedMatches = teamMatches
        teamEndpointOk  = true
      }
    } catch (_e) {
      // swallow — fall through to event-wide fetch
    }

    if (!teamEndpointOk) {
      try {
        const allMatches = await fetchEventMatches(eventCode, tbaKey)
        if (!Array.isArray(allMatches)) {
          throw new Error(`TBA returned: ${JSON.stringify(allMatches).slice(0, 200)}`)
        }
        totalEventMatches = allMatches.length
        resolvedMatches = allMatches.filter(m =>
          m.alliances?.red?.team_keys?.includes(teamKey) ||
          m.alliances?.blue?.team_keys?.includes(teamKey)
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

    setFetchDebug({ totalEventMatches, teamKey })

    const resolvedEventInfo  = eventResult.status  === 'fulfilled' ? eventResult.value  : null
    const resolvedStats      = statsResult.status  === 'fulfilled' ? statsResult.value  : null
    const resolvedPredictions = predsResult.status === 'fulfilled' ? predsResult.value  : null

    setMatches(resolvedMatches)
    setEventInfo(resolvedEventInfo)
    setStats(resolvedStats)
    setPredictions(resolvedPredictions)
    setLoading(false)

    saveScheduleCache({
      matches:     resolvedMatches,
      eventInfo:   resolvedEventInfo,
      stats:       resolvedStats,
      predictions: resolvedPredictions,
      eventCode,
      teamNumber,
      fetchedAt:   Date.now(),
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

  // Event finish result from Statbotics (e.g. "Winner", "Finalist", "Quarterfinalist")
  const eventResult = stats?.result ?? null

  // Elim record if available
  const elimWins   = stats?.record?.elim?.wins   ?? null
  const elimLosses = stats?.record?.elim?.losses ?? null
  const hasElim    = elimWins !== null && elimLosses !== null

  // Watched teams — parsed from settings (comma-separated team numbers)
  const watchedTeamKeys = (settings.watchedTeams || '')
    .split(',')
    .map(t => `frc${t.trim()}`)
    .filter(t => t !== 'frc' && t !== `frc${settings.teamNumber}`)

  // Build a predictions lookup keyed by TBA match key
  // Statbotics match key format matches TBA (e.g. "2024casj_qm1")
  const predByKey = {}
  if (Array.isArray(predictions)) {
    for (const p of predictions) {
      if (p.key) predByKey[p.key] = p
    }
  }

  // Upcoming matches that our team is in (for Predictions tab)
  const upcomingTeamMatches = sortedMatches.filter(m => !isPlayed(m))

  // ==========================================================================
  // Render
  // ==========================================================================
  return (
    <div className="view-screen">

      {/* ── Header ── */}
      <div className="view-header">
          <button className="view-back-btn" onClick={onClose}>‹</button>
          <span className="view-title">
            📅 {eventInfo?.name ?? settings.eventCode ?? 'Match Schedule'}
          </span>
          <button
            className="icon-btn"
            onClick={() => loadData(true)}
            title="Refresh"
            aria-label="Refresh schedule"
            disabled={loading}
          >
            🔄
          </button>
      </div>

        {/* ── Tab Bar ── */}
        <div className="schedule-tabs">
          <button
            className={`schedule-tab ${activeTab === 'schedule' ? 'active' : ''}`}
            onClick={() => setActiveTab('schedule')}
          >
            Schedule
          </button>
          <button
            className={`schedule-tab ${activeTab === 'predictions' ? 'active' : ''}`}
            onClick={() => setActiveTab('predictions')}
          >
            Predictions
          </button>
        </div>

        <div className="view-body">

          {/* ── Loading ── */}
          {loading && (
            <div className="schedule-loading">
              <div className="schedule-spinner" />
              Fetching frc{settings.teamNumber} @ {settings.eventCode}…
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
              {/* Statbotics stats bar (shown on both tabs) */}
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
                      <span className="schedule-stat-label">Qual</span>
                      <span className="schedule-stat-value">
                        {qualWins}-{qualLosses}{qualTies > 0 ? `-${qualTies}` : ''}
                      </span>
                    </div>
                  )}
                  {hasElim && (
                    <div className="schedule-stat">
                      <span className="schedule-stat-label">Elim</span>
                      <span className="schedule-stat-value">{elimWins}-{elimLosses}</span>
                    </div>
                  )}
                  {eventResult && (
                    <div className={`schedule-stat event-result-stat ${eventResultClass(eventResult)}`}>
                      <span className="schedule-stat-label">Result</span>
                      <span className="schedule-stat-value">{eventResult}</span>
                    </div>
                  )}
                </div>
              )}

              {/* ── SCHEDULE TAB ── */}
              {activeTab === 'schedule' && (
                <>
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
                      {fetchDebug?.totalEventMatches > 0 ? (
                        <>
                          <strong>frc{settings.teamNumber}</strong> was not found at <strong>{settings.eventCode}</strong>.<br/>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                            TBA returned <strong>{fetchDebug.totalEventMatches} matches</strong> for that event, but none include your team.<br/><br/>
                            ✏️ Fix your <strong>Team Number</strong> in Settings — it must match a team that attended this event.
                          </span>
                        </>
                      ) : (
                        <>
                          No matches at <strong>{settings.eventCode}</strong> for <strong>frc{settings.teamNumber}</strong>.<br/>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 6, display: 'block' }}>
                            {fetchDebug?.totalEventMatches === 0
                              ? <>✅ Event exists — schedule not posted yet. Check back closer to event day.</>
                              : <>❓ Event code may be wrong. Codes are lowercase e.g. <strong>2024casj</strong><br/>Find yours at thebluealliance.com/events</>
                            }
                          </span>
                        </>
                      )}
                      <button
                        className="schedule-retry-btn"
                        style={{ marginTop: 12 }}
                        onClick={() => { clearScheduleCache(); loadData(true) }}
                      >
                        🗑 Clear Cache &amp; Retry
                      </button>
                    </div>
                  ) : (
                    <div className="schedule-list">
                      {sortedMatches.map(match => {
                        const played   = isPlayed(match)
                        const isNext   = nextMatch?.key === match.key
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
                                watchedTeams={watchedTeamKeys}
                                score={played ? redScore : null}
                              />
                              <Alliance
                                teams={blueTeams}
                                color="blue"
                                ourTeam={teamKey}
                                watchedTeams={watchedTeamKeys}
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
                </>
              )}

              {/* ── PREDICTIONS TAB ── */}
              {activeTab === 'predictions' && (
                <>
                  {upcomingTeamMatches.length === 0 ? (
                    <div className="schedule-done">✅ No upcoming matches to predict</div>
                  ) : (
                    <div className="schedule-list">
                      {upcomingTeamMatches.map(match => (
                        <PredMatchCard
                          key={match.key}
                          match={match}
                          pred={predByKey[match.key]}
                          teamKey={teamKey}
                          watchedTeamKeys={watchedTeamKeys}
                        />
                      ))}
                    </div>
                  )}

                  {/* Watched teams' upcoming matches */}
                  {watchedTeamKeys.length > 0 && (() => {
                    const watchedUpcoming = sortedMatches.filter(m => {
                      if (isPlayed(m)) return false
                      const all = [
                        ...(m.alliances?.red?.team_keys  ?? []),
                        ...(m.alliances?.blue?.team_keys ?? []),
                      ]
                      return watchedTeamKeys.some(k => all.includes(k)) &&
                             !all.includes(teamKey)
                    })
                    if (watchedUpcoming.length === 0) return null
                    return (
                      <>
                        <div className="schedule-section-label">⭐ Watched Teams</div>
                        <div className="schedule-list">
                          {watchedUpcoming.map(match => (
                            <PredMatchCard
                              key={match.key}
                              match={match}
                              pred={predByKey[match.key]}
                              teamKey={teamKey}
                              watchedTeamKeys={watchedTeamKeys}
                            />
                          ))}
                        </div>
                      </>
                    )
                  })()}
                </>
              )}

              <div className="schedule-footer">
                Data from The Blue Alliance &amp; Statbotics
              </div>
            </>
          )}

        </div>
    </div>
  )
}

// =============================================================================
// Alliance — renders one alliance row (3 teams + optional score)
// =============================================================================
function Alliance({ teams, color, ourTeam, watchedTeams = [], score, scoreLabel }) {
  return (
    <div className={`schedule-alliance schedule-alliance-${color}`}>
      <div className="schedule-alliance-teams">
        {teams.map(key => (
          <span
            key={key}
            className={[
              'schedule-team',
              key === ourTeam                ? 'our-team'     : '',
              watchedTeams.includes(key)     ? 'watched-team' : '',
            ].filter(Boolean).join(' ')}
          >
            {watchedTeams.includes(key) && key !== ourTeam ? '⭐' : ''}
            {key.replace('frc', '')}
          </span>
        ))}
      </div>
      {score !== null && score >= 0 && (
        <span className={`schedule-alliance-score ${scoreLabel === 'pred' ? 'pred-score' : ''}`}>
          {score}
        </span>
      )}
    </div>
  )
}

// =============================================================================
// PredMatchCard — one match card for the Predictions tab
// =============================================================================
function PredMatchCard({ match, pred, teamKey, watchedTeamKeys }) {
  const redTeams  = match.alliances?.red?.team_keys  ?? []
  const blueTeams = match.alliances?.blue?.team_keys ?? []
  const onRed     = redTeams.includes(teamKey)
  const onBlue    = blueTeams.includes(teamKey)

  const redWinProb    = pred?.pred?.red_win_prob  ?? pred?.red_win_prob  ?? null
  const blueWinProb   = redWinProb !== null ? 1 - redWinProb : null
  const predRedScore  = pred?.pred?.red_score     ?? pred?.red_score     ?? null
  const predBlueScore = pred?.pred?.blue_score    ?? pred?.blue_score    ?? null

  const ourWinProb = onRed ? redWinProb : onBlue ? blueWinProb : null
  const favored    = ourWinProb !== null
    ? ourWinProb >= 0.5 ? 'fav' : 'dog'
    : null

  return (
    <div
      className={[
        'schedule-match',
        'pred-match',
        onRed  ? 'on-red'  : '',
        onBlue ? 'on-blue' : '',
      ].filter(Boolean).join(' ')}
    >
      <div className="schedule-match-info">
        <span className="schedule-match-name">{matchName(match)}</span>
        <span className="schedule-match-time">{formatTime(matchTime(match))}</span>
      </div>

      <div className="schedule-alliances">
        <Alliance
          teams={redTeams}
          color="red"
          ourTeam={teamKey}
          watchedTeams={watchedTeamKeys}
          score={predRedScore !== null ? Math.round(predRedScore) : null}
          scoreLabel="pred"
        />
        <Alliance
          teams={blueTeams}
          color="blue"
          ourTeam={teamKey}
          watchedTeams={watchedTeamKeys}
          score={predBlueScore !== null ? Math.round(predBlueScore) : null}
          scoreLabel="pred"
        />
      </div>

      {redWinProb !== null && (
        <WinProbBar
          redProb={redWinProb}
          ourAlliance={onRed ? 'red' : onBlue ? 'blue' : null}
        />
      )}

      {ourWinProb !== null && (
        <div className={`schedule-win-chance ${favored}`}>
          {Math.round(ourWinProb * 100)}% win
        </div>
      )}

      {pred === undefined && (
        <div className="schedule-no-pred">No prediction available</div>
      )}
    </div>
  )
}

// =============================================================================
// WinProbBar — horizontal probability bar (red | blue split)
// =============================================================================
function WinProbBar({ redProb, ourAlliance }) {
  const redPct  = Math.round(redProb  * 100)
  const bluePct = 100 - redPct

  return (
    <div className="win-prob-bar-wrap">
      <span className={`win-prob-label red-label ${ourAlliance === 'red' ? 'our-label' : ''}`}>
        {redPct}%
      </span>
      <div className="win-prob-bar">
        <div
          className="win-prob-red"
          style={{ width: `${redPct}%` }}
        />
        <div
          className="win-prob-blue"
          style={{ width: `${bluePct}%` }}
        />
      </div>
      <span className={`win-prob-label blue-label ${ourAlliance === 'blue' ? 'our-label' : ''}`}>
        {bluePct}%
      </span>
    </div>
  )
}
