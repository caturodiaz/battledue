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

export function processBattleStateStartOfTurn(
  states = [],
  maxHp = 0
) {
  let updatedStates = [
    ...states,
  ]

  let hpChange = 0

  const messages = []

  /*
   * 🩸 SANGRADO
   */

  const bleeding =
    getBattleState(
      updatedStates,
      'bleeding'
    )

  if (bleeding) {
    /*
     * 5% de la vida máxima por
     * acumulación.
     */

    const damagePerStack =
      Math.max(
        1,
        Math.floor(
          maxHp * 0.05
        )
      )

    const bleedingDamage =
      damagePerStack *
      bleeding.stacks

    hpChange -=
      bleedingDamage

    messages.push({
      type: 'bleeding',
      text: `🩸 Sangrado causa ${bleedingDamage} de daño.`,
    })
  }

  return {
    states: updatedStates,
    hpChange,
    messages,
  }
}

/*
 * =========================================
 * PROCESAR ATAQUE
 * =========================================
 *
 * Determina si un ataque puede ejecutarse,
 * si falla por Aturdido o si es esquivado.
 */

export function processBattleAttack({
  attackerStates = [],
  defenderStates = [],
  damage = 0,
}) {
  /*
   * =========================================
   * INCONSCIENTE
   * =========================================
   *
   * No puede realizar ataques.
   */

  if (
    hasBattleState(
      attackerStates,
      'unconscious'
    )
  ) {
    return {
      hit: false,
      damage: 0,
      reason: 'unconscious',
      message:
        '💫 ¡Está inconsciente y no puede atacar!',
    }
  }

  /*
   * =========================================
   * ATURDIDO
   * =========================================
   *
   * Tiene 50% de probabilidad de fallar.
   */

  if (
    hasBattleState(
      attackerStates,
      'stunned'
    )
  ) {
    const stunnedConfig =
      BATTLE_STATES.stunned

    const missed =
      Math.random() <
      stunnedConfig.missChance

    if (missed) {
      return {
        hit: false,
        damage: 0,
        reason: 'stunned',
        message:
          '🌀 ¡Está aturdido y falla el ataque!',
      }
    }
  }

  /*
   * =========================================
   * EVASIÓN
   * =========================================
   */

  if (
    hasBattleState(
      defenderStates,
      'evasion'
    )
  ) {
    const evasionConfig =
      BATTLE_STATES.evasion

    const dodged =
      Math.random() <
      evasionConfig.dodgeChance

    if (dodged) {
      return {
        hit: false,
        damage: 0,
        reason: 'evasion',
        consumeEvasion: true,
        message:
          '💨 ¡El ataque fue esquivado!',
      }
    }
  }

  /*
   * =========================================
   * FURIA
   * =========================================
   */

  let finalDamage = damage

  if (
    hasBattleState(
      attackerStates,
      'rage'
    )
  ) {
    finalDamage =
      Math.floor(
        finalDamage *
          BATTLE_STATES.rage
            .damageMultiplier
      )
  }

  if (
    hasBattleState(
      defenderStates,
      'rage'
    )
  ) {
    /*
     * Furia también hace que el personaje
     * reciba más daño.
     */

    finalDamage =
      Math.floor(
        finalDamage *
          BATTLE_STATES.rage
            .receivedDamageMultiplier
      )
  }

  return {
    hit: true,
    damage: Math.max(
      0,
      finalDamage
    ),
    reason: null,
    message: null,
  }
}

/*
 * =========================================
 * CONSUMIR EVASIÓN
 * =========================================
 */

export function consumeEvasion(
  states = []
) {
  return removeBattleState(
    states,
    'evasion'
  )
}

/*
 * =========================================
 * REDUCIR DURACIONES
 * =========================================
 *
 * Se ejecuta al terminar el turno.
 */

export function decrementBattleStates(
  states = []
) {
  return states
    .map((state) => ({
      ...state,
      turns:
        state.turns - 1,
    }))
    .filter(
      (state) =>
        state.turns > 0
    )
}

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