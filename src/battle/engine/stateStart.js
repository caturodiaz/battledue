import { BATTLE_STATES } from './battleStateConfig.js'

export function processBattleStateStartOfTurn(states = [], maxHp = 0) {
  const updatedStates = [...states]
  const messages = []
  let hpChange = 0

  for (const state of updatedStates) {
    const startTurn = BATTLE_STATES[state?.type]?.startTurn
    if (!startTurn?.damagePercentPerStack) continue

    const damage = Math.max(1, Math.floor(maxHp * startTurn.damagePercentPerStack)) * Math.max(1, Number(state.stacks) || 1)
    hpChange -= damage
    messages.push({
      type: state.type,
      text: (startTurn.message || '{state} causes {damage} damage.').replace('{damage}', damage),
    })
  }

  return {
    states: updatedStates,
    hpChange,
    messages,
  }
}
