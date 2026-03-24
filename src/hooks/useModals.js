// =============================================================================
// useModals.js
// -----------------------------------------------------------------------------
// Manages modal open/close state for the battery detail modal and settings panel.
//
// Also handles browser back-button behaviour:
//   - When a modal opens, a history entry is pushed so the back button works
//   - When the back button is pressed, the topmost modal is closed
// =============================================================================

import { useState, useEffect } from 'react'

// -----------------------------------------------------------------------------
// useModals
//
// @returns {object}
//   selectedBattery    — battery object whose detail modal is open (or null)
//   setSelectedBattery — open the detail modal for a battery
//   showSettings       — boolean: whether the settings panel is open
//   setShowSettings    — open or close the settings panel
//   closeModal         — closes the battery detail modal
// -----------------------------------------------------------------------------
export function useModals() {

  // ---------------------------------------------------------------------------
  // STATE — which modal is open
  // selectedBattery holds the full battery object (not just an id) so the modal
  // can render immediately, then stay in sync via batteries.find() in App.jsx.
  // ---------------------------------------------------------------------------
  const [selectedBattery, setSelectedBattery] = useState(null)
  const [showSettings, setShowSettings]       = useState(false)

  // ---------------------------------------------------------------------------
  // EFFECT — Push browser history entry when a modal opens
  // This gives the back button something to pop, so pressing back closes
  // the modal instead of navigating away from the app entirely.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (selectedBattery || showSettings) {
      window.history.pushState({ modal: true }, '')
    }
  }, [selectedBattery, showSettings])

  // ---------------------------------------------------------------------------
  // EFFECT — Handle browser back button
  // Listens for the popstate event (fired when back is pressed).
  // Closes the topmost open modal in priority order: battery detail > settings.
  // ---------------------------------------------------------------------------
  useEffect(() => {
    function handlePopState() {
      if (selectedBattery) { setSelectedBattery(null); return }
      if (showSettings)    { setShowSettings(false);   return }
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedBattery, showSettings])

  // ---------------------------------------------------------------------------
  // closeModal — convenience function to close the battery detail modal
  // ---------------------------------------------------------------------------
  function closeModal() {
    setSelectedBattery(null)
  }

  return {
    selectedBattery,
    setSelectedBattery,
    showSettings,
    setShowSettings,
    closeModal,
  }
}
