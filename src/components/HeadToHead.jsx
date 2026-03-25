import React, { useState } from 'react'
import { fetchTeamSimple }                        from '../utils/tbaApi'
import { fetchTeamEventStats, fetchTeamStats }    from '../utils/statboticsApi'

// -----------------------------------------------------------------------------
// safe — safely read a dot-separated path from a nested object
// -----------------------------------------------------------------------------
function safe(obj, path) {
  try { return path.split('.').reduce((o, k) => o[k], obj) } catch { return null }
}

// -----------------------------------------------------------------------------
// CompRow — one comparison row (value | label | value)
//   v1/v2         raw numeric values (or null)
//   higherIsBetter true = green on larger side
//   fmt           format function for display
// -----------------------------------------------------------------------------
function CompRow({ label, v1, v2, higherIsBetter = true, fmt = v => v }) {
  const n1 = parseFloat(v1)
  const n2 = parseFloat(v2)
  const valid = !isNaN(n1) && !isNaN(n2) && n1 !== n2
  const win1  = valid && (higherIsBetter ? n1 > n2 : n1 < n2)
  const win2  = valid && (higherIsBetter ? n2 > n1 : n2 < n1)

  return (
    <div className="h2h-row">
      <span className={`h2h-val${win1 ? ' h2h-win' : ''}`}>
        {v1 != null ? fmt(v1) : '—'}
      </span>
      <span className="h2h-label">{label}</span>
      <span className={`h2h-val h2h-val-right${win2 ? ' h2h-win' : ''}`}>
        {v2 != null ? fmt(v2) : '—'}
      </span>
    </div>
  )
}

export default function HeadToHead({ settings, onBack }) {
  const [team1,   setTeam1]   = useState(settings.teamNumber || '')
  const [team2,   setTeam2]   = useState('')
  const [data1,   setData1]   = useState(null)
  const [data2,   setData2]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function loadTeam(num) {
    const { tbaKey, eventCode } = settings
    const [tbaInfo, evtStats, allStats] = await Promise.all([
      tbaKey    ? fetchTeamSimple(num, tbaKey).catch(() => null)              : Promise.resolve(null),
      eventCode ? fetchTeamEventStats(num, eventCode).catch(() => null)       : Promise.resolve(null),
      fetchTeamStats(num).catch(() => null),
    ])
    return { tbaInfo, evtStats, allStats }
  }

  async function compare() {
    if (!team1 || !team2) { setError('Enter both team numbers first.'); return }
    setLoading(true)
    setError(null)
    setData1(null)
    setData2(null)
    try {
      const [d1, d2] = await Promise.all([loadTeam(team1), loadTeam(team2)])
      setData1(d1)
      setData2(d2)
    } catch (e) {
      setError(`Failed to load team data.\n\n${e.message}`)
    }
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') compare()
  }

  const hasResults = data1 && data2
  const hasEvent   = !!settings.eventCode

  // Build W-L string from statbotics event record
  function record(d) {
    const r = safe(d, 'evtStats.record.qual')
    return r ? `${r.wins}-${r.losses}${r.ties > 0 ? `-${r.ties}` : ''}` : null
  }

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">⚔️ Head to Head</span>
      </div>

      <div className="view-body">

        {/* Input row */}
        <div className="h2h-inputs">
          <input
            className="h2h-input"
            type="number"
            inputMode="numeric"
            placeholder="Team 1"
            value={team1}
            onChange={e => setTeam1(e.target.value)}
            onKeyDown={handleKey}
          />
          <span className="h2h-vs">vs</span>
          <input
            className="h2h-input"
            type="number"
            inputMode="numeric"
            placeholder="Team 2"
            value={team2}
            onChange={e => setTeam2(e.target.value)}
            onKeyDown={handleKey}
          />
        </div>
        <button
          className="h2h-compare-btn"
          onClick={compare}
          disabled={loading || !team1 || !team2}
        >
          {loading ? 'Loading…' : 'Compare'}
        </button>

        {error && (
          <div className="schedule-error" style={{ marginTop: 12 }}>
            <div className="schedule-error-msg">{error}</div>
          </div>
        )}

        {loading && (
          <div className="schedule-loading">
            <div className="schedule-spinner" />
            Fetching team data…
          </div>
        )}

        {hasResults && (
          <div className="h2h-table">

            {/* Team name headers */}
            <div className="h2h-teams-header">
              <div className="h2h-team-header-cell">
                <span className="h2h-team-num">{team1}</span>
                <span className="h2h-team-name">{data1.tbaInfo?.nickname ?? '—'}</span>
                <span className="h2h-team-loc">
                  {[data1.tbaInfo?.city, data1.tbaInfo?.state_prov].filter(Boolean).join(', ')}
                </span>
              </div>
              <div className="h2h-vs-center">vs</div>
              <div className="h2h-team-header-cell h2h-team-right">
                <span className="h2h-team-num">{team2}</span>
                <span className="h2h-team-name">{data2.tbaInfo?.nickname ?? '—'}</span>
                <span className="h2h-team-loc">
                  {[data2.tbaInfo?.city, data2.tbaInfo?.state_prov].filter(Boolean).join(', ')}
                </span>
              </div>
            </div>

            {/* Event stats section */}
            {hasEvent && (
              <>
                <div className="h2h-section-label">
                  Event: {settings.eventCode}
                </div>
                <CompRow
                  label="EPA"
                  v1={safe(data1, 'evtStats.epa.total_points.mean')}
                  v2={safe(data2, 'evtStats.epa.total_points.mean')}
                  fmt={v => parseFloat(v).toFixed(1)}
                />
                <CompRow
                  label="Rank"
                  v1={safe(data1, 'evtStats.rank')}
                  v2={safe(data2, 'evtStats.rank')}
                  higherIsBetter={false}
                  fmt={v => `#${v}`}
                />
                <CompRow
                  label="Record"
                  v1={record(data1)}
                  v2={record(data2)}
                  fmt={v => v}
                />
              </>
            )}

            {/* All-time stats section */}
            <div className="h2h-section-label">All-Time</div>
            <CompRow
              label="EPA"
              v1={safe(data1, 'allStats.epa.total_points.mean')}
              v2={safe(data2, 'allStats.epa.total_points.mean')}
              fmt={v => parseFloat(v).toFixed(1)}
            />

            <div className="schedule-footer" style={{ marginTop: 16 }}>
              Data from Statbotics & The Blue Alliance
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
