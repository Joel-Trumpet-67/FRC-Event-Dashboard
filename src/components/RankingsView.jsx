import React, { useState, useEffect } from 'react'
import { fetchEventRankings, fetchEventInfo } from '../utils/tbaApi'

export default function RankingsView({ settings, onBack }) {
  const [rankings, setRankings]   = useState(null)
  const [sortInfo, setSortInfo]   = useState([])
  const [eventInfo, setEventInfo] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState(null)

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { tbaKey, eventCode } = settings
    if (!tbaKey)    { setError('Enter your TBA API key in Settings first.'); setLoading(false); return }
    if (!eventCode) { setError('Enter an event code in Settings first.'); setLoading(false); return }

    setLoading(true)
    setError(null)
    try {
      const [rankData, info] = await Promise.all([
        fetchEventRankings(eventCode, tbaKey),
        fetchEventInfo(eventCode, tbaKey).catch(() => null),
      ])
      setRankings(rankData.rankings ?? [])
      setSortInfo(rankData.sort_order_info ?? [])
      setEventInfo(info)
    } catch (e) {
      setError(`Failed to load rankings.\n\n${e.message}`)
    }
    setLoading(false)
  }

  const teamKey = `frc${settings.teamNumber}`

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">
          🏆 {eventInfo?.name ?? settings.eventCode ?? 'Rankings'}
        </span>
        <button className="icon-btn" onClick={load} disabled={loading} title="Refresh">🔄</button>
      </div>

      <div className="view-body">
        {loading && (
          <div className="schedule-loading">
            <div className="schedule-spinner" />
            Loading rankings…
          </div>
        )}

        {!loading && error && (
          <div className="schedule-error">
            <div className="schedule-error-msg">{error}</div>
            <button className="schedule-retry-btn" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && rankings && (
          <>
            {rankings.length === 0 ? (
              <div className="schedule-empty">No rankings posted yet.</div>
            ) : (
              <div className="rankings-table">
                <div className="rankings-header-row">
                  <span className="rank-col">#</span>
                  <span className="team-col">Team</span>
                  <span className="record-col">W-L-T</span>
                  {sortInfo[0] && <span className="rs-col">{sortInfo[0].name}</span>}
                </div>
                {rankings.map(row => {
                  const isUs = row.team_key === teamKey
                  const rec  = row.record ?? {}
                  const w    = rec.wins   ?? row.wins   ?? 0
                  const l    = rec.losses ?? row.losses ?? 0
                  const t    = rec.ties   ?? row.ties   ?? 0
                  const rs   = row.sort_orders?.[0] ?? null
                  return (
                    <div
                      key={row.team_key}
                      className={`rankings-row${isUs ? ' own-team' : ''}`}
                    >
                      <span className="rank-col">{row.rank}</span>
                      <span className="team-col">
                        {isUs && <span className="own-team-dot">● </span>}
                        {row.team_key.replace('frc', '')}
                      </span>
                      <span className="record-col">{w}-{l}{t > 0 ? `-${t}` : ''}</span>
                      {sortInfo[0] && (
                        <span className="rs-col">
                          {rs !== null ? rs.toFixed(sortInfo[0].precision ?? 2) : '—'}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            <div className="schedule-footer">Data from The Blue Alliance</div>
          </>
        )}
      </div>
    </div>
  )
}
