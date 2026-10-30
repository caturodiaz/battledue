/*
 * =========================================
 * BATTLE STATE CONFIGURATION
 * =========================================
 *
 * Shared metadata and combat rules for
 * altered battle states.
 */

export const BATTLE_STATES = {
  bleeding: {
    id: 'bleeding',
    name: 'Sangrado',
    icon: '🩸',
    duration: 3,
    maxStacks: 3,
    stacking: 'add',
    startTurn: { damagePercentPerStack: 0.05, message: '🩸 Sangrado causa {damage} de daño.' },
  },

  stunned: {
    id: 'stunned',
    name: 'Aturdido',
    icon: '🌀',
    duration: 1,
    stacking: 'refresh',
    missChance: 0.5,
  },

  unconscious: {
    id: 'unconscious',
    name: 'Inconsciente',
    icon: '💫',
    duration: 1,
    stacking: 'refresh',
  },

  evasion: {
    id: 'evasion',
    name: 'Evasión',
    icon: '💨',
    duration: 1,
    stacking: 'refresh',
    dodgeChance: 0.35,
  },

  rage: {
    id: 'rage',
    name: 'Furia',
    icon: '🔥',
    duration: 2,
    stacking: 'refresh',
    damageMultiplier: 1.25,
    receivedDamageMultiplier: 1.15,
  },
}
