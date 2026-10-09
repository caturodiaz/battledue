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

  let basicScore =
    30 + style.attack

  let abilityScore =
    20 + style.ability

  let defendScore =
    10 + style.defend

  let ultimateScore =
    0 + style.ultimate

  if (state.defenderIsLow) {
    basicScore += 25
  }

  if (state.defenderIsCritical) {
    basicScore += 35
  }

  if (attackerIsWinning) {
    basicScore += 10
  }

  basicScore +=
    attackerStrength * 2

  const canUseAbility =
    abilities.length > 0 &&
    attackerEnergy >= 25

  if (!canUseAbility) {
    abilityScore = 0
  } else {
    abilityScore += 20

    if (attackerEnergy >= 50) {
      abilityScore += 10
    }

    if (state.defenderIsLow) {
      abilityScore += 20
    }

    if (state.defenderIsCritical) {
      abilityScore += 30
    }

    if (attackerIsLosing) {
      abilityScore += 15
    }
  }

  if (attackerHpPercent <= 0.5) {
    defendScore += 25
  }

  if (attackerHpPercent <= 0.35) {
    defendScore += 30
  }

  if (state.attackerIsCritical) {
    defendScore += 40
  }

  if (attackerIsLosing) {
    defendScore += 20
  }

  defendScore +=
    attackerDefense * 2

  if (state.defenderIsCritical) {
    defendScore -= 35
  }

  if (!state.ultimateReady) {
    ultimateScore = 0
  } else {
    ultimateScore += 55

    if (
      state.defenderIsCritical ||
      defenderHpPercent <= 0.25
    ) {
      ultimateScore += 45
    }

    if (attackerIsLosing) {
      ultimateScore += 20
    }

    if (attackerIsWinning) {
      ultimateScore -= 10
    }

    ultimateScore +=
      attackerStrength * 2

    ultimateScore +=
      attackerSpeed
  }

  if (
    attackerHpPercent <= 0.2
  ) {
    defendScore += 25
    basicScore -= 10
  }

  if (
    defenderDefense >= 7 &&
    canUseAbility
  ) {
    abilityScore += 12
    basicScore -= 5
  }

  if (
    attackerSpeed >
    defenderSpeed + 2
  ) {
    basicScore += 8
    abilityScore +=
      canUseAbility ? 5 : 0
  }

  basicScore =
    clamp(basicScore, 1, 150)

  abilityScore =
    clamp(abilityScore, 0, 150)

  defendScore =
    clamp(defendScore, 0, 150)

  ultimateScore =
    clamp(ultimateScore, 0, 180)

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