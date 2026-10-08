import { getAbilityBattleEffect } from './abilityEffects.js'
import { normalizeAbility, validateAbility } from './abilitySchema.js'

function getEffects(ability = {}) {
  if (Array.isArray(ability.effects)) return ability.effects
  if (Array.isArray(ability.steps)) return ability.steps.flatMap((step) => step?.effects || [])
  return []
}

function getDeclarativeBattleEffect(ability) {
  const effect = getEffects(ability).find((item) => item?.type === 'state_add' && item.state)
  if (!effect) return null

  return {
    type: effect.state,
    target: effect.target || 'enemy',
    data: {
      turns: effect.duration ?? effect.turns,
      stacks: effect.stacks,
    },
  }
}

function getDamageMultiplier(ability, fallback) {
  const damageEffect = getEffects(ability).find((effect) => effect?.type === 'damage_resolve')
  return Number(ability?.combat?.multiplier ?? damageEffect?.multiplier ?? fallback)
}

/**
 * Produces the engine action configuration for both saved legacy profiles and
 * declarative ability definitions. Callers select an ability; they do not
 * decide its combat parameters.
 */
export function createAbilityAction(ability = {}, options = {}) {
  const normalized = normalizeAbility(ability)
  const validation = validateAbility(normalized)

  if (!validation.valid) {
    throw new Error(`Invalid ability: ${validation.errors.join('; ')}`)
  }

  const kind = options.kind || 'ability'
  const isUltimate = kind === 'ultimate'
  const index = Math.max(0, Number(options.index) || 0)

  const effects = getEffects(normalized)
  const legacyAbility = effects.length === 0
  const fallbackMultiplier = isUltimate ? 3 : 1.45 + index * 0.15
  const battleEffect = getAbilityBattleEffect(normalized) || getDeclarativeBattleEffect(normalized)
  const fullHeal = battleEffect?.type === 'full_heal_self'

  const steps = normalized.steps.length > 0
    ? normalized.steps.map((step) => ({
        events: Array.isArray(step?.events) ? step.events : [],
        effects: Array.isArray(step?.effects) ? step.effects : [],
      }))
    : normalized.effects.map((effect) => ({ effects: [effect] }))

  const abilityUsedEvent = {
    type: 'ability_used',
    payload: { ability: normalized.id },
  }

  if (steps.length === 0) {
    steps.push({ events: [abilityUsedEvent] })
  } else {
    const lastStep = steps[steps.length - 1]
    steps[steps.length - 1] = {
      ...lastStep,
      events: [...lastStep.events, abilityUsedEvent],
    }
  }

  return {
    // Declarative engine configuration
    type: 'ability',
    abilityId: normalized.id,
    costs: normalized.costs,
    steps,
    triggers: normalized.triggers,

    // Legacy/action metadata kept for existing callers
    id: normalized.id,
    name: normalized.name || (isUltimate ? 'Técnica definitiva' : 'Habilidad'),
    kind,
    energyCost: Math.max(
      0,
      Number(normalized?.costs?.energy ?? (isUltimate ? 100 : 25)) || 0,
    ),
    multiplier: fullHeal ? 0 : getDamageMultiplier(normalized, fallbackMultiplier),
    guaranteedHit: Boolean(normalized?.combat?.guaranteedHit ?? isUltimate),
    criticalBonus: Number(
      normalized?.combat?.criticalBonus ?? (isUltimate ? 15 : 5),
    ) || 0,
    battleEffect,

    // Existing unstructured profiles were historically offensive. Explicit
    // definitions opt into damage only by declaring damage_resolve.
    dealsDamage:
      (legacyAbility && !fullHeal) ||
      effects.some((effect) => effect?.type === 'damage_resolve'),
  }
}
EOF