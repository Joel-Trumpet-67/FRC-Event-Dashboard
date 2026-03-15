import React, { useState, useEffect } from 'react'
import { getBestNextBattery, getInBotBattery, STATUS_COLOR } from '../utils/batteryLogic'
import { formatElapsed, estimateChargePercent } from '../utils/formatting'

/**
 * Ultra-simple full-screen view for field phones / drive coaches.
 * Shows only: USE NEXT battery, IN BOT battery, match number.
 * No tapping, no actions — read-only at a glance.
 */
export default function FieldView({ batteries, matchNumber, chargeThresholdMin, teamNumber, syncStatus }) {
  const [tick, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 10_000)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()
  const bestNext = getBestNextBattery(batteries, chargeThresholdMin)
  const inBot = getInBotBattery(batteries)

  const inBotElapsed = inBot?.putInBotTime ? now - inBot.putInBotTime : null

  const chargeProgress = bestNext?.status === 'charging' && bestNext?.chargeStartTime
    ? estimateChargePercent(bestNext.chargeStartTime, chargeThresholdMin * 60 * 1000)
    : null

  const syncDot = { live: '#22c55e', local: '#64748b', error: '#ef4444' }[syncStatus] ?? '#64748b'

  return (
    <div className="field-view">

      {/* Top bar */}
      <div className="field-topbar">
        <div className="field-match">
          <span className="field-match-label">MATCH</span>
          <span className="field-match-number">{matchNumber}</span>
        </div>
        {teamNumber && (
          <div className="field-team">Team {teamNumber}</div>
        )}
        <div className="field-sync-dot" style={{ background: syncDot }} title={syncStatus} />
      </div>

      {/* USE NEXT — dominant section */}
      <div className="field-next-section">
        <div className="field-section-label">⚡ GRAB THIS BATTERY</div>

        {bestNext ? (
          <div
            className="field-next-card"
            style={{ borderColor: STATUS_COLOR[bestNext.status] }}
          >
            <div className="field-next-name">{bestNext.label}</div>
            <div className="field-next-status" style={{ color: STATUS_COLOR[bestNext.status] }}>
              {bestNext.status === 'ready' ? '✅ FULLY CHARGED' : `⏱ ${chargeProgress ?? '—'}% CHARGED`}
            </div>
            {bestNext.voltage && (
              <div className="field-next-voltage">{bestNext.voltage.toFixed(1)}V</div>
            )}
            {chargeProgress !== null && (
              <div className="field-progress-track">
                <div
                  className="field-progress-fill"
                  style={{ width: `${chargeProgress}%` }}
                />
              </div>
            )}
          </div>
        ) : (
          <div className="field-next-card field-warn">
            <div className="field-next-name">⚠ NONE READY</div>
            <div className="field-next-status">Call pit for status</div>
          </div>
        )}
      </div>

      {/* IN BOT — smaller section */}
      <div className="field-inbot-section">
        <div className="field-section-label">🤖 IN BOT</div>
        {inBot ? (
          <div className="field-inbot-card">
            <span className="field-inbot-name">{inBot.label}</span>
            {inBotElapsed !== null && (
              <span className="field-inbot-time">{formatElapsed(inBotElapsed)}</span>
            )}
          </div>
        ) : (
          <div className="field-inbot-card field-empty">No battery in bot</div>
        )}
      </div>

    </div>
  )
}
