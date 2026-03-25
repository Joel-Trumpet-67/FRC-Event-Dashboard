import React, { useState, useEffect } from 'react'
import { fetchEventOPRs, fetchEventInfo } from '../utils/tbaApi'

// Sort columns
const COLS = [
  { key: 'opr',  label: 'OPR',  title: 'Offensive Power Rating' },
  { key: 'dpr',  label: 'DPR',  title: 'Defensive Power Rating (lower = better defender)' },
  { key: 'ccwm', label: 'CCWM', title: 'Calculated Contribution to Winning Margin' },
]

export default function OPRView({ settings, onBack }) {
  const [data,      setData]      = useState(null)
  const [eventInfo, setEventInfo] = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [sortBy,    setSortBy]    = useState('opr')

  useEffect(() => { load() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  async function load() {
    const { tbaKey, eventCode } = settings
    if (!tbaKey)    { setError('Enter your TBA API key in Settings first.'); setLoading(false); return }
    if (!eventCode) { setError('Enter an event code in Settings first.');    setLoading(false); return }

    setLoading(true)
    setError(null)
    try {
      const [oprs, info] = await Promise.all([
        fetchEventOPRs(eventCode, tbaKey),
        fetchEventInfo(eventCode, tbaKey).catch(() => null),
      ])
      setData(oprs)
      setEventInfo(info)
    } catch (e) {
      setError(`Failed to load OPR data.\n\n${e.message}`)
    }
    setLoading(false)
  }

  const teamKey = `frc${settings.teamNumber}`

  // Build sorted rows from the oprs/dprs/ccwms maps
  const teams = data
    ? Object.keys(data.oprs ?? {})
        .map(key => ({
          key,
          opr:  data.oprs[key]  ?? 0,
          dpr:  data.dprs[key]  ?? 0,
          ccwm: data.ccwms[key] ?? 0,
        }))
        .sort((a, b) =>
          sortBy === 'dpr'
            ? a.dpr - b.dpr            // lower DPR is better — sort ascending
            : b[sortBy] - a[sortBy]    // OPR/CCWM — higher is better
        )
    : []

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">
          📊 {eventInfo?.name ?? settings.eventCode ?? 'OPR / DPR'}
        </span>
        <button className="icon-btn" onClick={load} disabled={loading} title="Refresh">🔄</button>
      </div>

      <div className="view-body">

        {loading && (
          <div className="schedule-loading">
            <div className="schedule-spinner" />
            Loading OPR data…
          </div>
        )}

        {!loading && error && (
          <div className="schedule-error">
            <div className="schedule-error-msg">{error}</div>
            <button className="schedule-retry-btn" onClick={load}>Retry</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            {/* Sort selector */}
            <div className="opr-sort-bar">
              {COLS.map(col => (
                <button
                  key={col.key}
                  className={`opr-sort-btn${sortBy === col.key ? ' active' : ''}`}
                  title={col.title}
                  onClick={() => setSortBy(col.key)}
                >
                  {col.label}
                </button>
              ))}
            </div>

            {teams.length === 0 ? (
              <div className="schedule-empty">No OPR data available yet.</div>
            ) : (
              <div className="opr-table">
                <div className="opr-header-row">
                  <span className="opr-rank-col">#</span>
                  <span className="opr-team-col">Team</span>
                  <span className="opr-val-col">OPR</span>
                  <span className="opr-val-col">DPR</span>
                  <span className="opr-val-col">CCWM</span>
                </div>

                {teams.map((t, i) => (
                  <div
                    key={t.key}
                    className={`opr-row${t.key === teamKey ? ' own-team' : ''}`}
                  >
                    <span className="opr-rank-col">{i + 1}</span>
                    <span className="opr-team-col">
                      {t.key === teamKey && <span className="own-team-dot">● </span>}
                      {t.key.replace('frc', '')}
                    </span>
                    <span className="opr-val-col">{t.opr.toFixed(1)}</span>
                    <span className="opr-val-col opr-dpr">{t.dpr.toFixed(1)}</span>
                    <span className={`opr-val-col${t.ccwm >= 0 ? ' opr-ccwm-pos' : ' opr-ccwm-neg'}`}>
                      {t.ccwm >= 0 ? '+' : ''}{t.ccwm.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="opr-legend">
              <span><strong>OPR</strong> — pts added to alliance score</span>
              <span><strong>DPR</strong> — pts added to opponent score (↓ is better)</span>
              <span><strong>CCWM</strong> — OPR − DPR (winning margin contribution)</span>
            </div>

            <div className="schedule-footer">Data from The Blue Alliance</div>
          </>
        )}
      </div>
    </div>
  )
}
