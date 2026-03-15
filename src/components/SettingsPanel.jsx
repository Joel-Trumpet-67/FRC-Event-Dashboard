import React, { useState } from 'react'

/**
 * Slide-up settings panel.
 * Covers: team number, charge threshold, cool threshold, battery count, reset.
 */
export default function SettingsPanel({ settings, onSave, onResetAll, onClose }) {
  const [form, setForm] = useState({ ...settings })
  const [confirmReset, setConfirmReset] = useState(false)

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const cleaned = {
      ...form,
      chargeThreshold: Math.max(10, Math.min(300, parseInt(form.chargeThreshold) || 60)),
      coolThreshold: Math.max(5, Math.min(60, parseInt(form.coolThreshold) || 15)),
      batteryCount: Math.max(2, Math.min(12, parseInt(form.batteryCount) || 6)),
    }
    onSave(cleaned)
    onClose()
  }

  function handleReset() {
    if (!confirmReset) {
      setConfirmReset(true)
      return
    }
    onResetAll(parseInt(form.batteryCount) || 6)
    setConfirmReset(false)
    onClose()
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal settings-modal" onClick={e => e.stopPropagation()}>

        <div className="modal-header settings-header">
          <span className="modal-title">⚙ Settings</span>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body">

          {/* Team number */}
          <div className="setting-group">
            <label className="setting-label">Team Number</label>
            <input
              className="setting-input"
              type="number"
              placeholder="e.g. 1234"
              value={form.teamNumber || ''}
              onChange={e => handleChange('teamNumber', e.target.value)}
              min="1"
              max="99999"
            />
          </div>

          {/* Number of batteries */}
          <div className="setting-group">
            <label className="setting-label">Number of Batteries</label>
            <input
              className="setting-input"
              type="number"
              value={form.batteryCount || 6}
              onChange={e => handleChange('batteryCount', e.target.value)}
              min="2"
              max="12"
            />
            <div className="setting-hint">2–12 batteries supported</div>
          </div>

          {/* Charge threshold */}
          <div className="setting-group">
            <label className="setting-label">Charge Threshold (minutes)</label>
            <input
              className="setting-input"
              type="number"
              value={form.chargeThreshold || 60}
              onChange={e => handleChange('chargeThreshold', e.target.value)}
              min="10"
              max="300"
            />
            <div className="setting-hint">
              Battery shows "ready" after this many minutes of charging.
              Typical FRC: 60–120 min.
            </div>
          </div>

          {/* Cool-down threshold */}
          <div className="setting-group">
            <label className="setting-label">Cool-Down Threshold (minutes)</label>
            <input
              className="setting-input"
              type="number"
              value={form.coolThreshold || 15}
              onChange={e => handleChange('coolThreshold', e.target.value)}
              min="5"
              max="60"
            />
            <div className="setting-hint">
              Recommended cool time before re-charging. Typical: 10–20 min.
            </div>
          </div>

          <button className="save-settings-btn" onClick={handleSave}>
            ✓ Save Settings
          </button>

          {/* Danger zone */}
          <div className="danger-zone">
            <div className="danger-title">Danger Zone</div>
            <button
              className={`reset-btn ${confirmReset ? 'confirm' : ''}`}
              onClick={handleReset}
            >
              {confirmReset ? '⚠ Confirm Reset — This cannot be undone!' : '🗑 Reset All Batteries'}
            </button>
            {confirmReset && (
              <button className="cancel-reset-btn" onClick={() => setConfirmReset(false)}>
                Cancel
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
