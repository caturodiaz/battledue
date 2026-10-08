import { BATTLE_STATES } from '../ai/battleStates.js'

function hasState(states = [], type) {
  return states.some((state) => state?.type === type)
}

function removeState(states = [], type) {
  return states.filter((state) => state?.type !== type)
}

export function resolveAttackState(state, sourceId, targetId, damage = 0, options = {}) {
  const source = state?.players?.[sourceId]
  const target = state?.players?.[targetId]
  const attackerStates = Array.isArray(source?.states) ? source.states : []
  const defenderStates = Array.isArray(target?.states) ? target.states : []
  const random = typeof options.random === 'function' ? options.random : Math.random

  if (hasState(attackerStates, 'unconscious')) {
    return {
      state,
      hit: false,
      damage: 0,
      reason: 'unconscious',
      message: '💫 ¡Está inconsciente y no puede atacar!',
    }
  }

  if (hasState(attackerStates, 'stunned')) {
    const missed = random() < BATTLE_STATES.stunned.missChance

    if (missed) {
      return {
        state,
        hit: false,
        damage: 0,
        reason: 'stunned',
        message: '🌀 ¡Está aturdido y falla el ataque!',
      }
    }
  }

  if (hasState(defenderStates, 'evasion')) {
    const dodged = random() < BATTLE_STATES.evasion.dodgeChance

    if (dodged) {
      return {
        state: {
          ...state,
          players: {
            ...state.players,
            [targetId]: {
              ...target,
              states: removeState(defenderStates, 'evasion'),
            },
          },
        },
        hit: false,
        damage: 0,
        reason: 'evasion',
        consumeEvasion: true,
        message: '💨 ¡El ataque fue esquivado!',
      }
    }
  }

  let finalDamage = Number(damage) || 0

  if (hasState(attackerStates, 'rage')) {
    finalDamage = Math.floor(finalDamage * BATTLE_STATES.rage.damageMultiplier)
  }

  if (hasState(defenderStates, 'rage')) {
    finalDamage = Math.floor(finalDamage * BATTLE_STATES.rage.receivedDamageMultiplier)
  }

  return {
    state,
    hit: true,
    damage: Math.max(0, finalDamage),
    reason: null,
    message: null,
  }
}
