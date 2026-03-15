import React, { useState, useEffect } from 'react'
import {
  STATUS,
  STATUS_LABEL,
  STATUS_COLOR,
  assessVoltage,
  assessIR,
  getBatteryHealth,
} from '../utils/batteryLogic'
import { formatElapsed, formatDateTime, estimateChargePercent } from '../utils/formatting'

/**
 * Full-screen detail modal for a single battery.
 * Shows status, actions, readings input, and history log.
 */
export default function BatteryModal({
  battery,
  chargeThresholdMin,
  coolThresholdMin,
  viewOnly,
  onClose,
  onStartCharging,
  onMarkReady,
  onCancelCharging,
  onPutInBot,
  onRemoveFromBot,
  onMarkDepleted,
  onUpdateReadings,
  onUpdateMeta,
}) {
  const [voltageInput, setVoltageInput] = useState(
    battery.voltage != null ? String(battery.voltage) : ''
  )
  const [irInput, setIrInput] = useState(
    battery.internalResistance != null ? String(battery.internalResistance) : ''
  )
  const [labelInput, setLabelInput] = useState(battery.label)
  const [notesInput, setNotesInput] = useState(battery.notes || '')
  const [showHistory, setShowHistory] = useState(false)
  const [editingLabel, setEditingLabel] = useState(false)
  const [tick, setTick] = useState(0)

  // Re-render every 5 seconds to update elapsed timers
  useEffect(() => {
    const id = setInterval(() => setTick(t => t + 1), 5000)
    return () => clearInterval(id)
  }, [])

  const now = Date.now()
  const thresholdMs = chargeThresholdMin * 60 * 1000

  // Charge progress if charging
  const chargeProgress = battery.status === STATUS.CHARGING && battery.chargeStartTime
    ? estimateChargePercent(battery.chargeStartTime, thresholdMs)
    : null

  // Elapsed in current status
  let elapsedMs = null
  if (battery.status === STATUS.CHARGING && battery.chargeStartTime) {
    elapsedMs = now - battery.chargeStartTime
  } else if (battery.status === STATUS.COOLING && battery.coolStartTime) {
    elapsedMs = now - battery.coolStartTime
  } else if (battery.status === STATUS.IN_BOT && battery.putInBotTime) {
    elapsedMs = now - battery.putInBotTime
  } else if (battery.status === STATUS.READY && battery.chargeEndTime) {
    elapsedMs = now - battery.chargeEndTime
  }

  function saveReadings() {
    const v = voltageInput !== '' ? parseFloat(voltageInput) : undefined
    const ir = irInput !== '' ? parseFloat(irInput) : undefined
    if ((v !== undefined && isNaN(v)) || (ir !== undefined && isNaN(ir))) return
    onUpdateReadings({ voltage: v, internalResistance: ir })
  }

  function saveLabel() {
    if (labelInput.trim()) {
      onUpdateMeta({ label: labelInput.trim(), notes: notesInput })
    }
    setEditingLabel(false)
  }

  function saveNotes() {
    onUpdateMeta({ label: labelInput, notes: notesInput })
  }

  const voltageAssess = assessVoltage(parseFloat(voltageInput) || null)
  const irAssess = assessIR(parseFloat(irInput) || null)
  const health = getBatteryHealth(battery)

  // Build action buttons based on current status
  function ActionButtons() {
    switch (battery.status) {
      case STATUS.DEPLETED:
        return (
          <div className="action-group">
            <ActionBtn color="#f59e0b" icon="🔌" label="Start Charging" onClick={onStartCharging} />
          </div>
        )
      case STATUS.CHARGING:
        return (
          <div className="action-group">
            <ActionBtn color="#22c55e" icon="✅" label="Mark Ready" onClick={onMarkReady} />
            <ActionBtn color="#ef4444" icon="✖" label="Cancel Charge" onClick={onCancelCharging} secondary />
          </div>
        )
      case STATUS.COOLING:
        return (
          <div className="action-group">
            <ActionBtn color="#f59e0b" icon="🔌" label="Start Charging" onClick={onStartCharging} />
            <ActionBtn color="#ef4444" icon="✖" label="Mark Depleted" onClick={onMarkDepleted} secondary />
          </div>
        )
      case STATUS.READY:
        return (
          <div className="action-group">
            <ActionBtn color="#3b82f6" icon="🤖" label="Put in Bot" onClick={onPutInBot} />
            <ActionBtn color="#ef4444" icon="✖" label="Mark Depleted" onClick={onMarkDepleted} secondary />
          </div>
        )
      case STATUS.IN_BOT:
        return (
          <div className="action-group">
            <ActionBtn color="#f97316" icon="❄️" label="Remove → Cooling" onClick={() => onRemoveFromBot(false)} />
            <ActionBtn color="#ef4444" icon="🔴" label="Remove → Depleted" onClick={() => onRemoveFromBot(true)} secondary />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="modal-header" style={{ borderColor: STATUS_COLOR[battery.status] }}>
          <div className="modal-header-left">
            {editingLabel ? (
              <div className="label-edit-row">
                <input
                  className="label-input"
                  value={labelInput}
                  onChange={e => setLabelInput(e.target.value)}
                  onBlur={saveLabel}
                  onKeyDown={e => e.key === 'Enter' && saveLabel()}
                  autoFocus
                  maxLength={20}
                />
              </div>
            ) : (
              <button className="modal-title" onClick={() => setEditingLabel(true)} title="Tap to rename">
                {battery.label} ✏️
              </button>
            )}
            <div
              className="modal-status-pill"
              style={{ background: STATUS_COLOR[battery.status] }}
            >
              {STATUS_LABEL[battery.status].toUpperCase()}
            </div>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">
          {/* Elapsed / progress section */}
          <div className="modal-section">
            {chargeProgress !== null && (
              <div className="charge-progress-container">
                <div className="charge-progress-track">
                  <div
                    className="charge-progress-fill"
                    style={{
                      width: `${chargeProgress}%`,
                      background: chargeProgress >= 100 ? '#22c55e' : '#f59e0b',
                    }}
                  />
                </div>
                <div className="charge-progress-label">
                  {chargeProgress}% charged — {formatElapsed(elapsedMs)} elapsed
                </div>
              </div>
            )}

            {elapsedMs !== null && chargeProgress === null && (
              <div className="modal-elapsed">
                {battery.status === STATUS.IN_BOT && '🤖 In bot for: '}
                {battery.status === STATUS.COOLING && '❄️ Cooling for: '}
                {battery.status === STATUS.READY && '✅ Ready for: '}
                <strong>{formatElapsed(elapsedMs)}</strong>
              </div>
            )}
          </div>

          {/* Key stats row */}
          <div className="stats-row">
            <div className="stat-box">
              <div className="stat-label">Cycles</div>
              <div className="stat-value">{battery.cycleCount}</div>
            </div>
            <div className="stat-box">
              <div className="stat-label">Health</div>
              <div className="stat-value">{health}</div>
            </div>
            {battery.voltage != null && (
              <div className="stat-box">
                <div className="stat-label">Voltage</div>
                <div className="stat-value">{battery.voltage.toFixed(2)}V</div>
              </div>
            )}
            {battery.internalResistance != null && (
              <div className="stat-box">
                <div className="stat-label">IR</div>
                <div className="stat-value">{battery.internalResistance}mΩ</div>
              </div>
            )}
          </div>

          {/* Action buttons — hidden in view-only mode */}
          {viewOnly
            ? <div className="view-only-banner">👁 View Only — actions disabled</div>
            : <ActionButtons />
          }

          {/* Readings section */}
          <div className="modal-section readings-section">
            <div className="section-title">📊 Readings</div>
            <div className="readings-row">
              <div className="reading-field">
                <label className="reading-label">Voltage (V)</label>
                <input
                  type="number"
                  className="reading-input"
                  placeholder="e.g. 12.6"
                  value={voltageInput}
                  onChange={e => setVoltageInput(e.target.value)}
                  step="0.01"
                  min="0"
                  max="15"
                />
                {voltageInput && !isNaN(parseFloat(voltageInput)) && (
                  <div className={`reading-hint ${voltageAssess.warning ? 'warn' : 'ok'}`}>
                    {voltageAssess.warning || '✓ Good'}
                  </div>
                )}
              </div>
              <div className="reading-field">
                <label className="reading-label">Int. Resistance (mΩ)</label>
                <input
                  type="number"
                  className="reading-input"
                  placeholder="e.g. 12"
                  value={irInput}
                  onChange={e => setIrInput(e.target.value)}
                  step="0.1"
                  min="0"
                />
                {irInput && !isNaN(parseFloat(irInput)) && (
                  <div className={`reading-hint ${irAssess.warning ? 'warn' : 'ok'}`}>
                    {irAssess.label} {irAssess.warning ? `— ${irAssess.warning}` : ''}
                  </div>
                )}
              </div>
            </div>
            <button className="save-readings-btn" onClick={saveReadings}>
              Save Readings
            </button>
          </div>

          {/* Notes section */}
          <div className="modal-section">
            <div className="section-title">📝 Notes</div>
            <textarea
              className="notes-input"
              placeholder="Any issues, observations, or notes..."
              value={notesInput}
              onChange={e => setNotesInput(e.target.value)}
              onBlur={saveNotes}
              rows={2}
            />
          </div>

          {/* Timestamps section */}
          <div className="modal-section">
            <div className="section-title">🕐 Timestamps</div>
            <div className="timestamp-list">
              {battery.chargeStartTime && (
                <div className="timestamp-row">
                  <span className="ts-label">Charge started:</span>
                  <span className="ts-value">{formatDateTime(battery.chargeStartTime)}</span>
                </div>
              )}
              {battery.chargeEndTime && (
                <div className="timestamp-row">
                  <span className="ts-label">Charge complete:</span>
                  <span className="ts-value">{formatDateTime(battery.chargeEndTime)}</span>
                </div>
              )}
              {battery.putInBotTime && (
                <div className="timestamp-row">
                  <span className="ts-label">Put in bot:</span>
                  <span className="ts-value">{formatDateTime(battery.putInBotTime)}</span>
                </div>
              )}
              {battery.removedFromBotTime && (
                <div className="timestamp-row">
                  <span className="ts-label">Removed from bot:</span>
                  <span className="ts-value">{formatDateTime(battery.removedFromBotTime)}</span>
                </div>
              )}
            </div>
          </div>

          {/* History log (collapsible) */}
          <div className="modal-section">
            <button
              className="section-title history-toggle"
              onClick={() => setShowHistory(h => !h)}
            >
              📋 History {showHistory ? '▲' : '▼'}
            </button>
            {showHistory && (
              <div className="history-list">
                {battery.history.length === 0 ? (
                  <div className="history-empty">No events recorded yet.</div>
                ) : (
                  battery.history.map((evt, i) => (
                    <div className="history-row" key={i}>
                      <div className="history-action">{evt.action}</div>
                      <div className="history-meta">
                        {formatDateTime(evt.timestamp)}
                        {evt.details && <span className="history-details"> — {evt.details}</span>}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Large back button — always visible at bottom for mobile */}
          <button className="modal-back-btn" onClick={onClose}>
            ← Back
          </button>
        </div>
      </div>
    </div>
  )
}

function ActionBtn({ color, icon, label, onClick, secondary }) {
  return (
    <button
      className={`action-btn ${secondary ? 'secondary' : 'primary'}`}
      style={secondary ? { borderColor: color, color } : { background: color }}
      onClick={onClick}
    >
      <span className="action-icon">{icon}</span>
      <span className="action-label">{label}</span>
    </button>
  )
}
