export const BATTLE_EVENTS = Object.freeze({
  BATTLE_START: 'battle_start',
  TURN_START: 'turn_start',
  BEFORE_ACTION: 'before_action',
  ABILITY_USED: 'ability_used',
  BEFORE_DAMAGE: 'before_damage',
  AFTER_DAMAGE: 'after_damage',
  BEFORE_RECEIVE_DAMAGE: 'before_receive_damage',
  AFTER_RECEIVE_DAMAGE: 'after_receive_damage',
  CRITICAL_HIT: 'critical_hit',
  TARGET_DEFEATED: 'target_defeated',
  TURN_END: 'turn_end',
  BATTLE_END: 'battle_end',
})

export function createBattleEvent(type, payload = {}) {
  if (!type || typeof type !== 'string') {
    throw new Error('Battle event type is required')
  }

  return {
    type,
    payload: payload && typeof payload === 'object' ? payload : {},
  }
}

export function queueBattleEvent(state, type, payload = {}) {
  const event = createBattleEvent(type, payload)
  return {
    ...state,
    combat_events: [...(Array.isArray(state?.combat_events) ? state.combat_events : []), event],
    last_event: event,
  }
}

export function consumeBattleEvents(state) {
  return {
    ...state,
    combat_events: [],
  }
}

export function appendEventHistory(state, events = []) {
  if (!Array.isArray(events) || events.length === 0) return state
  return {
    ...state,
    event_history: [...(Array.isArray(state?.event_history) ? state.event_history : []), ...events],
  }
}
