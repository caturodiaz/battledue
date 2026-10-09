import { processBattleStateStartOfTurn } from './stateStart.js'

export function startBattleTurn(state, unitId) {
  const player = state?.players?.[unitId]
  if (!player) {
    return { state, hpChange: 0, messages: [] }
  }

  const maxHp = Number(player.max_hp) || 0
  const result = processBattleStateStartOfTurn(player.states || [], maxHp)
  const hp = Math.max(0, (Number(player.hp) || 0) + result.hpChange)

  return {
    state: {
      ...state,
      players: {
        ...(state.players || {}),
        [unitId]: {
          ...player,
          hp,
        },
      },
    },
    hpChange: result.hpChange,
    messages: result.messages,
  }
}
