import React from 'react'

/**
 * Top header bar: team name, match number controls, settings button.
 */
export default function Header({ teamNumber, matchNumber, onMatchChange, onSettingsOpen }) {
  function decrement() {
    if (matchNumber > 1) onMatchChange(matchNumber - 1)
  }

  function increment() {
    onMatchChange(matchNumber + 1)
  }

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
        <button className="match-btn" onClick={decrement} aria-label="Previous match">‹</button>
        <div className="match-display">
          <span className="match-label">Match</span>
          <span className="match-number">{matchNumber}</span>
        </div>
        <button className="match-btn" onClick={increment} aria-label="Next match">›</button>
      </div>

      <button className="icon-btn" onClick={onSettingsOpen} aria-label="Settings" title="Settings">
        ⚙
      </button>
    </header>
  )
}
