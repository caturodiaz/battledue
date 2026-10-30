import { BATTLE_STATES } from './engine/battleStateConfig.js'

export function getBattleStateInfo(states = []) {
  return states.map((state) => {
    const config = BATTLE_STATES[state.type]

    if (!config) {
      return state
    }

    return {
      ...state,
      name: config.name,
      icon: config.icon,
    }
  })
}
