import React from 'react'

export default function ScoutingView({ onBack }) {
  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">📡 Scouting</span>
      </div>

      <div className="view-body coming-soon-body">
        <div className="coming-soon-icon">📡</div>
        <div className="coming-soon-title">Coming Soon</div>
        <div className="coming-soon-desc">
          Scouting is in development. Check back in a future update.
        </div>
      </div>
    </div>
  )
}
