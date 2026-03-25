import React, { useState, useEffect } from 'react'
import { loadMatchNotes, saveMatchNotes } from '../utils/storage'

export default function MatchNotes({ matchNumber, onBack }) {
  const [notes,       setNotes]       = useState(() => loadMatchNotes())
  const [activeMatch, setActiveMatch] = useState(matchNumber)
  const [draft,       setDraft]       = useState('')
  const [editing,     setEditing]     = useState(false)

  // Sync draft when active match changes
  useEffect(() => {
    setDraft(notes[activeMatch] ?? '')
    setEditing(false)
  }, [activeMatch]) // eslint-disable-line react-hooks/exhaustive-deps

  function saveDraft() {
    const trimmed = draft.trim()
    const updated = { ...notes }
    if (trimmed) {
      updated[activeMatch] = trimmed
    } else {
      delete updated[activeMatch]
    }
    setNotes(updated)
    saveMatchNotes(updated)
    setEditing(false)
  }

  // All match numbers that have notes, plus the current match
  const matchesWithNotes = Array.from(
    new Set([...Object.keys(notes).map(Number), activeMatch])
  ).sort((a, b) => a - b)

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">📝 Match Notes</span>
      </div>

      <div className="view-body">
        {/* Match selector */}
        <div className="notes-match-tabs">
          {matchesWithNotes.map(n => (
            <button
              key={n}
              className={`notes-match-tab${n === activeMatch ? ' active' : ''}${notes[n] ? ' has-note' : ''}`}
              onClick={() => setActiveMatch(n)}
            >
              M{n}
            </button>
          ))}
          <button
            className="notes-match-tab notes-add-match"
            onClick={() => {
              const next = Math.max(...matchesWithNotes) + 1
              setActiveMatch(next)
            }}
          >
            +
          </button>
        </div>

        {/* Editor */}
        <div className="notes-editor">
          <div className="notes-editor-header">
            <span className="notes-match-label">Match {activeMatch}</span>
            {!editing && (
              <button className="notes-edit-btn" onClick={() => setEditing(true)}>
                {notes[activeMatch] ? '✏ Edit' : '+ Add Note'}
              </button>
            )}
          </div>

          {editing ? (
            <>
              <textarea
                className="notes-textarea"
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Notes for this match…"
                rows={6}
                autoFocus
              />
              <div className="notes-actions">
                <button className="save-settings-btn" onClick={saveDraft}>Save</button>
                <button className="cancel-reset-btn" onClick={() => {
                  setDraft(notes[activeMatch] ?? '')
                  setEditing(false)
                }}>
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <div className="notes-display">
              {notes[activeMatch]
                ? <pre className="notes-text">{notes[activeMatch]}</pre>
                : <span className="notes-empty">No notes for Match {activeMatch}.</span>
              }
            </div>
          )}
        </div>

        {/* All notes summary */}
        {Object.keys(notes).length > 0 && (
          <div className="notes-summary">
            <div className="setting-divider">All Notes</div>
            {Object.entries(notes)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([m, text]) => (
                <div
                  key={m}
                  className={`notes-summary-row${Number(m) === activeMatch ? ' active' : ''}`}
                  onClick={() => setActiveMatch(Number(m))}
                >
                  <span className="notes-summary-match">M{m}</span>
                  <span className="notes-summary-preview">{text.slice(0, 60)}{text.length > 60 ? '…' : ''}</span>
                </div>
              ))
            }
          </div>
        )}
      </div>
    </div>
  )
}
