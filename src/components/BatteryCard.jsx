import React from 'react'
import {
  STATUS_COLOR,
  STATUS_BG,
  STATUS_LABEL,
  STATUS,
  assessVoltage,
  getBatteryHealth,
} from '../utils/batteryLogic'
import {
  formatElapsed,
  estimateChargePercent,
  estimateCoolPercent,
} from '../utils/formatting'

const STATUS_ICON = {
  depleted: '🔴',
  charging: '🔋',
  cooling:  '❄️',
  ready:    '✅',
  standby:  '⏸️',
  in_bot:   '🤖',
}

/**
 * Compact card showing one battery's status.
 * Tapping opens the detail modal.
 * Wrapped in React.memo — only re-renders when this battery's data changes (PERF-8).
 */
const BatteryCard = React.memo(function BatteryCard({ battery, isBestNext, chargeThresholdMin, coolThresholdMin, onPress }) {
  const now = Date.now()
  const thresholdMs = chargeThresholdMin * 60 * 1000
  const coolMs = coolThresholdMin * 60 * 1000

  // Calculate elapsed time in current status
  let elapsedMs = null
  let progressPercent = null
  let progressColor = STATUS_COLOR[battery.status]

  switch (battery.status) {
    case STATUS.CHARGING:
      elapsedMs = battery.chargeStartTime ? now - battery.chargeStartTime : null
      progressPercent = battery.chargeStartTime
        ? estimateChargePercent(battery.chargeStartTime, thresholdMs)
        : 0
      break
    case STATUS.COOLING:
      elapsedMs = battery.coolStartTime ? now - battery.coolStartTime : null
      progressPercent = battery.coolStartTime
        ? estimateCoolPercent(battery.coolStartTime, coolMs)
        : 0
      progressColor = '#f97316'
      break
    case STATUS.IN_BOT:
      elapsedMs = battery.putInBotTime ? now - battery.putInBotTime : null
      break
    case STATUS.READY:
      elapsedMs = battery.chargeEndTime ? now - battery.chargeEndTime : null
      break
    case STATUS.DEPLETED:
      elapsedMs = null
      break
    default:
      break
  }

  const voltageWarning = assessVoltage(battery.voltage).warning

  return (
    <button
      className={`battery-card ${isBestNext ? 'best-next' : ''}`}
      style={{ borderColor: STATUS_COLOR[battery.status], background: STATUS_BG[battery.status] }}
      onClick={() => onPress(battery)}
      aria-label={`${battery.label}: ${STATUS_LABEL[battery.status]}`}
    >
      {/* Best next badge */}
      {isBestNext && (
        <div className="best-badge">USE NEXT</div>
      )}

      {/* Status icon + label */}
      <div className="card-status-row">
        <span className="card-icon">{STATUS_ICON[battery.status]}</span>
        <span
          className="card-status-text"
          style={{ color: STATUS_COLOR[battery.status] }}
        >
          {STATUS_LABEL[battery.status].toUpperCase()}
        </span>
      </div>

      {/* Battery name */}
      <div className="card-label">{battery.label}</div>

      {/* Elapsed time */}
      {elapsedMs !== null && (
        <div className="card-elapsed">
          {battery.status === STATUS.CHARGING && '⏱ '}
          {battery.status === STATUS.COOLING && '❄ '}
          {battery.status === STATUS.IN_BOT && '🤖 '}
          {battery.status === STATUS.READY && '✓ '}
          {formatElapsed(elapsedMs)}
        </div>
      )}

      {/* Progress bar for charging / cooling */}
      {progressPercent !== null && (
        <div className="card-progress-track">
          <div
            className="card-progress-fill"
            style={{
              width: `${progressPercent}%`,
              background: progressPercent >= 100
                ? '#22c55e'
                : progressColor,
            }}
          />
        </div>
      )}

      {/* Voltage */}
      {battery.voltage != null && (
        <div className={`card-voltage ${voltageWarning ? 'warn' : ''}`}>
          {battery.voltage.toFixed(2)}V
          {voltageWarning && <span className="voltage-warn-dot">⚠</span>}
        </div>
      )}

      {/* Cycle count */}
      <div className="card-cycles">Cycles: {battery.cycleCount}</div>

    </button>
  )
})

export default BatteryCard
