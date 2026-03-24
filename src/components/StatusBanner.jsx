import React from 'react'
import { formatElapsed, estimateChargePercent } from '../utils/formatting'
import { getNextReadyEta, STATUS_COLOR, STATUS } from '../utils/batteryLogic'

/**
 * Full-width banner showing:
 *  - Which battery is in the bot
 *  - Which battery to use next (recommendation)
 *  - ETA until next battery is ready (if none are ready yet)
 */
export default function StatusBanner({
  batteries,
  inBotBattery,
  bestNext,
  chargeThresholdMin,
  onBatteryClick,
}) {
  const spareBattery = batteries.find(b => b.status === STATUS.STANDBY) ?? null
  const now = Date.now()

  // Elapsed time this battery has been in the bot
  const inBotElapsed = inBotBattery?.putInBotTime
    ? now - inBotBattery.putInBotTime
    : null

  // ETA until any battery is ready (if no best next)
  const etaMs = !bestNext ? getNextReadyEta(batteries, chargeThresholdMin) : null

  // Charge progress of best next battery (if it's still charging)
  const bestNextProgress =
    bestNext?.status === 'charging' && bestNext?.chargeStartTime
      ? estimateChargePercent(bestNext.chargeStartTime, chargeThresholdMin * 60 * 1000)
      : null

  return (
    <div className="status-banner">
      {/* IN BOT card */}
      <div
        className={`banner-card in-bot-card ${inBotBattery ? 'clickable' : 'empty'}`}
        onClick={() => inBotBattery && onBatteryClick(inBotBattery)}
        role={inBotBattery ? 'button' : undefined}
      >
        <div className="banner-card-label">🤖 IN BOT</div>
        {inBotBattery ? (
          <>
            <div className="banner-card-name">{inBotBattery.label}</div>
            <div className="banner-card-sub">
              {inBotElapsed != null ? formatElapsed(inBotElapsed) : '—'} in bot
            </div>
            {inBotBattery.voltage && (
              <div className="banner-card-voltage">{inBotBattery.voltage.toFixed(1)}V</div>
            )}
          </>
        ) : (
          <div className="banner-card-empty">No battery in bot</div>
        )}
      </div>

      {/* SPARE card */}
      <div
        className={`banner-card spare-card ${spareBattery ? 'clickable' : 'empty'}`}
        onClick={() => spareBattery && onBatteryClick(spareBattery)}
        role={spareBattery ? 'button' : undefined}
      >
        <div className="banner-card-label">⏸ STANDBY</div>
        {spareBattery ? (
          <>
            <div className="banner-card-name">{spareBattery.label}</div>
            {spareBattery.voltage && (
              <div className="banner-card-voltage">{spareBattery.voltage.toFixed(1)}V</div>
            )}
          </>
        ) : (
          <div className="banner-card-empty">None marked</div>
        )}
      </div>

      {/* USE NEXT card */}
      <div
        className={`banner-card use-next-card ${bestNext ? 'clickable' : 'warn'}`}
        onClick={() => bestNext && onBatteryClick(bestNext)}
        role={bestNext ? 'button' : undefined}
      >
        <div className="banner-card-label">⚡ USE NEXT</div>
        {bestNext ? (
          <>
            <div className="banner-card-name" style={{ color: STATUS_COLOR[bestNext.status] }}>
              {bestNext.label}
            </div>
            <div className="banner-card-sub">
              {bestNext.status === 'ready'
                ? 'Fully charged ✓'
                : `${estimateChargePercent(
                    bestNext.chargeStartTime,
                    chargeThresholdMin * 60 * 1000
                  )}% — ready`}
            </div>
            {bestNextProgress !== null && (
              <div className="banner-progress-bar">
                <div
                  className="banner-progress-fill"
                  style={{ width: `${bestNextProgress}%` }}
                />
              </div>
            )}
            {bestNext.voltage && (
              <div className="banner-card-voltage">{bestNext.voltage.toFixed(1)}V</div>
            )}
          </>
        ) : etaMs !== null ? (
          <>
            <div className="banner-card-empty warn-text">No battery ready yet</div>
            <div className="banner-card-sub">
              Next ready in ~{formatElapsed(etaMs)}
            </div>
          </>
        ) : (
          <div className="banner-card-empty warn-text">⚠ Put batteries on charger!</div>
        )}
      </div>
    </div>
  )
}
