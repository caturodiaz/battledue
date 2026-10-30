import { calculateDamage, calculateCriticalChance, calculateEnergyGain } from './damage.js'

export function buildDeterministicAttackScenario({
  attackerStats,
  defenderStats,
  attackerEnergy = 20,
  defenderHp = 100,
  multiplier = 1,
  randomFactor = 1,
  critical = false,
  defending = false,
  ultimate = false,
}) {
  const damage = calculateDamage({
    attackerStats,
    defenderStats,
    multiplier,
    randomFactor,
    critical,
    defending,
  })

  const energyCost = ultimate ? 100 : multiplier !== 1 ? 25 : 0
  const energyGain = calculateEnergyGain({ critical, hit: true, ultimate })
  const finalEnergy = Math.min(100, Math.max(0, attackerEnergy - energyCost + energyGain))
  const finalHp = Math.max(0, defenderHp - damage)

  return {
    damage,
    finalHp,
    finalEnergy,
    critical,
    targetDefeated: finalHp <= 0,
  }
}

export function buildCriticalThresholdScenario(control, randomRoll) {
  const chance = calculateCriticalChance({ control, ultimate: false })
  return {
    chance,
    critical: randomRoll < chance,
  }
}
