import { normalizeAbility, validateAbility } from './abilitySchema.js'

function getEffects(ability = {}) {
  return [
    ...(Array.isArray(ability.effects) ? ability.effects : []),
    ...(Array.isArray(ability.steps) ? ability.steps.flatMap((step) => step?.effects || []) : []),
  ]
}

// This is intentionally presentation-safe: callers can use it to render an
// ability before attempting execution, while createAbilityAction remains the
// validation boundary for combat.
export function getAbilitySummary(ability = {}, defaults = {}) {
  const normalized = normalizeAbility(ability)
  const effects = getEffects(normalized)
  const damageEffect = effects.find((effect) => effect?.type === 'damage_resolve')

  return {
    id: normalized.id,
    name: normalized.name || defaults.name || 'Habilidad',
    energyCost: Number(normalized.costs.energy ?? defaults.energyCost ?? 0),
    multiplier: Number(normalized.combat.multiplier ?? damageEffect?.multiplier ?? defaults.multiplier ?? 1),
    guaranteedHit: Boolean(normalized.combat.guaranteedHit ?? defaults.guaranteedHit ?? false),
    criticalBonus: Number(normalized.combat.criticalBonus ?? defaults.criticalBonus ?? 0),
    ultimate: Boolean(normalized.combat.ultimate ?? defaults.ultimate ?? false),
    dealsDamage: effects.some((effect) => effect?.type === 'damage_resolve' || effect?.type === 'damage'),
  }
}

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
    : normalized.effects.map((effect) => ({
        events: [],
        effects: [effect],
      }))

  const abilityUsedEvent = {
    type: 'ability_used',
    payload: { ability: normalized.id },
  }

  if (steps.length === 0) {
    steps.push({ events: [abilityUsedEvent], effects: [] })
  } else {
    const lastStep = steps[steps.length - 1]
    steps[steps.length - 1] = {
      ...lastStep,
      events: [...(lastStep.events || []), abilityUsedEvent],
    }
  }

  return {
    type: 'ability',
    abilityId: normalized.id,
    costs: normalized.costs,
    combat: getAbilitySummary(normalized),
    steps,
    triggers: normalized.triggers,
  }
}
