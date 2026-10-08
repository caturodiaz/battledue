export function processBattleStateStartOfTurn(states = [], maxHp = 0) {
  const bleeding = states.find((state) => state?.type === 'bleeding')
  if (!bleeding) {
    return { hpChange: 0, messages: [] }
  }

  const damagePerStack = Math.max(1, Math.floor(maxHp * 0.05))
  const bleedingDamage = damagePerStack * (Number(bleeding.stacks) || 0)

  return {
    hpChange: -bleedingDamage,
    messages: [{
      type: 'bleeding',
      text: `🩸 Sangrado causa ${bleedingDamage} de daño.`,
    }],
  }
}
