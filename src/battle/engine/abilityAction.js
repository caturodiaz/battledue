import { executeBattleAction } from './battleEngine.js'
import { createAbilityAction } from './abilityDefinition.js'
import { fromEngineState, toEngineState } from './stateAdapter.js'

const MAX_ENERGY = 100

function getResource(unit, resource) {
  if (unit?.resources && resource in unit.resources) return Number(unit.resources[resource]) || 0
  return Number(unit?.[resource]) || 0
}

function applyAbilityCosts(state, sourceId, costs = {}) {
  const source = state?.players?.[sourceId] || {}
  const currentResources = { ...(source.resources || {}) }

  for (const [resource, rawCost] of Object.entries(costs || {})) {
    const cost = Math.max(0, Number(rawCost) || 0)
    const currentValue = resource in currentResources ? Number(currentResources[resource]) || 0 : getResource(source, resource)
    if (currentValue < cost) throw new Error(`Insufficient ${resource} to execute ability`)
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

export function executeAbilityAction(state, sourceId, targetId, options = {}) {
  const { ability } = options
  if (!ability) throw new Error('Declarative ability is required')

  const engineState = toEngineState(state)
  const action = createAbilityAction(ability)
  const combatResult = options.combatResult || {}
  const hit = combatResult.hit ?? options.hit ?? true
  const critical = combatResult.critical ?? options.critical ?? false
  const resolvedAmount = combatResult.damage ?? options.resolvedAmount
  const nextState = applyAbilityCosts(engineState, sourceId, action.costs)

  const result = executeBattleAction(nextState, {
    sourceId,
    targetId,
    steps: action.steps,
    triggers: action.triggers,
  }, {
    ...options,
    hit,
    critical,
    resolvedAmount,
    ultimate: Boolean(options.ultimate || combatResult.ultimate),
  })

  const finalState = fromEngineState(result.state)
  const initialHp = Number(state?.players?.[sourceId]?.hp) || 0
  const finalHp = Number(finalState?.players?.[sourceId]?.hp) || 0

  return {
    ...result,
    healing: Math.max(0, finalHp - initialHp),
    state: finalState,
  }
}
