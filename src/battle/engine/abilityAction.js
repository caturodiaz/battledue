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
  const source = state?.players?.[sourceId] || {}
  const currentResources = { ...(source.resources || {}) }

  for (const [resource, rawCost] of Object.entries(costs || {})) {
    const cost = Math.max(0, Number(rawCost) || 0)
    const currentValue = resource in currentResources
      ? Number(currentResources[resource]) || 0
      : getResource(source, resource)

    if (currentValue < cost) {
      throw new Error(`Insufficient ${resource} to execute ability`)
    }

    currentResources[resource] = currentValue - cost
  }

  return {
    ...state,
    players: {
      ...(state.players || {}),
      [sourceId]: {
        ...source,
        resources: currentResources,
        ...(Object.prototype.hasOwnProperty.call(costs, 'energy')
          ? { energy: Math.max(0, Math.min(MAX_ENERGY, currentResources.energy)) }
          : {}),
      },
    },
  }
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
      steps: action.steps,
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
    healAmount: legacyHealAmount = 0,
    fullHeal: legacyFullHeal = false,
    ...actionOptions
  } = options

  const source = legacyState?.players?.[sourceId] || {}
  const effectAmount = Number(battleEffect?.data?.amount ?? battleEffect?.amount)
  const calculatedHealAmount = battleEffect?.type === 'heal_self'
    ? Math.round(Math.max(0, Number(source.max_hp) || 0) * Math.max(0, effectAmount || 0))
    : Math.max(0, Number(legacyHealAmount) || 0)
  const fullHeal = battleEffect?.type === 'full_heal_self' || legacyFullHeal

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

  if (hit && (calculatedHealAmount > 0 || fullHeal)) {
    effects.push({
      type: 'heal',
      target: 'source',
      value: fullHeal ? Number.MAX_SAFE_INTEGER : calculatedHealAmount,
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
    healing: hit ? (fullHeal ? Math.max(0, (Number(source.max_hp) || 0) - (Number(source.hp) || 0)) : calculatedHealAmount) : 0,
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
