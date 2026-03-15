import React from 'react'
import BatteryCard from './BatteryCard'

/**
 * Responsive grid of all battery cards.
 * Best-next battery is highlighted.
 */
export default function BatteryGrid({
  batteries,
  bestNext,
  chargeThresholdMin,
  coolThresholdMin,
  onCardPress,
}) {
  return (
    <section className="battery-grid">
      {batteries.map(battery => (
        <BatteryCard
          key={battery.id}
          battery={battery}
          isBestNext={bestNext?.id === battery.id}
          chargeThresholdMin={chargeThresholdMin}
          coolThresholdMin={coolThresholdMin}
          onPress={onCardPress}
        />
      ))}
    </section>
  )
}
