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

function getAbilityCombat(ability = {}) {
  const effects = [
    ...(Array.isArray(ability.effects) ? ability.effects : []),
    ...(Array.isArray(ability.steps) ? ability.steps.flatMap((step) => step?.effects || []) : []),
  ]

  const damageEffect = effects.find((effect) => effect?.type === 'damage_resolve')

  return {
    ...(ability.combat || {}),
    multiplier: ability.combat?.multiplier ?? damageEffect?.multiplier ?? 1,
  }
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

    const result = executeBasicAttack(
      attackResult.state,
      sourceId,
      targetId,
      {
        ...options,
        resolvedAmount: attackResult.damage,
        critical: attackResult.critical,
        hit: attackResult.hit,
      },
    )

    return {
      ...result,
      attack: attackResult,
    }
  }

  if (type === 'ability' || type === 'ultimate') {
    const abilityCombat = getAbilityCombat(ability)
    const attackConfig = {
      ...abilityCombat,
      ...attackOptions,
      multiplier: attackOptions.multiplier ?? abilityOptions.multiplier ?? abilityCombat.multiplier ?? 1,
      energyCost: attackOptions.energyCost ?? abilityOptions.energyCost ?? ability?.costs?.energy ?? 0,
      guaranteedHit: attackOptions.guaranteedHit ?? abilityOptions.guaranteedHit ?? abilityCombat.guaranteedHit,
      criticalBonus: attackOptions.criticalBonus ?? abilityOptions.criticalBonus ?? abilityCombat.criticalBonus ?? 0,
      ultimate: type === 'ultimate' || Boolean(attackOptions.ultimate) || Boolean(abilityCombat.ultimate),
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
