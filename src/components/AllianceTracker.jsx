import React, { useState, useEffect } from 'react'
import { loadAlliance, saveAlliance } from '../utils/storage'
import { fetchEventTeams } from '../utils/tbaApi'

const STATUS_ORDER = { want: 0, neutral: 1, picked: 2, avoid: 3 }
const STATUS_LABELS = { want: '✅ Want', neutral: '—', picked: '⛔ Picked', avoid: '❌ Avoid' }
const STATUS_CYCLE  = { neutral: 'want', want: 'avoid', avoid: 'picked', picked: 'neutral' }

export default function AllianceTracker({ settings, onBack }) {
  const [teams,       setTeams]       = useState(() => loadAlliance())
  const [addInput,    setAddInput]    = useState('')
  const [importing,   setImporting]   = useState(false)
  const [importError, setImportError] = useState(null)

  useEffect(() => { saveAlliance(teams) }, [teams])

  function addTeam() {
    const num = addInput.trim().replace(/\D/g, '')
    if (!num) return
    if (teams.find(t => String(t.teamNumber) === num)) {
      setAddInput('')
      return
    }
    setTeams(prev => [...prev, { teamNumber: num, name: '', status: 'neutral' }])
    setAddInput('')
  }

  function handleKey(e) {
    if (e.key === 'Enter') addTeam()
  }

  function cycleStatus(teamNumber) {
    setTeams(prev => prev.map(t =>
      t.teamNumber === teamNumber
        ? { ...t, status: STATUS_CYCLE[t.status] ?? 'neutral' }
        : t
    ))
  }

  function removeTeam(teamNumber) {
    setTeams(prev => prev.filter(t => t.teamNumber !== teamNumber))
  }

  async function importFromEvent() {
    if (!settings.tbaKey)    { setImportError('Enter your TBA API key in Settings first.'); return }
    if (!settings.eventCode) { setImportError('Enter an event code in Settings first.'); return }
    setImporting(true)
    setImportError(null)
    try {
      const eventTeams = await fetchEventTeams(settings.eventCode, settings.tbaKey)
      const existing   = new Set(teams.map(t => String(t.teamNumber)))
      const newTeams   = eventTeams
        .filter(t => !existing.has(String(t.team_number)))
        .map(t => ({ teamNumber: String(t.team_number), name: t.nickname ?? '', status: 'neutral' }))
      setTeams(prev => [...prev, ...newTeams])
    } catch (e) {
      setImportError(`Import failed: ${e.message}`)
    }
    setImporting(false)
  }

  function clearAll() {
    setTeams([])
  }

  const sorted = [...teams].sort((a, b) =>
    (STATUS_ORDER[a.status] ?? 1) - (STATUS_ORDER[b.status] ?? 1) ||
    Number(a.teamNumber) - Number(b.teamNumber)
  )

  const ownTeam = String(settings.teamNumber)

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">🤝 Alliance Tracker</span>
        <button
          className="icon-btn"
          onClick={importFromEvent}
          disabled={importing}
          title="Import all event teams"
        >
          {importing ? '…' : '⬇'}
        </button>
      </div>

      <div className="view-body">
        {importError && (
          <div className="schedule-error-msg" style={{ marginBottom: 10 }}>{importError}</div>
        )}

        <div className="alliance-add-row">
          <input
            className="setting-input"
            type="number"
            placeholder="Add team number"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={handleKey}
            min="1"
            max="99999"
          />
          <button className="lookup-search-btn" onClick={addTeam} disabled={!addInput.trim()}>
            Add
          </button>
        </div>

        <div className="alliance-legend">
          <span className="alliance-legend-item want">✅ Want</span>
          <span className="alliance-legend-item avoid">❌ Avoid</span>
          <span className="alliance-legend-item picked">⛔ Picked</span>
          <span className="alliance-legend-item neutral">— Neutral</span>
        </div>

        {sorted.length === 0 ? (
          <div className="schedule-empty">
            No teams added yet.<br/>
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Add teams manually or tap ⬇ to import all event teams.
            </span>
          </div>
        ) : (
          <div className="alliance-list">
            {sorted.map(team => (
              <div
                key={team.teamNumber}
                className={`alliance-row status-${team.status}${team.teamNumber === ownTeam ? ' own-team' : ''}`}
              >
                <div className="alliance-team-info" onClick={() => cycleStatus(team.teamNumber)}>
                  <span className="alliance-team-num">
                    {team.teamNumber === ownTeam && '⚡ '}
                    {team.teamNumber}
                  </span>
                  {team.name && <span className="alliance-team-name">{team.name}</span>}
                </div>
                <div className="alliance-row-right">
                  <span className="alliance-status-label">{STATUS_LABELS[team.status]}</span>
                  <button
                    className="alliance-remove-btn"
                    onClick={() => removeTeam(team.teamNumber)}
                    aria-label="Remove"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {teams.length > 0 && (
          <button className="reset-btn" style={{ marginTop: 16 }} onClick={clearAll}>
            🗑 Clear All Teams
          </button>
        )}

        <div className="schedule-footer">
          Tap a team to cycle status. Tap ⬇ to import all teams from your event.
        </div>
      </div>
    </div>
  )
}
