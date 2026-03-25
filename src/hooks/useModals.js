// =============================================================================
// useModals.js
// -----------------------------------------------------------------------------
// Manages modal open/close state for the battery detail modal and settings panel.
//
// Also handles browser back-button behaviour:
//   - When a modal opens, a history entry is pushed so the back button works
//   - When the back button is pressed, the topmost modal is closed
//   - If no modals are open, onGoHome() is called (used for view navigation)
// =============================================================================

import { useState, useEffect } from 'react'

export function useModals(onGoHome) {
  const [selectedBattery, setSelectedBattery] = useState(null)
  const [showSettings,    setShowSettings]    = useState(false)

  useEffect(() => {
    if (selectedBattery || showSettings) {
      window.history.pushState({ modal: true }, '')
    }
  }, [selectedBattery, showSettings])

  useEffect(() => {
    function handlePopState() {
      if (selectedBattery) { setSelectedBattery(null); return }
      if (showSettings)    { setShowSettings(false);   return }
      onGoHome?.()
    }
    window.addEventListener('popstate', handlePopState)
    return () => window.removeEventListener('popstate', handlePopState)
  }, [selectedBattery, showSettings, onGoHome])

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
