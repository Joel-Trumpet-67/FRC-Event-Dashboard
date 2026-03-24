import React from 'react'

/**
 * Top header bar: team name, match number controls, sync status dot, settings button.
 *
 * syncStatus:
 *   'live'  — Firebase connected, changes sync in real-time (green dot)
 *   'local' — No sync code set, localStorage only (grey dot)
 *   'error' — Firebase configured but disconnected (red dot)
 */
export default function Header({ teamNumber, matchNumber, onMatchChange, onSettingsOpen, onScheduleOpen, syncStatus }) {
  function decrement() {
    if (matchNumber > 1) onMatchChange(matchNumber - 1)
  }

  function increment() {
    onMatchChange(matchNumber + 1)
  }

  const syncDot = {
    live:  { color: '#22c55e', label: 'Live',  title: 'Syncing live with all devices' },
    local: { color: '#64748b', label: 'Local', title: 'Local only — set a Sync Code in Settings to share' },
    error: { color: '#ef4444', label: 'Off',   title: 'Sync disconnected — check connection' },
  }[syncStatus] ?? { color: '#64748b', label: 'Local', title: 'Local only' }

  return (
    <header className="header">
      <div className="header-left">
        <span className="header-logo">⚡</span>
        <div className="header-title-group">
          <span className="header-title">Battery Pit</span>
          {teamNumber && (
            <span className="header-team">Team {teamNumber}</span>
          )}
        </div>
      </div>

      <div className="header-match">
        <button className="match-btn" onClick={decrement} aria-label="Previous match day">‹</button>
        <div className="match-display">
          <span className="match-label">Match Day</span>
          <span className="match-number">{matchNumber}</span>
        </div>
        <button className="match-btn" onClick={increment} aria-label="Next match day">›</button>
      </div>

      <div className="header-right">
        <div className="sync-indicator" title={syncDot.title}>
          <span
            className={`sync-dot ${syncStatus === 'live' ? 'sync-dot-pulse' : ''}`}
            style={{ background: syncDot.color }}
          />
          <span className="sync-label">{syncDot.label}</span>
        </div>
        <button className="icon-btn" onClick={onScheduleOpen} aria-label="Match Schedule">📅</button>
        <button className="icon-btn" onClick={onSettingsOpen} aria-label="Settings">⚙</button>
      </div>
    </header>
  )
}
