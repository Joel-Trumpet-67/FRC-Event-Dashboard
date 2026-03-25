import React, { useState, useEffect } from 'react'
import { loadChecklist, saveChecklist } from '../utils/storage'

const DEFAULT_ITEMS = [
  { id: 'd1', text: 'Battery seated and secured' },
  { id: 'd2', text: 'Bumpers on and latched' },
  { id: 'd3', text: 'Code deployed and running' },
  { id: 'd4', text: 'Radio powered and connected' },
  { id: 'd5', text: 'Driver station connected' },
  { id: 'd6', text: 'All mechanisms functioning' },
  { id: 'd7', text: 'Camera feeds active' },
  { id: 'd8', text: 'Pre-match inspection passed' },
]

function initChecklist() {
  const saved = loadChecklist()
  if (saved) return saved
  return {
    items:   DEFAULT_ITEMS,
    checked: {},
  }
}

export default function RobotChecklist({ onBack }) {
  const [state,    setState]    = useState(initChecklist)
  const [addInput, setAddInput] = useState('')

  useEffect(() => { saveChecklist(state) }, [state])

  function toggle(id) {
    setState(prev => ({
      ...prev,
      checked: { ...prev.checked, [id]: !prev.checked[id] },
    }))
  }

  function resetChecked() {
    setState(prev => ({ ...prev, checked: {} }))
  }

  function addItem() {
    const text = addInput.trim()
    if (!text) return
    const id = `c${Date.now()}`
    setState(prev => ({
      ...prev,
      items: [...prev.items, { id, text }],
    }))
    setAddInput('')
  }

  function removeItem(id) {
    setState(prev => ({
      items:   prev.items.filter(i => i.id !== id),
      checked: Object.fromEntries(Object.entries(prev.checked).filter(([k]) => k !== id)),
    }))
  }

  function handleKey(e) {
    if (e.key === 'Enter') addItem()
  }

  const checkedCount = state.items.filter(i => state.checked[i.id]).length
  const total        = state.items.length
  const allDone      = checkedCount === total && total > 0

  return (
    <div className="view-screen">
      <div className="view-header">
        <button className="view-back-btn" onClick={onBack}>‹</button>
        <span className="view-title">✅ Checklist</span>
        <span className="checklist-progress">{checkedCount}/{total}</span>
      </div>

      <div className="view-body">
        {allDone && (
          <div className="checklist-done-banner">🚀 Robot is ready!</div>
        )}

        <div className="checklist-list">
          {state.items.map(item => (
            <div
              key={item.id}
              className={`checklist-item${state.checked[item.id] ? ' checked' : ''}`}
              onClick={() => toggle(item.id)}
            >
              <span className="checklist-box">
                {state.checked[item.id] ? '☑' : '☐'}
              </span>
              <span className="checklist-text">{item.text}</span>
              <button
                className="checklist-remove-btn"
                onClick={e => { e.stopPropagation(); removeItem(item.id) }}
                aria-label="Remove item"
              >
                ✕
              </button>
            </div>
          ))}
        </div>

        <div className="checklist-add-row">
          <input
            className="setting-input"
            type="text"
            placeholder="Add a custom item…"
            value={addInput}
            onChange={e => setAddInput(e.target.value)}
            onKeyDown={handleKey}
            maxLength={80}
          />
          <button className="lookup-search-btn" onClick={addItem} disabled={!addInput.trim()}>
            Add
          </button>
        </div>

        <button className="reset-btn" style={{ marginTop: 12 }} onClick={resetChecked}>
          🔄 Reset All Checks
        </button>
      </div>
    </div>
  )
}
