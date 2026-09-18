/*
 * =========================================
 * BATTLE DUE - ABILITY ANALYZER
 * =========================================
 *
 * Convierte una habilidad proveniente de
 * Supabase en una habilidad normalizada
 * que el motor de combate pueda entender.
 *
 * Prioridad:
 *
 * 1. Configuración explícita
 * 2. Regla específica de habilidad
 * 3. Detección automática por texto
 * 4. Ataque ofensivo por defecto
 */

const DEFAULT_COMBAT = {
  type: 'offensive',
  target: 'enemy',
  effect: null,
}

/*
 * =========================================
 * REGLAS ESPECÍFICAS
 * =========================================
 *
 * Estas reglas tienen prioridad sobre el
 * detector automático.
 *
 * Sirven para habilidades cuyo comportamiento
 * queremos controlar con precisión.
 */

const ABILITY_RULES = {
  'Puzzle Step': {
    type: 'buff',
    target: 'self',
    effect: {
      type: 'evasion',
      chance: 1,
      duration: 1,
    },
  },

  'Agarre Sombrío': {
    type: 'control',
    target: 'enemy',
    effect: {
      type: 'stunned',
      chance: 0.6,
      duration: 1,
    },
  },

  'Toshoyo': {
    type: 'buff',
    target: 'self',
    effect: {
      type: 'rage',
      chance: 1,
      duration: 2,
    },
  },

  'Impulso de Llama': {
    type: 'buff',
    target: 'self',
    effect: {
      type: 'evasion',
      chance: 1,
      duration: 1,
    },
  },

  'Colmillo Violeta': {
    type: 'offensive',
    target: 'enemy',
    effect: {
      type: 'bleeding',
      chance: 0.4,
      duration: 3,
    },
  },

  'Kitsune no Ōka': {
    type: 'ultimate',
    target: 'enemy',
    effect: {
      type: 'unconscious',
      chance: 0.3,
      duration: 1,
    },
  },
}

/*
 * =========================================
 * NORMALIZACIÓN
 * =========================================
 */

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
}

/*
 * =========================================
 * DETECTOR AUTOMÁTICO
 * =========================================
 *
 * Es un fallback.
 *
 * Si una habilidad nueva llega desde
 * Supabase y no existe en ABILITY_RULES,
 * intentamos deducir su comportamiento.
 */

const DETECTION_RULES = [
  {
    type: 'buff',
    target: 'self',
    effect: {
      type: 'evasion',
      chance: 1,
      duration: 1,
    },

    keywords: [
      'esquiva',
      'esquivar',
      'evas',
      'desaparece',
      'desplazamiento',
      'movimiento explosivo',
      'reaparece',
    ],
  },

  {
    type: 'control',
    target: 'enemy',
    effect: {
      type: 'stunned',
      chance: 0.5,
      duration: 1,
    },

    keywords: [
      'aturd',
      'inmovil',
      'inmoviliz',
      'paraliz',
      'inmoviliza',
      'deja vulnerable',
    ],
  },

  {
    type: 'buff',
    target: 'self',
    effect: {
      type: 'rage',
      chance: 1,
      duration: 2,
    },

    keywords: [
      'aumenta su fuerza',
      'aumenta su velocidad',
      'aumenta la fuerza',
      'aumenta la velocidad',
      'incrementa su fuerza',
      'incrementa su velocidad',
      'aumenta fuerza',
      'aumenta velocidad',
    ],
  },

  {
    type: 'offensive',
    target: 'enemy',
    effect: {
      type: 'bleeding',
      chance: 0.25,
      duration: 3,
    },

    keywords: [
      'corte',
      'corta',
      'cuchilla',
      'katana',
      'desgarra',
      'herida',
      'herir',
      'sangre',
    ],
  },

  {
    type: 'control',
    target: 'enemy',
    effect: {
      type: 'unconscious',
      chance: 0.2,
      duration: 1,
    },

    keywords: [
      'deja inconsciente',
      'deja inconsciente',
      'desmaya',
      'knockout',
      'knock out',
    ],
  },
]

/*
 * =========================================
 * CONFIGURACIÓN EXPLÍCITA
 * =========================================
 */

function getExplicitCombat(ability) {
  if (!ability?.combat) {
    return null
  }

  return {
    ...DEFAULT_COMBAT,
    ...ability.combat,

    effect:
      ability.combat.effect || null,
  }
}

/*
 * =========================================
 * REGLA ESPECÍFICA
 * =========================================
 */

function getSpecificRule(ability) {
  if (!ability?.name) {
    return null
  }

  return (
    ABILITY_RULES[ability.name] ||
    null
  )
}

/*
 * =========================================
 * DETECCIÓN
 * =========================================
 */

function detectCombat(ability) {
  const text = normalizeText(
    [
      ability?.name,
      ability?.description,
      ability?.effect,
      ability?.details,
    ]
      .filter(Boolean)
      .join(' ')
  )

  for (const rule of DETECTION_RULES) {
    const detected =
      rule.keywords.some(
        (keyword) =>
          text.includes(
            normalizeText(keyword)
          )
      )

    if (detected) {
      return {
        type: rule.type,
        target: rule.target,
        effect: {
          ...rule.effect,
        },
      }
    }
  }

  return null
}

/*
 * =========================================
 * ANALIZADOR PRINCIPAL
 * =========================================
 */

export function analyzeAbility(
  ability
) {
  if (!ability) {
    return null
  }

  const explicitCombat =
    getExplicitCombat(ability)

  if (explicitCombat) {
    return {
      ...ability,
      combat: explicitCombat,
      source: 'explicit',
    }
  }

  const specificRule =
    getSpecificRule(ability)

  if (specificRule) {
    return {
      ...ability,
      combat: {
        ...DEFAULT_COMBAT,
        ...specificRule,
      },
      source: 'rule',
    }
  }

  const detectedCombat =
    detectCombat(ability)

  if (detectedCombat) {
    return {
      ...ability,
      combat: detectedCombat,
      source: 'detected',
    }
  }

  return {
    ...ability,
    combat: {
      ...DEFAULT_COMBAT,
    },
    source: 'default',
  }
}

/*
 * =========================================
 * ANALIZAR VARIAS HABILIDADES
 * =========================================
 */

export function analyzeAbilities(
  abilities = []
) {
  return abilities
    .filter(Boolean)
    .map(analyzeAbility)
}