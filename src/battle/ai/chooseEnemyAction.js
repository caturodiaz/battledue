import {
  AI_STYLES,
  DEFAULT_AI_STYLE,
} from './aiConfig'

import {
  evaluateBattleState,
} from './evaluateBattleState'

function weightedRandom(options) {
  const validOptions = options.filter(
    (option) => option.weight > 0
  )

  if (!validOptions.length) {
    return null
  }

  const totalWeight =
    validOptions.reduce(
      (total, option) =>
        total + option.weight,
      0
    )

  let random =
    Math.random() * totalWeight

  for (const option of validOptions) {
    random -= option.weight

    if (random <= 0) {
      return option.value
    }
  }

  return validOptions[
    validOptions.length - 1
  ].value
}

function randomAbilityIndex(abilities) {
  if (!abilities.length) {
    return 0
  }

  return Math.floor(
    Math.random() * abilities.length
  )
}

function clamp(value, min, max) {
  return Math.max(
    min,
    Math.min(max, value)
  )
}

export function chooseEnemyAction({
  attacker,
  defender,

  attackerHp,
  defenderHp,

  attackerMaxHp,
  defenderMaxHp,

  attackerEnergy = 0,
  defenderEnergy = 0,

  abilities = [],

  aiStyle = DEFAULT_AI_STYLE,
}) {
  const state =
    evaluateBattleState({
      attackerHp,
      defenderHp,
      attackerMaxHp,
      defenderMaxHp,
      attackerEnergy,
      defenderEnergy,
    })

  const style =
    AI_STYLES[aiStyle] ||
    AI_STYLES[DEFAULT_AI_STYLE]

  /*
   * =========================================
   * INFORMACIÓN DEL COMBATE
   * =========================================
   */

  const attackerHpPercent =
    attackerMaxHp > 0
      ? attackerHp / attackerMaxHp
      : 0

  const defenderHpPercent =
    defenderMaxHp > 0
      ? defenderHp / defenderMaxHp
      : 0

  const hpDifference =
    attackerHpPercent -
    defenderHpPercent

  const attackerIsWinning =
    hpDifference > 0.2

  const attackerIsLosing =
    hpDifference < -0.2

  const attackerHasAdvantage =
    attackerHpPercent >
    defenderHpPercent

  const attackerStats =
    attacker?.profile?.stats || {}

  const defenderStats =
    defender?.profile?.stats || {}

  const attackerDefense =
    Number(
      attackerStats.defense
    ) || 0

  const attackerSpeed =
    Number(
      attackerStats.speed
    ) || 0

  const attackerStrength =
    Number(
      attackerStats.strength
    ) || 0

  const defenderDefense =
    Number(
      defenderStats.defense
    ) || 0

  const defenderSpeed =
    Number(
      defenderStats.speed
    ) || 0

  /*
   * =========================================
   * PUNTUACIÓN BASE DE LAS ACCIONES
   * =========================================
   *
   * En lugar de elegir únicamente según
   * pesos fijos, cada acción comienza con
   * una puntuación y luego se modifica
   * según la situación.
   */

  let basicScore =
    30 + style.attack

  let abilityScore =
    20 + style.ability

  let defendScore =
    10 + style.defend

  let ultimateScore =
    0 + style.ultimate

  /*
   * =========================================
   * ATAQUE BÁSICO
   * =========================================
   */

  // Si el rival está muy debilitado,
  // atacar gana mucho valor.
  if (state.defenderIsLow) {
    basicScore += 25
  }

  if (state.defenderIsCritical) {
    basicScore += 35
  }

  // Si estamos ganando ampliamente,
  // seguir presionando es razonable.
  if (attackerIsWinning) {
    basicScore += 10
  }

  // Una IA con mucha fuerza tiene mayor
  // incentivo para atacar.
  basicScore +=
    attackerStrength * 2

  /*
   * =========================================
   * HABILIDADES
   * =========================================
   */

  const canUseAbility =
    abilities.length > 0 &&
    attackerEnergy >= 25

  if (!canUseAbility) {
    abilityScore = 0
  } else {
    // Las habilidades son más interesantes
    // cuando el ataque básico no alcanza.
    abilityScore += 20

    // Mucha energía disponible incentiva
    // gastar parte de ella.
    if (attackerEnergy >= 50) {
      abilityScore += 10
    }

    // Si el rival está debilitado,
    // las habilidades sirven para rematar.
    if (state.defenderIsLow) {
      abilityScore += 20
    }

    if (state.defenderIsCritical) {
      abilityScore += 30
    }

    // Si estamos perdiendo, una habilidad
    // puede ser una buena forma de recuperar
    // la iniciativa.
    if (attackerIsLosing) {
      abilityScore += 15
    }
  }

  /*
   * =========================================
   * DEFENSA
   * =========================================
   */

  // La defensa empieza a importar mucho
  // cuando nuestra vida baja.
  if (attackerHpPercent <= 0.5) {
    defendScore += 25
  }

  if (attackerHpPercent <= 0.35) {
    defendScore += 30
  }

  if (state.attackerIsCritical) {
    defendScore += 40
  }

  // Si estamos perdiendo claramente,
  // sobrevivir puede ser más importante
  // que hacer daño.
  if (attackerIsLosing) {
    defendScore += 20
  }

  // Una defensa alta hace que una estrategia
  // defensiva tenga algo más de sentido.
  defendScore +=
    attackerDefense * 2

  // Si el rival está casi muerto,
  // no queremos desperdiciar el turno
  // defendiendo.
  if (state.defenderIsCritical) {
    defendScore -= 35
  }

  /*
   * =========================================
   * DEFINITIVA
   * =========================================
   */

  if (!state.ultimateReady) {
    ultimateScore = 0
  } else {
    // Tener la definitiva disponible ya
    // representa una opción muy poderosa.
    ultimateScore += 55

    // Si puede acabar el combate,
    // aumenta muchísimo su prioridad.
    if (
      state.defenderIsCritical ||
      defenderHpPercent <= 0.25
    ) {
      ultimateScore += 45
    }

    // Si estamos perdiendo, una definitiva
    // puede servir para cambiar la situación.
    if (attackerIsLosing) {
      ultimateScore += 20
    }

    // Si estamos ganando ampliamente,
    // no necesitamos necesariamente gastar
    // nuestra definitiva inmediatamente.
    if (attackerIsWinning) {
      ultimateScore -= 10
    }

    /*
     * Un pequeño componente basado en las
     * características del personaje.
     */
    ultimateScore +=
      attackerStrength * 2

    ultimateScore +=
      attackerSpeed
  }

  /*
   * =========================================
   * EVITAR COMPORTAMIENTOS ABSURDOS
   * =========================================
   */

  // Si tenemos muy poca vida, atacar sin
  // considerar defensa deja de ser una
  // buena estrategia.
  if (
    attackerHpPercent <= 0.2
  ) {
    defendScore += 25
    basicScore -= 10
  }

  // Si el rival tiene muchísima defensa,
  // una habilidad puede resultar más
  // interesante que un golpe básico.
  if (
    defenderDefense >= 7 &&
    canUseAbility
  ) {
    abilityScore += 12
    basicScore -= 5
  }

  // Una diferencia grande de velocidad
  // hace que atacar sea ligeramente más
  // atractivo.
  if (
    attackerSpeed >
    defenderSpeed + 2
  ) {
    basicScore += 8
    abilityScore +=
      canUseAbility ? 5 : 0
  }

  /*
   * =========================================
   * NORMALIZACIÓN
   * =========================================
   */

  basicScore =
    clamp(basicScore, 1, 150)

  abilityScore =
    clamp(abilityScore, 0, 150)

  defendScore =
    clamp(defendScore, 0, 150)

  ultimateScore =
    clamp(ultimateScore, 0, 180)

  /*
   * =========================================
   * PEQUEÑA VARIACIÓN ALEATORIA
   * =========================================
   *
   * La IA no siempre elegirá exactamente
   * la misma acción en la misma situación.
   */

  const variation = () =>
    0.85 +
    Math.random() * 0.3

  const options = [
    {
      value: 'basic',
      weight:
        basicScore * variation(),
    },
    {
      value: 'ability',
      weight:
        abilityScore *
        variation(),
    },
    {
      value: 'defend',
      weight:
        defendScore *
        variation(),
    },
    {
      value: 'ultimate',
      weight:
        ultimateScore *
        variation(),
    },
  ]

  const selectedAction =
    weightedRandom(options)

  /*
   * =========================================
   * RESULTADO
   * =========================================
   */

  if (
    selectedAction === 'ability'
  ) {
    return {
      type: 'ability',
      abilityIndex:
        randomAbilityIndex(
          abilities
        ),
    }
  }

  if (
    selectedAction === 'ultimate'
  ) {
    return {
      type: 'ultimate',
    }
  }

  if (
    selectedAction === 'defend'
  ) {
    return {
      type: 'defend',
    }
  }

  return {
    type: 'basic',
  }
}