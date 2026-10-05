import { calculateDamage, calculateEnergyGain } from './damage'
import { applyEffect } from './effects'
import { queueBattleEvent } from './events'

export function resolveDamageEffect(state, sourceId, targetId, effect = {}, context = {}) {
  const attacker = state?.players?.[sourceId] || {}
  const defender = state?.players?.[targetId] || {}
  const attackerStats = attacker.stats || attacker
  const defenderStats = defender.stats || defender
  const critical = Boolean(context.critical)
  const randomFactor = context.randomFactor == null ? 1 : Number(context.randomFactor)
  const multiplier = Number(effect.multiplier ?? effect.value ?? 1)
  const amount = calculateDamage({
    attackerStats,
    defenderStats,
    multiplier,
    randomFactor,
    critical,
    defending: Boolean(defender.defending || defender.flags?.defending),
  })

  let nextState = state
  nextState = queueBattleEvent(nextState, 'before_damage', {
    source: sourceId,
    target: targetId,
    amount,
    critical,
  })

  nextState = applyEffect(nextState, sourceId, targetId, {
    type: 'damage',
    target: 'target',
    value: amount,
  })

  nextState = queueBattleEvent(nextState, 'after_damage', {
    source: sourceId,
    target: targetId,
    amount,
    critical,
  })

  if (critical) {
    nextState = queueBattleEvent(nextState, 'critical_hit', {
      source: sourceId,
      target: targetId,
      amount,
    })
  }

  const targetHp = Number(nextState?.players?.[targetId]?.hp) || 0
  if (targetHp <= 0) {
    nextState = queueBattleEvent(nextState, 'target_defeated', {
      source: sourceId,
      target: targetId,
    })
  }

  const energyGain = calculateEnergyGain({
    critical,
    hit: amount > 0,
    ultimate: Boolean(context.ultimate),
  })

  if (energyGain > 0) {
    nextState = applyEffect(nextState, sourceId, targetId, {
      type: 'resource_add',
      target: 'source',
      resource: 'energy',
      value: energyGain,
    })
  }

  return {
    state: nextState,
    amount,
    critical,
    energyGain,
  }
}
