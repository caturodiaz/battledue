const LEGACY_STATUS_RULES = [
  { type: 'bleeding', target: 'enemy', data: { turns: 3, stacks: 1 } },
  { type: 'stunned', target: 'enemy', data: { turns: 1 } },
  { type: 'unconscious', target: 'enemy', data: { turns: 1 } },
  { type: 'evasion', target: 'self', data: { turns: 1 } },
  { type: 'rage', target: 'self', data: { turns: 2 } },
  { type: 'heal_self', target: 'self', data: { amount: 0 } },
  { type: 'full_heal_self', target: 'self', data: {} },
]

/**
 * Adapts the effect fields used by existing character profiles to the battle
 * action contract. This belongs to the engine because it defines combat
 * semantics; callers only choose which ability to use.
 */
export function getAbilityBattleEffect(ability) {
  const explicit = ability?.statusEffect || ability?.battleEffect || ability?.status
  if (!explicit) return null

  if (typeof explicit === 'string') {
    const rule = LEGACY_STATUS_RULES.find((item) => item.type === explicit)
    return rule ? { type: rule.type, target: rule.target, data: { ...rule.data } } : null
  }

  if (typeof explicit !== 'object') return null

  const effectType = explicit.type || explicit.status
  const rule = LEGACY_STATUS_RULES.find((item) => item.type === effectType)
  if (!rule) return null

  return {
    type: rule.type,
    target: explicit.target || rule.target,
    data: { ...rule.data, ...explicit },
  }
}
