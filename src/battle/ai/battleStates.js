/*
 * =========================================
 * BATTLE STATES
 * =========================================
 *
 * Sistema centralizado para los estados
 * alterados durante un combate.
 *
 * Estados disponibles:
 *
 * 🩸 bleeding
 * 🌀 stunned
 * 💫 unconscious
 * 💨 evasion
 * 🔥 rage
 */

/*
 * =========================================
 * CONFIGURACIÓN
 * =========================================
 */

export const BATTLE_STATES = {
  bleeding: {
    id: 'bleeding',
    name: 'Sangrado',
    icon: '🩸',
    duration: 3,
    maxStacks: 3,
  },

  stunned: {
    id: 'stunned',
    name: 'Aturdido',
    icon: '🌀',
    duration: 1,
    missChance: 0.5,
  },

  unconscious: {
    id: 'unconscious',
    name: 'Inconsciente',
    icon: '💫',
    duration: 1,
  },

  evasion: {
    id: 'evasion',
    name: 'Evasión',
    icon: '💨',
    duration: 1,
    dodgeChance: 0.35,
  },

  rage: {
    id: 'rage',
    name: 'Furia',
    icon: '🔥',
    duration: 2,
    damageMultiplier: 1.25,
    receivedDamageMultiplier: 1.15,
  },
}

/*
 * =========================================
 * CREAR ESTADO
 * =========================================
 */

export function createBattleState(
  type,
  customData = {}
) {
  const config =
    BATTLE_STATES[type]

  if (!config) {
    return null
  }

  return {
    type,
    turns:
      customData.turns ??
      config.duration,
    stacks:
      customData.stacks ?? 1,
    ...customData,
  }
}

/*
 * =========================================
 * APLICAR ESTADO
 * =========================================
 */

export function applyBattleState(
  currentStates = [],
  type,
  customData = {}
) {
  const config =
    BATTLE_STATES[type]

  if (!config) {
    return currentStates
  }

  const existingIndex =
    currentStates.findIndex(
      (state) =>
        state.type === type
    )

  /*
   * Estados acumulables
   */

  if (
    type === 'bleeding' &&
    existingIndex !== -1
  ) {
    const existingState =
      currentStates[existingIndex]

    const newStacks = Math.min(
      existingState.stacks + 1,
      config.maxStacks
    )

    const updatedState = {
      ...existingState,
      stacks: newStacks,
      turns:
        customData.turns ??
        config.duration,
    }

    const newStates = [
      ...currentStates,
    ]

    newStates[existingIndex] =
      updatedState

    return newStates
  }

  /*
   * Si el estado ya existe,
   * renovamos su duración.
   */

  if (existingIndex !== -1) {
    const newStates = [
      ...currentStates,
    ]

    newStates[existingIndex] = {
      ...newStates[existingIndex],
      turns:
        customData.turns ??
        config.duration,
    }

    return newStates
  }

  /*
   * Estado nuevo
   */

  return [
    ...currentStates,
    createBattleState(
      type,
      customData
    ),
  ]
}

/*
 * =========================================
 * QUITAR ESTADO
 * =========================================
 */

export function removeBattleState(
  states = [],
  type
) {
  return states.filter(
    (state) =>
      state.type !== type
  )
}

/*
 * =========================================
 * COMPROBAR ESTADO
 * =========================================
 */

export function hasBattleState(
  states = [],
  type
) {
  return states.some(
    (state) =>
      state.type === type
  )
}

/*
 * =========================================
 * OBTENER ESTADO
 * =========================================
 */

export function getBattleState(
  states = [],
  type
) {
  return (
    states.find(
      (state) =>
        state.type === type
    ) || null
  )
}

/*
 * =========================================
 * PROCESAR INICIO DEL TURNO
 * =========================================
 *
 * Aquí procesamos los efectos que ocurren
 * automáticamente al comenzar el turno.
 */

/*
 * =========================================
 * INFORMACIÓN PARA LA UI
 * =========================================
 */

export function getBattleStateInfo(
  states = []
) {
  return states.map(
    (state) => {
      const config =
        BATTLE_STATES[state.type]

      if (!config) {
        return state
      }

      return {
        ...state,
        name: config.name,
        icon: config.icon,
      }
    }
  )
}