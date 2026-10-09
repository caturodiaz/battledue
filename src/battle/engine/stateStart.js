export function processBattleStateStartOfTurn(states = [], maxHp = 0) {
  const updatedStates = [...states]
  const bleeding = updatedStates.find((state) => state?.type === 'bleeding')
  if (!bleeding) {
    return { states: updatedStates, hpChange: 0, messages: [] }
  }

  const damagePerStack = Math.max(1, Math.floor(maxHp * 0.05))
  const bleedingDamage = damagePerStack * bleeding.stacks

  return {
    states: updatedStates,
    hpChange: -bleedingDamage,
    messages: [{
      type: 'bleeding',
      text: `🩸 Sangrado causa ${bleedingDamage} de daño.`,
    }],
  }
}
