import { executeBattleAction } from './battleEngine.js'
import { createAbilityAction } from './abilityDefinition.js'
import { fromEngineState, toEngineState } from './stateAdapter.js'

const MAX_ENERGY = 100

function getResource(unit, resource) {
  if (unit?.resources && resource in unit.resources) {
    return Number(unit.resources[resource]) || 0
  }

  return Number(unit?.[resource]) || 0
}

function applyAbilityCosts(state, sourceId, costs = {}) {
  let nextState = state
  const source = nextState?.players?.[sourceId] || {}

  for (const [resource, rawCost] of Object.entries(costs || {})) {
    const cost = Math.max(0, Number(rawCost) || 0)
    if (getResource(source, resource) < cost) {
      throw new Error(`Insufficient ${resource} to execute ability`)
    }

    const resources = {
      ...(source.resources || {}),
      [resource]: getResource(source, resource) - cost,
    }

    nextState = {
      ...nextState,
      players: {
        ...(nextState.players || {}),
        [sourceId]: {
          ...source,
          resources,
          ...(resource === 'energy'
            ? { energy: Math.max(0, Math.min(MAX_ENERGY, resources.energy)) }
            : {}),
        },
      },
    }
  }

  return nextState
}

function filterEffectsForHit(effects, hit) {
  if (hit) return effects

  return effects.filter((effect) => effect?.requiresHit === false)
}

function filterStepsForHit(steps, hit) {
  return steps.map((step) => ({
    ...step,
    effects: filterEffectsForHit(step?.effects || [], hit),
  }))
}

function executeDeclarativeAbility(legacyState, sourceId, targetId, ability, options) {
  const engineState = toEngineState(legacyState)
  const action = createAbilityAction(ability)
  const combatResult = options.combatResult || {}
  const hit = combatResult.hit ?? options.hit ?? true
  const critical = combatResult.critical ?? options.critical ?? false
  const resolvedAmount = combatResult.damage ?? options.resolvedAmount
  const nextState = applyAbilityCosts(engineState, sourceId, action.costs)

  const result = executeBattleAction(
    nextState,
    {
      sourceId,
      targetId,
      steps: filterStepsForHit(action.steps, hit),
      triggers: action.triggers,
    },
    {
      ...options,
      hit,
      critical,
      resolvedAmount,
      ultimate: Boolean(options.ultimate || combatResult.ultimate),
    },
  )

  return {
    ...result,
    state: fromEngineState(result.state),
  }
}

function executeLegacyAbility(legacyState, sourceId, targetId, options = {}) {
  const {
    damage = 0,
    critical = false,
    energy = 0,
    battleEffect = null,
    hit = true,
    healAmount = 0,
    fullHeal = false,
    ...actionOptions
  } = options

  const effects = []

  if (hit && Number(damage) > 0) {
    effects.push({
      type: 'damage_resolve',
      multiplier: 1,
    })
  }

  effects.push({
    type: 'resource_set',
    target: 'source',
    resource: 'energy',
    value: Math.max(0, Math.min(MAX_ENERGY, Number(energy) || 0)),
  })

  effects.push({ type: 'battle_state_decrement_all' })

  if (hit && (Number(healAmount) > 0 || fullHeal)) {
    effects.push({
      type: 'heal',
      target: 'source',
      value: fullHeal ? Number.MAX_SAFE_INTEGER : Number(healAmount),
    })
  }

  if (hit && battleEffect && battleEffect.type && battleEffect.type !== 'heal_self' && battleEffect.type !== 'full_heal_self') {
    effects.push({
      type: 'battle_state_add',
      target: battleEffect.target || 'enemy',
      state: battleEffect.type,
      turns: battleEffect.data?.turns ?? battleEffect.turns,
      stacks: battleEffect.data?.stacks ?? battleEffect.stacks,
    })
  }

  const result = executeBattleAction(
    toEngineState(legacyState),
    {
      sourceId,
      targetId,
      steps: [{ effects }],
      triggers: actionOptions.triggers || [],
    },
    {
      ...actionOptions,
      resolvedAmount: Math.max(0, Number(damage) || 0),
      critical,
      hit,
    },
  )

  return {
    ...result,
    state: fromEngineState(result.state),
  }
}

export function executeAbilityAction(legacyState, sourceId, targetId, options = {}) {
  if (options.ability) {
    return executeDeclarativeAbility(
      legacyState,
      sourceId,
      targetId,
      options.ability,
      options,
    )
  }

  return executeLegacyAbility(legacyState, sourceId, targetId, options)
}
