import { executeBattleAction } from './battleEngine.js'
import { executeAbilityAction } from './abilityAction.js'
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

/**
 * Executes one complete combat action.
 *
 * The caller provides intent and the engine owns hit/critical/damage
 * resolution plus the action's declarative effects.
 */
export function executeCombatAction(legacyState, sourceId, targetId, action = {}) {
  const {
    type = 'basic',
    ability = null,
    abilityOptions = {},
    attackOptions = {},
    ...options
  } = action

  if (type === 'defend') {
    return executeBasicAction(legacyState, sourceId, targetId, 'defend', options)
  }

  if (type === 'basic') {
    const attackResult = resolveAttack(
      legacyState,
      sourceId,
      targetId,
      attackOptions,
    )

    const result = attackResult.type === 'miss'
      ? attackResult
      : executeBasicAttack(
          attackResult.state,
          sourceId,
          targetId,
          {
            ...options,
            resolvedAmount: attackResult.damage,
            critical: attackResult.critical,
          },
        )

    return {
      ...result,
      attack: attackResult,
    }
  }

  if (type === 'ability' || type === 'ultimate') {
    const attackConfig = {
      ...attackOptions,
      multiplier: attackOptions.multiplier ?? abilityOptions.multiplier ?? 1,
      energyCost: attackOptions.energyCost ?? abilityOptions.energyCost ?? 0,
      guaranteedHit: attackOptions.guaranteedHit ?? abilityOptions.guaranteedHit,
      criticalBonus: attackOptions.criticalBonus ?? abilityOptions.criticalBonus ?? 0,
      ultimate: type === 'ultimate' || Boolean(attackOptions.ultimate),
    }

    const attackResult = resolveAttack(
      legacyState,
      sourceId,
      targetId,
      attackConfig,
    )

    const abilityResult = executeAbilityAction(
      attackResult.state,
      sourceId,
      targetId,
      {
        ...options,
        ...abilityOptions,
        ability,
        combatResult: {
          hit: attackResult.hit,
          critical: attackResult.critical,
          damage: attackResult.damage,
          ultimate: attackConfig.ultimate,
        },
        hit: attackResult.hit,
        critical: attackResult.critical,
        damage: attackResult.damage,
        energy: attackResult.energy,
        battleEffect: abilityOptions.battleEffect,
      },
    )

    return {
      ...abilityResult,
      attack: attackResult,
    }
  }

  throw new Error(`Unsupported combat action: ${type}`)
}
