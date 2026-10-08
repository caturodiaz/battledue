import { resolveAttackState } from './attackState.js'

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getStats(unit = {}) {
  return unit.stats || unit
}

function getEnergyAfterAttack({ energy = 0, cost = 0, hit = false, critical = false, ultimate = false }) {
  if (ultimate) return 0
  const gain = hit ? (critical ? 18 : 13) : 8
  return clamp((Number(energy) || 0) - Math.max(0, Number(cost) || 0) + gain, 0, 100)
}

/**
 * Resolves hit chance, critical damage, battle states, defense and energy for
 * an attack-like action. Presentation layers provide intent; the engine owns
 * the combat result.
 */
export function resolveCombatAttack(state, sourceId, targetId, options = {}) {
  const source = state?.players?.[sourceId] || {}
  const target = state?.players?.[targetId] || {}
  const attackerStats = getStats(source)
  const defenderStats = getStats(target)
  const random = typeof options.random === 'function' ? options.random : Math.random
  const multiplier = Number(options.multiplier ?? 1)
  const guaranteedHit = Boolean(options.guaranteedHit)
  const criticalBonus = Number(options.criticalBonus) || 0
  const ultimate = Boolean(options.ultimate)

  const accuracy = clamp(
    72 + (Number(attackerStats.control) || 0) * 3 + (Number(attackerStats.range) || 0) - (Number(defenderStats.speed) || 0) * 2,
    50,
    97,
  )
  const hitRollSucceeded = guaranteedHit || random() * 100 <= accuracy

  if (!hitRollSucceeded) {
    return {
      state,
      hit: false,
      type: 'miss',
      damage: 0,
      unblockedDamage: 0,
      critical: false,
      accuracy,
      reason: 'accuracy',
      message: null,
      defending: false,
      energy: getEnergyAfterAttack({ energy: source.energy, cost: options.energyCost, ultimate }),
    }
  }

  const baseDamage = 6
    + (Number(attackerStats.strength) || 0) * 2
    + (Number(attackerStats.range) || 0) * 0.8
    + (Number(attackerStats.control) || 0) * 0.5
  const variation = options.randomFactor == null ? 0.8 + random() * 0.4 : Number(options.randomFactor)
  const critical = random() * 100 < clamp(8 + (Number(attackerStats.control) || 0) * 2 + criticalBonus, 0, 40)
  let damage = baseDamage * variation * multiplier
  if (critical) damage *= 1.7
  damage *= 1 - clamp((Number(defenderStats.defense) || 0) * 0.04, 0, 0.5)
  damage = Math.max(1, Math.round(damage))

  const stateResult = resolveAttackState(state, sourceId, targetId, damage, { random })
  if (!stateResult.hit) {
    return {
      state: stateResult.state,
      hit: false,
      type: 'miss',
      damage: 0,
      unblockedDamage: 0,
      critical: false,
      accuracy,
      reason: stateResult.reason,
      message: stateResult.message,
      defending: false,
      energy: getEnergyAfterAttack({ energy: source.energy, cost: options.energyCost, ultimate }),
    }
  }

  const resolvedTarget = stateResult.state?.players?.[targetId] || target
  const defending = Boolean(resolvedTarget.defending || resolvedTarget.flags?.defending)
  const unblockedDamage = stateResult.damage
  const finalDamage = defending ? Math.max(1, Math.round(unblockedDamage * 0.5)) : unblockedDamage
  const nextState = defending
    ? {
        ...stateResult.state,
        players: {
          ...stateResult.state.players,
          [targetId]: {
            ...resolvedTarget,
            defending: false,
            flags: { ...(resolvedTarget.flags || {}), defending: false },
          },
        },
      }
    : stateResult.state

  return {
    state: nextState,
    hit: true,
    type: critical ? 'critical' : 'hit',
    damage: finalDamage,
    unblockedDamage,
    critical,
    accuracy,
    reason: null,
    message: null,
    defending,
    energy: getEnergyAfterAttack({
      energy: source.energy,
      cost: options.energyCost,
      hit: true,
      critical,
      ultimate,
    }),
  }
}
