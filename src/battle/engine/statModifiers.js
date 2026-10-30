export const BASE_STATS = ['range', 'speed', 'control', 'defense', 'strength', 'endurance']

export function applyStatModifiers(stats = {}, modifiers = []) {
  const result = { ...stats }

  for (const modifier of modifiers) {
    if (!modifier || !BASE_STATS.includes(modifier.stat)) continue

    const base = Number(result[modifier.stat] || 0)
    if (modifier.operation === 'add') result[modifier.stat] = base + Number(modifier.value || 0)
    else if (modifier.operation === 'multiply') result[modifier.stat] = base * Number(modifier.value ?? 1)
    else if (modifier.operation === 'set') result[modifier.stat] = Number(modifier.value || 0)
  }

  return result
}

export function collectActiveStatModifiers(states = []) {
  return states.flatMap((state) => {
    const modifiers = Array.isArray(state?.statModifiers) ? state.statModifiers : []
    return modifiers.map((modifier) => ({ ...modifier, sourceState: state?.id || state?.name }))
  })
}
