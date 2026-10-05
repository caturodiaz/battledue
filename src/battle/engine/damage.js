const clamp = (value, min, max) => Math.min(max, Math.max(min, value))

export function calculateBaseDamage(attackerStats = {}) {
  return 6
    + Number(attackerStats.strength || 0) * 2
    + Number(attackerStats.range || 0) * 0.8
    + Number(attackerStats.control || 0) * 0.5
}

export function calculateDamage({ attackerStats = {}, defenderStats = {}, multiplier = 1, randomFactor = 1, critical = false, defending = false }) {
  let damage = calculateBaseDamage(attackerStats) * Number(multiplier || 1) * Number(randomFactor || 1)

  if (critical) damage *= 1.7

  const defense = Number(defenderStats.defense || 0)
  damage *= 1 - clamp(defense * 0.04, 0, 0.5)

  if (defending) damage *= 0.5

  return Math.max(1, Math.round(damage))
}

export function calculateCriticalChance({ control = 0, ultimate = false }) {
  return Math.min(40, 8 + Number(control || 0) * 2 + (ultimate ? 15 : 5))
}

export function calculateEnergyGain({ critical = false, hit = true, ultimate = false }) {
  if (ultimate) return 0
  if (!hit) return 8
  if (critical) return 18
  return 13
}
