import { executeBattleAction } from './battleEngine'
import { fromEngineState, toEngineState } from './stateAdapter'

export const BASIC_ACTIONS = Object.freeze({
  defend: {
    type: 'defend',
    steps: [
      {
        effects: [
          { type: 'flag_set', target: 'source', flag: 'defending', value: true },
          { type: 'resource_add', target: 'source', resource: 'energy', value: 10 },
        ],
        events: [
          { type: 'ability_used', payload: { action: 'defend' } },
        ],
      },
    ],
  },
})

export function executeBasicAction(legacyState, sourceId, targetId, actionType, options = {}) {
  const action = BASIC_ACTIONS[actionType]
  if (!action) throw new Error(`Unsupported basic action: ${actionType}`)

  const engineState = toEngineState(legacyState)
  const result = executeBattleAction(
    engineState,
    {
      sourceId,
      targetId,
      steps: action.steps,
      triggers: options.triggers || [],
    },
    options,
  )

  return {
    ...result,
    state: fromEngineState(result.state),
  }
}
