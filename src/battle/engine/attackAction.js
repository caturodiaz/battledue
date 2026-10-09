import { executeBattleAction } from './battleEngine.js'
import { fromEngineState, toEngineState } from './stateAdapter.js'

export const BASIC_ATTACK = Object.freeze({
  type: 'basic_attack',
  steps: [
    {
      events: [
        { type: 'before_action', payload: { action: 'basic_attack' } },
      ],
    },
    {
      effects: [
        {
          type: 'damage_resolve',
          multiplier: 1,
        },
      ],
    },
    {
      events: [
        { type: 'ability_used', payload: { action: 'basic_attack' } },
      ],
    },
  ],
})

export function executeBasicAttack(legacyState, sourceId, targetId, options = {}) {
  const result = executeBattleAction(
    toEngineState(legacyState),
    {
      sourceId,
      targetId,
      steps: BASIC_ATTACK.steps,
      triggers: options.triggers || [],
    },
    options,
  )

  return {
    ...result,
    state: fromEngineState(result.state),
  }
}
