import React, { useState } from 'react'
import { fetchTeamSimple } from '../utils/tbaApi'
import { fetchTeamEventStats, fetchTeamStats } from '../utils/statboticsApi'

export default function TeamLookup({ settings, onBack }) {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState(null)  // { tba, statAll, statEvent }
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function search() {
    const num = query.trim().replace(/\D/g, '')
    if (!num) return
    if (!settings.tbaKey) { setError('Enter your TBA API key in Settings first.'); return }

    setLoading(true)
    setError(null)
    setResult(null)

    const [tbaRes, statAllRes, statEventRes] = await Promise.allSettled([
      fetchTeamSimple(num, settings.tbaKey),
      fetchTeamStats(num),
      settings.eventCode
        ? fetchTeamEventStats(num, settings.eventCode)
        : Promise.reject(new Error('no event')),
    ])

    if (tbaRes.status === 'rejected') {
      setError(`Team ${num} not found. Check the team number.`)
      setLoading(false)
      return
    }

    setResult({
      tba:       tbaRes.value,
      statAll:   statAllRes.status   === 'fulfilled' ? statAllRes.value   : null,
      statEvent: statEventRes.status === 'fulfilled' ? statEventRes.value : null,
    })
    setLoading(false)
  }

  function handleKey(e) {
    if (e.key === 'Enter') search()
  }

  const r = result

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">🔍 Team Lookup</span>
      </div>

      <div className="view-body">
        <div className="lookup-search-row">
          <input
            className="setting-input"
            type="number"
            placeholder="Team number (e.g. 1678)"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={handleKey}
            min="1"
            max="99999"
          />
          <button className="lookup-search-btn" onClick={search} disabled={loading || !query.trim()}>
            {loading ? '…' : 'Search'}
          </button>
        </div>

        {error && <div className="schedule-error-msg" style={{ marginTop: 12 }}>{error}</div>}

        {r && (
          <div className="lookup-result">
            <div className="lookup-team-name">{r.tba.nickname ?? `Team ${r.tba.team_number}`}</div>
            <div className="lookup-team-location">
              {[r.tba.city, r.tba.state_prov, r.tba.country].filter(Boolean).join(', ')}
            </div>

            <div className="lookup-stats">
              {/* Overall Statbotics stats */}
              {r.statAll && (
                <>
                  <StatCard
                    label="Overall EPA"
                    value={r.statAll.epa?.total_points?.mean?.toFixed(1) ?? '—'}
                  />
                  <StatCard
                    label="All-time Wins"
                    value={r.statAll.record?.wins ?? '—'}
                  />
                </>
              )}

              {/* This-event stats */}
              {r.statEvent && (
                <>
                  <StatCard
                    label="Event EPA"
                    value={r.statEvent.epa?.total_points?.mean?.toFixed(1) ?? r.statEvent.epa?.mean?.toFixed(1) ?? '—'}
                  />
                  <StatCard
                    label="Event Rank"
                    value={
                      r.statEvent.rank && r.statEvent.num_teams
                        ? `${r.statEvent.rank}/${r.statEvent.num_teams}`
                        : r.statEvent.rank ?? '—'
                    }
                  />
                  {r.statEvent.record?.qual && (
                    <StatCard
                      label="Qual Record"
                      value={`${r.statEvent.record.qual.wins}-${r.statEvent.record.qual.losses}`}
                    />
                  )}
                  {r.statEvent.result && (
                    <StatCard label="Result" value={r.statEvent.result} />
                  )}
                </>
              )}
            </div>

            {!r.statAll && !r.statEvent && (
              <div className="lookup-no-stats">No Statbotics data available for this team.</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="lookup-stat-card">
      <span className="lookup-stat-label">{label}</span>
      <span className="lookup-stat-value">{value}</span>
    </div>
  )
}
