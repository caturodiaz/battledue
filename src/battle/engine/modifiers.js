export function createDamageContext(input = {}) {
  return {
    ...input,
    amount: Number(input.amount || 0),
    multiplier: Number(input.multiplier ?? 1),
    prevented: Boolean(input.prevented),
  }
}

export function applyDamageModifiers(context, modifiers = []) {
  return modifiers.reduce((current, modifier) => {
    if (!modifier || typeof modifier !== 'object') return current

    if (modifier.type === 'damage_multiplier') {
      return {
        ...current,
        multiplier: current.multiplier * Number(modifier.value ?? 1),
      }
    }

    if (modifier.type === 'damage_flat') {
      return {
        ...current,
        amount: Math.max(0, current.amount + Number(modifier.value ?? 0)),
      }
    }

    if (modifier.type === 'damage_cap') {
      return {
        ...current,
        amount: Math.min(current.amount, Number(modifier.value ?? current.amount)),
      }
    }

    if (modifier.type === 'prevent_damage') {
      return {
        ...current,
        amount: 0,
        prevented: true,
      }
    }

    return current
  }, createDamageContext(context))
}
