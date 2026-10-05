import { applyEffects } from './effects'

function getUnit(state, unitId) {
  return state?.players?.[unitId] || {}
}

function hasStatus(unit, statusId) {
  return Array.isArray(unit?.statuses) && unit.statuses.some((status) => status?.id === statusId)
}

function matchesCondition(state, sourceId, targetId, condition = {}) {
  const source = getUnit(state, sourceId)
  const target = getUnit(state, targetId)

  if (condition.status) {
    const owner = condition.owner === 'target' ? target : source
    if (condition.exists === false ? hasStatus(owner, condition.status) : !hasStatus(owner, condition.status)) return false
  }

  if (condition.resource) {
    const owner = condition.owner === 'target' ? target : source
    const value = Number(owner?.resources?.[condition.resource]) || 0
    const expected = Number(condition.value) || 0
    if (condition.operator === 'gte' && value < expected) return false
    if (condition.operator === 'gt' && value <= expected) return false
    if (condition.operator === 'lte' && value > expected) return false
    if (condition.operator === 'lt' && value >= expected) return false
    if (!condition.operator && value !== expected) return false
  }

  if (condition.flag) {
    const owner = condition.owner === 'target' ? target : source
    const actual = owner?.flags?.[condition.flag]
    if ('value' in condition && actual !== condition.value) return false
    if (condition.exists === true && actual === undefined) return false
    if (condition.exists === false && actual !== undefined) return false
  }

  return true
}

export function triggerMatchesEvent(trigger, event) {
  return Boolean(trigger && event && trigger.event === event.type)
}

export function applyTriggers(state, sourceId, targetId, event, triggers = []) {
  if (!event || !Array.isArray(triggers)) return state

  return triggers.reduce((currentState, trigger) => {
    if (!triggerMatchesEvent(trigger, event)) return currentState
    if (!matchesCondition(currentState, sourceId, targetId, trigger.condition || {})) return currentState
    return applyEffects(currentState, sourceId, targetId, trigger.effects || [])
  }, state)
}

export function processQueuedTriggers(state, sourceId, targetId, triggers = []) {
  const events = Array.isArray(state?.combat_events) ? state.combat_events : []
  let nextState = state

  for (const event of events) {
    nextState = applyTriggers(nextState, sourceId, targetId, event, triggers)
  }

  return nextState
}
