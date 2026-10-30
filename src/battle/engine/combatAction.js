import { executeAbilityAction } from './abilityAction.js'
import { getAbilitySummary } from './abilityDefinition.js'
import { executeBasicAttack } from './attackAction.js'
import { executeBasicAction } from './actions.js'
import { resolveCombatAttack } from './attackResolution.js'

function resolveAttack(state, sourceId, targetId, options = {}) {
  return resolveCombatAttack(state, sourceId, targetId, {
    multiplier: 1,
    energyCost: 0,
    ...options,
  })
}

export function executeCombatAction(state, sourceId, targetId, action = {}) {
  const {
    type = 'basic',
    ability = null,
    attackOptions = {},
    ...options
  } = action

  if (type === 'defend') return executeBasicAction(state, sourceId, targetId, 'defend', options)

  if (type === 'basic') {
    const attackResult = resolveAttack(state, sourceId, targetId, attackOptions)
    const result = executeBasicAttack(attackResult.state, sourceId, targetId, {
      ...options,
      resolvedAmount: attackResult.damage,
      critical: attackResult.critical,
      hit: attackResult.hit,
    })
    return { ...result, attack: attackResult }
  }

  if (type === 'ability' || type === 'ultimate') {
    if (!ability) throw new Error('Declarative ability is required')

    const abilityCombat = getAbilitySummary(ability)
    const attackConfig = {
      ...abilityCombat,
      ...attackOptions,
      multiplier: attackOptions.multiplier ?? abilityCombat.multiplier ?? 1,
      energyCost: attackOptions.energyCost ?? ability?.costs?.energy ?? 0,
      guaranteedHit: attackOptions.guaranteedHit ?? abilityCombat.guaranteedHit,
      criticalBonus: attackOptions.criticalBonus ?? abilityCombat.criticalBonus ?? 0,
      ultimate: type === 'ultimate' || Boolean(attackOptions.ultimate) || Boolean(abilityCombat.ultimate),
      skipDamage: attackOptions.skipDamage ?? !abilityCombat.dealsDamage,
    }

    const attackResult = resolveAttack(state, sourceId, targetId, attackConfig)
    const abilityResult = executeAbilityAction(attackResult.state, sourceId, targetId, {
      ...options,
      combatResult: {
        hit: attackResult.hit,
        critical: attackResult.critical,
        damage: attackResult.damage,
        ultimate: attackConfig.ultimate,
      },
      ability,
    })

    return { ...abilityResult, attack: attackResult }
  }

  throw new Error(`Unsupported combat action: ${type}`)
}
