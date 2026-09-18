/*
 * =========================================
 * BATTLE ABILITY EFFECTS
 * =========================================
 *
 * Determina si una habilidad aplica alguno
 * de los estados de combate.
 *
 * Primero busca una configuración explícita
 * en la habilidad.
 *
 * Si todavía no existe, intenta reconocer
 * el efecto mediante el nombre/descripción.
 */

const STATUS_RULES = [
  {
    type: 'bleeding',
    target: 'enemy',
    patterns: [
      'sangr',
      'hemorrag',
      'bleed',
    ],
    data: {
      turns: 3,
      stacks: 1,
    },
  },

  {
    type: 'stunned',
    target: 'enemy',
    patterns: [
      'aturd',
      'stun',
    ],
    data: {
      turns: 1,
    },
  },

  {
    type: 'unconscious',
    target: 'enemy',
    patterns: [
      'inconscient',
      'desmay',
      'knockout',
      'knock out',
    ],
    data: {
      turns: 1,
    },
  },

  {
    type: 'evasion',
    target: 'self',
    patterns: [
      'evas',
      'esquiv',
      'dodge',
    ],
    data: {
      turns: 1,
    },
  },

  {
    type: 'rage',
    target: 'self',
    patterns: [
      'furia',
      'enfure',
      'rage',
    ],
    data: {
      turns: 2,
    },
  },
]

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/*
 * Busca un efecto explícito.
 *
 * Ejemplo futuro en Supabase:
 *
 * statusEffect: {
 *   type: 'bleeding',
 *   target: 'enemy',
 *   turns: 3
 * }
 */

function getExplicitEffect(ability) {
  const explicit =
    ability?.statusEffect ||
    ability?.battleEffect ||
    ability?.status

  if (!explicit) {
    return null
  }

  if (typeof explicit === 'string') {
    const rule =
      STATUS_RULES.find(
        (item) =>
          item.type === explicit
      )

    if (!rule) {
      return null
    }

    return {
      type: rule.type,
      target: rule.target,
      data: {
        ...rule.data,
      },
    }
  }

  if (
    typeof explicit === 'object'
  ) {
    const rule =
      STATUS_RULES.find(
        (item) =>
          item.type ===
          (
            explicit.type ||
            explicit.status
          )
      )

    if (!rule) {
      return null
    }

    return {
      type: rule.type,
      target:
        explicit.target ||
        rule.target,
      data: {
        ...rule.data,
        ...explicit,
      },
    }
  }

  return null
}

/*
 * Busca palabras relacionadas con
 * los estados en la información actual
 * de la habilidad.
 */

function getEffectFromText(ability) {
  const text =
    [
      ability?.name,
      ability?.description,
      ability?.effect,
      ability?.details,
    ]
      .filter(Boolean)
      .join(' ')

  const normalizedText =
    normalizeText(text)

  const rule =
    STATUS_RULES.find(
      (item) =>
        item.patterns.some(
          (pattern) =>
            normalizedText.includes(
              pattern
            )
        )
    )

  if (!rule) {
    return null
  }

  return {
    type: rule.type,
    target: rule.target,
    data: {
      ...rule.data,
    },
  }
}

/*
 * =========================================
 * FUNCIÓN PRINCIPAL
 * =========================================
 */

export function getAbilityBattleEffect(
  ability
) {
  if (!ability) {
    return null
  }

  return (
    getExplicitEffect(ability) ||
    getEffectFromText(ability)
  )
}