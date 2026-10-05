import { applyEffect, applyEffects } from './effects.js'
import { resolveDamageEffect } from './damageEffect.js'

export function resolveEffects(state, sourceId, targetId, effects = [], options = {}) {
  if (!Array.isArray(effects)) return { state, results: [] }

  let nextState = state
  const results = []

  for (const effect of effects) {
    if (effect?.type === 'damage_resolve') {
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
