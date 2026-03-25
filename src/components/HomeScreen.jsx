import React from 'react'

const TILES = [
  { id: 'batteries',  icon: '🔋', label: 'Batteries',    sub: 'Charge cycle manager' },
  { id: 'schedule',   icon: '📅', label: 'Schedule',     sub: 'Matches & predictions' },
  { id: 'rankings',   icon: '🏆', label: 'Rankings',     sub: 'Event standings' },
  { id: 'teamlookup', icon: '🔍', label: 'Team Lookup',  sub: 'Search any team' },
  { id: 'checklist',  icon: '✅', label: 'Checklist',    sub: 'Pre-match robot check' },
  { id: 'alliance',   icon: '🤝', label: 'Alliance',     sub: 'Selection tracker' },
  { id: 'notes',      icon: '📝', label: 'Match Notes',  sub: 'Notes per match' },
  { id: 'scouting',   icon: '📡', label: 'Scouting',     sub: 'Coming soon' },
]

export default function HomeScreen({ teamNumber, syncStatus, onNavigate, onOpenSettings }) {
  const syncDot = { live: '#22c55e', local: '#64748b', error: '#ef4444' }[syncStatus] ?? '#64748b'

  return (
    <div className="home-screen">
      <div className="home-header">
        <div className="home-title-group">
          <span className="home-title">⚡ FRC Dashboard</span>
          {teamNumber && <span className="home-subtitle">Team {teamNumber}</span>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <div className="field-sync-dot" style={{ background: syncDot }} title={syncStatus} />
          <button className="icon-btn" onClick={onOpenSettings} aria-label="Settings">⚙</button>
        </div>
      </div>

      <div className="home-grid">
        {TILES.map(tile => (
          <button
            key={tile.id}
            className={`home-tile${tile.id === 'scouting' ? ' coming-soon' : ''}`}
            onClick={() => onNavigate(tile.id)}
          >
            <span className="home-tile-icon">{tile.icon}</span>
            <span className="home-tile-label">{tile.label}</span>
            <span className="home-tile-sub">{tile.sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
