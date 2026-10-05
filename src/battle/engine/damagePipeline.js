import { calculateDamage, calculateEnergyGain } from './damage.js'
import { applyDamageModifiers, createDamageContext } from './modifiers.js'

export function resolveDamagePipeline({
  attackerStats = {},
  defenderStats = {},
  multiplier = 1,
  randomFactor = 1,
  critical = false,
  defending = false,
  modifiers = [],
  ultimate = false,
}) {
  const rawAmount = calculateDamage({
    attackerStats,
    defenderStats,
    multiplier,
    randomFactor,
    critical,
    defending,
  })

  const modified = applyDamageModifiers(
    createDamageContext({
      amount: rawAmount,
      multiplier: 1,
      critical,
      defending,
    }),
    modifiers,
  )

  const amount = modified.prevented ? 0 : Math.max(0, Math.round(modified.amount * modified.multiplier))

  return {
    amount,
    rawAmount,
    prevented: modified.prevented,
    critical,
    energyGain: calculateEnergyGain({
      critical,
      hit: amount > 0,
      ultimate,
    }),
  }
}
