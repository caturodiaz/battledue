import { evaluateCondition } from './conditions.js'

export function collectDamageModifiers(state, event, triggers = []) {
  return triggers.reduce((modifiers, trigger) => {
    if (!trigger || trigger.event !== event.type) return modifiers
    if (!evaluateCondition(state, event.payload?.source, event.payload?.target, trigger.condition)) return modifiers
    const next = Array.isArray(trigger.modifiers) ? trigger.modifiers : []
    return modifiers.concat(next)
  }, [])
}

export function collectReceiveDamageModifiers(state, sourceId, targetId, event, triggers = []) {
  return collectDamageModifiers(
    state,
    {
      ...event,
      type: 'before_receive_damage',
      payload: {
        ...(event?.payload || {}),
        source: sourceId,
        target: targetId,
      },
    },
    triggers,
  )
}
