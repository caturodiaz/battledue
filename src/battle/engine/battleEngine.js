import { appendEventHistory, consumeBattleEvents, queueBattleEvent } from './events.js'
import { applyTriggers } from './triggers.js'
import { resolveEffects } from './resolveEffects.js'

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
  return { state: nextState, processedEvents }
}

export function executeBattleAction(state, action, options = {}) {
  if (!action || typeof action !== 'object') {
    throw new Error('Battle action is required')
  }

  const sourceId = action.sourceId
  const targetId = action.targetId
  const triggers = action.triggers || []
  let nextState = state
  let processedEvents = []
  let processedCount = 0
  let effectResults = []

  const steps = Array.isArray(action.steps)
    ? action.steps
    : [
        ...(action.beforeEffects ? [{ effects: action.beforeEffects }] : []),
        ...(action.events ? [{ events: action.events }] : []),
        ...(action.effects ? [{ effects: action.effects }] : []),
      ]

  for (const step of steps) {
    if (Array.isArray(step.events)) {
      for (const event of step.events) {
        nextState = queueBattleEvent(nextState, event.type, event.payload)
      }
    }

    if (Array.isArray(step.effects)) {
      const result = resolveEffects(nextState, sourceId, targetId, step.effects, options)
      nextState = result.state
      effectResults = [...effectResults, ...result.results]
    }

    const result = processBattleEvents(nextState, sourceId, targetId, triggers, options)
    nextState = result.state
    processedEvents = [...processedEvents, ...result.processedEvents]
    processedCount += result.processedEvents.length
  }

  return {
    state: nextState,
    processedEvents,
    processedCount,
    effectResults,
  }
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
