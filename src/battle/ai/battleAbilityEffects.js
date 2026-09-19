/*
 * =========================================
 * BATTLE ABILITY EFFECTS
 * =========================================
 *
 * Determina si una habilidad aplica alguno
 * de los estados de combate.
 *
 * Los estados deben estar definidos
 * explícitamente en la habilidad.
 */

const STATUS_RULES = [
  {
    type: 'bleeding',
    target: 'enemy',
    data: {
      turns: 3,
      stacks: 1,
    },
  },

  {
    type: 'stunned',
    target: 'enemy',
    data: {
      turns: 1,
    },
  },

  {
    type: 'unconscious',
    target: 'enemy',
    data: {
      turns: 1,
    },
  },

  {
    type: 'evasion',
    target: 'self',
    data: {
      turns: 1,
    },
  },

  {
    type: 'rage',
    target: 'self',
    data: {
      turns: 2,
    },
  },
]

/*
 * Busca un efecto explícito.
 *
 * Ejemplo en Supabase:
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

  return getExplicitEffect(ability)
}