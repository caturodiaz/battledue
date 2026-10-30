const getPlayer = (state, id) => state?.players?.[id] || {}

const getResource = (player, resource) => {
  if (player.resources && resource in player.resources) return Number(player.resources[resource] || 0)
  return Number(player[resource] || 0)
}

const hasState = (player, id) => Array.isArray(player.states)
  ? player.states.some((state) => (state?.id || state?.name) === id)
  : false

const getStacks = (player, id) => {
  const state = player.states?.find((item) => (item?.id || item?.name) === id)
  return Number(state?.stacks ?? state?.value ?? 0)
}

export function evaluateCondition(state, sourceId, targetId, condition = {}, context = {}) {
  if (!condition || Object.keys(condition).length === 0) return true

  const source = getPlayer(state, sourceId)
  const target = getPlayer(state, targetId)

  if (condition.state && !hasState(source, condition.state)) return false
  if (condition.targetState && !hasState(target, condition.targetState)) return false
  if (condition.notState && hasState(source, condition.notState)) return false

  if (condition.stateStacksAtLeast != null) {
    const stacks = getStacks(source, condition.stateStacksAtLeast.state)
    if (stacks < Number(condition.stateStacksAtLeast.value)) return false
  }

  if (condition.targetStateStacksAtLeast != null) {
    const stacks = getStacks(target, condition.targetStateStacksAtLeast.state)
    if (stacks < Number(condition.targetStateStacksAtLeast.value)) return false
  }

  if (condition.hpBelowPercent != null) {
    const maxHp = Number(source.max_hp || source.maxHp || 0)
    const hp = Number(source.hp || 0)
    if (!maxHp || hp / maxHp >= Number(condition.hpBelowPercent)) return false
  }

  if (condition.targetHpBelowPercent != null) {
    const maxHp = Number(target.max_hp || target.maxHp || 0)
    const hp = Number(target.hp || 0)
    if (!maxHp || hp / maxHp >= Number(condition.targetHpBelowPercent)) return false
  }

  if (condition.resourceAtLeast != null) {
    const { resource, value } = condition.resourceAtLeast
    if (getResource(source, resource) < Number(value)) return false
  }

  if (condition.targetResourceAtLeast != null) {
    const { resource, value } = condition.targetResourceAtLeast
    if (getResource(target, resource) < Number(value)) return false
  }

  if (condition.isDefending === true && !(source.defending || source.flags?.defending)) return false
  if (condition.targetIsDefending === true && !(target.defending || target.flags?.defending)) return false
  if (condition.critical === true && context.critical !== true) return false
  if (condition.ultimate === true && context.ultimate !== true) return false

  if (condition.sourceIsTarget !== undefined && (sourceId === targetId) !== Boolean(condition.sourceIsTarget)) return false

  return true
}
