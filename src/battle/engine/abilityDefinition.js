import { normalizeAbility, validateAbility } from './abilitySchema.js'

export function createAbilityAction(ability = {}) {
  const normalized = normalizeAbility(ability)
  const validation = validateAbility(normalized)

  if (!validation.valid) {
    throw new Error(`Invalid ability: ${validation.errors.join('; ')}`)
  }

  const steps = normalized.steps.length > 0
    ? normalized.steps.map((step) => ({
        events: Array.isArray(step?.events) ? step.events : [],
        effects: Array.isArray(step?.effects) ? step.effects : [],
      }))
    : normalized.effects.length > 0
      ? [{ effects: normalized.effects }]
      : []

  return {
    type: 'ability',
    abilityId: normalized.id,
    costs: normalized.costs,
    steps,
    triggers: normalized.triggers,
  }
}
