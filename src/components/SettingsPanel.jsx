import React, { useState } from 'react'
import { isFirebaseConfigured } from '../firebase'

/**
 * Slide-up settings panel.
 * Covers: team number, sync code, view-only, charge/cool thresholds, battery count, reset.
 */
export default function SettingsPanel({ settings, onSave, onResetAll, onResetStats, onClose }) {
  const [form, setForm] = useState({ ...settings })
  const [confirmReset, setConfirmReset]      = useState(false)
  const [confirmResetStats, setConfirmResetStats] = useState(false)

  function handleChange(key, value) {
    setForm(prev => ({ ...prev, [key]: value }))
  }

  function handleSave() {
    const cleaned = {
      ...form,
      syncCode:       (form.syncCode || '').trim(),
      viewOnly:       !!form.viewOnly,
      chargeThreshold: Math.max(10, Math.min(300, parseInt(form.chargeThreshold) || 60)),
      coolThreshold:   Math.max(5,  Math.min(60,  parseInt(form.coolThreshold)  || 15)),
      batteryCount:    Math.max(2,  Math.min(12,  parseInt(form.batteryCount)   || 6)),
    }
    onSave(cleaned)
    onClose()
  }

  function handleReset() {
    if (!confirmReset) { setConfirmReset(true); setConfirmResetStats(false); return }
    onResetAll(parseInt(form.batteryCount) || 6)
    setConfirmReset(false)
    onClose()
  }

  function handleResetStats() {
    if (!confirmResetStats) { setConfirmResetStats(true); setConfirmReset(false); return }
    onResetStats()
    setConfirmResetStats(false)
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

          {/* ── Sync section ─────────────────────────────────────── */}
          <div className="setting-divider">📡 Live Sync</div>

          {!isFirebaseConfigured && (
            <div className="sync-warning">
              Firebase not configured — sync is unavailable.
              See the README for setup instructions.
            </div>
          )}

          <div className="setting-group">
            <label className="setting-label">Sync Code</label>
            <input
              className="setting-input"
              type="text"
              placeholder="e.g. FRC1234"
              value={form.syncCode || ''}
              onChange={e => handleChange('syncCode', e.target.value)}
              maxLength={30}
              disabled={!isFirebaseConfigured}
            />
            <div className="setting-hint">
              Every phone with the same code shares live data.
              Leave blank for local-only mode.
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label toggle-label">
              <span>View Only (field / drive coach phone)</span>
              <button
                className={`toggle-btn ${form.viewOnly ? 'on' : 'off'}`}
                onClick={() => handleChange('viewOnly', !form.viewOnly)}
                type="button"
              >
                {form.viewOnly ? 'ON' : 'OFF'}
              </button>
            </label>
            <div className="setting-hint">
              Hides all action buttons — safe for phones that should only monitor.
            </div>
          </div>

          {/* ── Match Schedule ───────────────────────────────────── */}
          <div className="setting-divider">📅 Match Schedule</div>

          <div className="setting-group">
            <label className="setting-label">TBA API Key</label>
            <input
              className="setting-input"
              type="text"
              placeholder="Get a free key at thebluealliance.com/account"
              value={form.tbaKey || ''}
              onChange={e => handleChange('tbaKey', e.target.value)}
              maxLength={64}
            />
          </div>

          <div className="setting-group">
            <label className="setting-label">Event Code</label>
            <input
              className="setting-input"
              type="text"
              placeholder="e.g. 2024casj"
              value={form.eventCode || ''}
              onChange={e => handleChange('eventCode', e.target.value.trim().toLowerCase())}
              maxLength={16}
            />
            <div className="setting-hint">
              Find yours at thebluealliance.com/events —
              test with event <strong>2024casj</strong> (team 254).
            </div>
          </div>

          <div className="setting-group">
            <label className="setting-label">Watched Teams</label>
            <input
              className="setting-input"
              type="text"
              placeholder="e.g. 1678, 2910, 3015"
              value={form.watchedTeams || ''}
              onChange={e => handleChange('watchedTeams', e.target.value)}
              maxLength={200}
            />
            <div className="setting-hint">
              Comma-separated team numbers to highlight in the schedule —
              great for tracking potential alliance partners.
            </div>
          </div>

          {/* ── Thresholds ───────────────────────────────────────── */}
          <div className="setting-divider">⏱ Thresholds</div>

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
            <div className="setting-hint">Battery shows "ready" after this many minutes. Typical FRC: 60–120 min.</div>
          </div>

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
            <div className="setting-hint">Recommended cool time before re-charging. Typical: 10–20 min.</div>
          </div>

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

          <button className="save-settings-btn" onClick={handleSave}>
            ✓ Save Settings
          </button>

          <div className="danger-zone">
            <div className="danger-title">Danger Zone</div>

            {/* Reset cycles + readings only — keeps labels, notes, status */}
            <button
              className={`reset-btn ${confirmResetStats ? 'confirm' : ''}`}
              onClick={handleResetStats}
            >
              {confirmResetStats ? '⚠ Confirm — clears cycles & readings!' : '🔄 Reset Cycles & Readings'}
            </button>
            {confirmResetStats && (
              <button className="cancel-reset-btn" onClick={() => setConfirmResetStats(false)}>
                Cancel
              </button>
            )}

            {/* Reset all — full wipe, rebuilds from scratch */}
            <button
              className={`reset-btn ${confirmReset ? 'confirm' : ''}`}
              onClick={handleReset}
            >
              {confirmReset ? '⚠ Confirm Reset — cannot be undone!' : '🗑 Reset All Batteries'}
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
