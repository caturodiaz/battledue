const VALID_TRIGGER_EVENTS = new Set([
  'before_action',
  'after_action',
  'before_damage',
  'before_receive_damage',
  'after_damage',
  'critical_hit',
  'target_defeated',
  'turn_start',
  'turn_end',
  'action_received',
  'ability_used',
])

const VALID_EFFECT_TYPES = new Set([
  'damage',
  'damage_resolve',
  'heal',
  'resource_add',
  'state_add',
  'state_remove',
  'state_stack_add',
  'state_stack_remove',
  'modifier',
  'delay',
  'snapshot',
  'restore_snapshot',
  'transform',
])

export function validateAbility(ability = {}) {
  const errors = []

  if (!ability.id || typeof ability.id !== 'string') errors.push('id is required')
  if (!ability.name || typeof ability.name !== 'string') errors.push('name is required')
  if (!Array.isArray(ability.effects) && !Array.isArray(ability.steps) && !Array.isArray(ability.triggers)) {
    errors.push('ability must define effects, steps, or triggers')
  }

  for (const trigger of ability.triggers || []) {
    if (!VALID_TRIGGER_EVENTS.has(trigger?.event)) errors.push(`invalid trigger event: ${trigger?.event}`)
    if (!Array.isArray(trigger?.effects) && !Array.isArray(trigger?.modifiers)) {
      errors.push(`trigger ${trigger?.event || 'unknown'} needs effects or modifiers`)
    }
  }

  const validateEffects = (effects, location) => {
    for (const effect of effects || []) {
      if (!VALID_EFFECT_TYPES.has(effect?.type)) errors.push(`invalid effect type at ${location}: ${effect?.type}`)
    }
  }

  validateEffects(ability.effects, 'effects')
  for (const step of ability.steps || []) validateEffects(step?.effects, 'steps')
  for (const trigger of ability.triggers || []) validateEffects(trigger?.effects, 'trigger')

  return { valid: errors.length === 0, errors }
}

export function normalizeAbility(ability = {}) {
  return {
    id: ability.id,
    name: ability.name,
    description: ability.description || '',
    costs: { ...(ability.costs || {}) },
    cooldown: ability.cooldown ?? null,
    targeting: { mode: 'single_enemy', ...(ability.targeting || {}) },
    conditions: Array.isArray(ability.conditions) ? ability.conditions : [],
    effects: Array.isArray(ability.effects) ? ability.effects : [],
    steps: Array.isArray(ability.steps) ? ability.steps : [],
    triggers: Array.isArray(ability.triggers) ? ability.triggers : [],
    combat: { ...(ability.combat || {}) },
    metadata: { ...(ability.metadata || {}) },
  }
}
