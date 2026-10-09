import { applyEffect, applyEffects } from './effects.js'
import { resolveDamageEffect } from './damageEffect.js'

const IMPACT_DEPENDENT_EFFECTS = new Set([
  'damage',
  'damage_resolve',
  'heal',
  'state_add',
  'battle_state_add',
  'state_remove',
  'battle_state_remove',
])

export function resolveEffects(state, sourceId, targetId, effects = [], options = {}) {
  if (!Array.isArray(effects)) return { state, results: [] }

  let nextState = state
  const results = []

  for (const effect of effects) {
    if (!effect || typeof effect !== 'object') continue

    if (options.hit === false && IMPACT_DEPENDENT_EFFECTS.has(effect.type) && effect.requiresHit !== false) {
      continue
    }

    if (effect.type === 'damage_resolve') {
      const result = resolveDamageEffect(nextState, sourceId, targetId, effect, options)
      nextState = result.state
      results.push(result)
      continue
    }

    nextState = applyEffect(nextState, sourceId, targetId, effect)
  }

  return { state: nextState, results }
}

export function resolveBasicEffects(state, sourceId, targetId, effects = []) {
  return applyEffects(state, sourceId, targetId, effects)
}
