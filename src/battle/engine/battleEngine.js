import { applyEffects } from './effects'
import { appendEventHistory, consumeBattleEvents, queueBattleEvent } from './events'
import { applyTriggers } from './triggers'

const DEFAULT_MAX_EVENTS = 100

export function processBattleEvents(state, sourceId, targetId, triggers = [], options = {}) {
  const maxEvents = Math.max(1, Number(options.maxEvents) || DEFAULT_MAX_EVENTS)
  let nextState = state
  let processed = 0
  const processedEvents = []

  while (Array.isArray(nextState?.combat_events) && nextState.combat_events.length > 0) {
    if (processed >= maxEvents) {
      throw new Error(`Battle event limit exceeded (${maxEvents})`)
    }

    const [event, ...remainingEvents] = nextState.combat_events
    nextState = { ...nextState, combat_events: remainingEvents }
    processed += 1
    processedEvents.push(event)
    nextState = applyTriggers(nextState, sourceId, targetId, event, triggers)
  }

  nextState = appendEventHistory(nextState, processedEvents)
  return {
    state: nextState,
    processedEvents,
  }
}

export function executeBattleAction(state, action, options = {}) {
  if (!action || typeof action !== 'object') {
    throw new Error('Battle action is required')
  }

  const sourceId = action.sourceId
  const targetId = action.targetId
  let nextState = state

  if (action.beforeEffects) {
    nextState = applyEffects(nextState, sourceId, targetId, action.beforeEffects)
  }

  for (const event of action.events || []) {
    nextState = queueBattleEvent(nextState, event.type, event.payload)
  }

  if (action.effects) {
    nextState = applyEffects(nextState, sourceId, targetId, action.effects)
  }

  const result = processBattleEvents(
    nextState,
    sourceId,
    targetId,
    action.triggers || [],
    options,
  )

  if (action.afterEffects) {
    result.state = applyEffects(result.state, sourceId, targetId, action.afterEffects)
  }

  return result
}

export function createBattleState(players = {}) {
  return {
    players,
    combat_events: [],
    event_history: [],
  }
}

export function clearBattleEvents(state) {
  return consumeBattleEvents(state)
}
