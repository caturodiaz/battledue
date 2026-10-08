import { executeBattleAction } from './battleEngine.js'
import { fromEngineState, toEngineState } from './stateAdapter.js'

export function executeAbilityAction(legacyState, sourceId, targetId, options = {}) {
  const {
    damage = 0,
    critical = false,
    energy = 0,
    battleEffect = null,
    hit = true,
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
    value: Math.max(0, Math.min(100, Number(energy) || 0)),
  })

  effects.push({ type: 'battle_state_decrement_all' })

  if (hit && battleEffect && battleEffect.type && battleEffect.type !== 'heal_self' && battleEffect.type !== 'full_heal_self') {
      effects.push({
        type: 'battle_state_add',
        target: battleEffect.target || 'enemy',
        state: battleEffect.type,
        turns: battleEffect.data?.turns ?? battleEffect.turns,
        stacks: battleEffect.data?.stacks ?? battleEffect.stacks,
      })
    }
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
    },
  )

  return {
    ...result,
    state: fromEngineState(result.state),
  }
}
