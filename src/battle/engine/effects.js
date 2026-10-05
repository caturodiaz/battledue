const DEFAULT_MAX_HP = 999999999

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

function getUnit(state, unitId) {
  return state?.players?.[unitId] || {}
}

function setUnit(state, unitId, unit) {
  return {
    ...state,
    players: {
      ...(state?.players || {}),
      [unitId]: unit,
    },
  }
}

function resolveTargetId(effect, sourceId, targetId) {
  const target = effect?.target || 'target'
  if (target === 'self' || target === 'source') return sourceId
  if (target === 'target' || target === 'enemy') return targetId
  return effect?.targetId || targetId
}

export function applyEffect(state, sourceId, targetId, effect) {
  if (!effect || typeof effect !== 'object') return state

  const type = effect.type
  const resolvedTargetId = resolveTargetId(effect, sourceId, targetId)
  if (!resolvedTargetId) return state

  const unit = getUnit(state, resolvedTargetId)
  let nextUnit = unit

  switch (type) {
    case 'damage': {
      const amount = Math.max(0, Number(effect.value) || 0)
      const hp = Math.max(0, (Number(unit.hp) || 0) - amount)
      nextUnit = { ...unit, hp }
      break
    }

    case 'heal': {
      const amount = Math.max(0, Number(effect.value) || 0)
      const maxHp = Number(unit.max_hp) || DEFAULT_MAX_HP
      const hp = clamp((Number(unit.hp) || 0) + amount, 0, maxHp)
      nextUnit = { ...unit, hp }
      break
    }

    case 'resource_add': {
      const resource = effect.resource || 'energy'
      const amount = Number(effect.value) || 0
      if (unit.resources && typeof unit.resources === 'object') {
        const resources = { ...unit.resources }
        resources[resource] = (Number(resources[resource]) || 0) + amount
        nextUnit = { ...unit, resources }
      } else {
        nextUnit = { ...unit, [resource]: (Number(unit[resource]) || 0) + amount }
      }
      break
    }

    case 'resource_set': {
      const resource = effect.resource || 'energy'
      const value = Number(effect.value) || 0
      if (unit.resources && typeof unit.resources === 'object') {
        const resources = { ...unit.resources, [resource]: value }
        nextUnit = { ...unit, resources }
      } else {
        nextUnit = { ...unit, [resource]: value }
      }
      break
    }

    case 'status_add': {
      const id = effect.status
      if (!id) return state
      const stacksToAdd = Math.max(1, Number(effect.stacks) || 1)
      const duration = Math.max(0, Number(effect.duration) || 0)
      const statuses = Array.isArray(unit.statuses) ? unit.statuses : []
      const index = statuses.findIndex((status) => status?.id === id)

      if (index === -1) {
        nextUnit = {
          ...unit,
          statuses: [...statuses, { id, stacks: stacksToAdd, duration, data: effect.data || {} }],
        }
      } else {
        const nextStatuses = statuses.map((status, statusIndex) => {
          if (statusIndex !== index) return status
          return {
            ...status,
            stacks: (Number(status.stacks) || 0) + stacksToAdd,
            duration: Math.max(Number(status.duration) || 0, duration),
            data: { ...(status.data || {}), ...(effect.data || {}) },
          }
        })
        nextUnit = { ...unit, statuses: nextStatuses }
      }
      break
    }

    case 'status_remove': {
      if (!effect.status) return state
      const statuses = Array.isArray(unit.statuses) ? unit.statuses : []
      nextUnit = { ...unit, statuses: statuses.filter((status) => status?.id !== effect.status) }
      break
    }

    case 'flag_set': {
      if (!effect.flag) return state
      nextUnit = {
        ...unit,
        flags: { ...(unit.flags || {}), [effect.flag]: effect.value ?? true },
      }
      break
    }

    case 'flag_remove': {
      if (!effect.flag) return state
      const flags = { ...(unit.flags || {}) }
      delete flags[effect.flag]
      nextUnit = { ...unit, flags }
      break
    }

    default:
      return state
  }

  return setUnit(state, resolvedTargetId, nextUnit)
}

export function applyEffects(state, sourceId, targetId, effects = []) {
  if (!Array.isArray(effects)) return state
  return effects.reduce((currentState, effect) => applyEffect(currentState, sourceId, targetId, effect), state)
}
