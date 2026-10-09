const getPlayers = (state) => Object.entries(state?.players || {})

export function resolveTargets(state, sourceId, targeting = {}) {
  const mode = targeting.mode || 'single_enemy'
  const players = getPlayers(state)
  const source = state?.players?.[sourceId]

  if (!source) return []

  if (mode === 'self') return [sourceId]

  const enemies = players
    .filter(([id]) => id !== sourceId && state.players[id]?.team !== source.team)
    .map(([id]) => id)

  const allies = players
    .filter(([id]) => state.players[id]?.team === source.team)
    .map(([id]) => id)

  if (mode === 'all_enemies') return enemies
  if (mode === 'all_allies') return allies
  if (mode === 'single_ally') return allies.filter((id) => id !== sourceId).slice(0, 1)
  if (mode === 'single_enemy') return enemies.slice(0, 1)

  if (mode === 'area') {
    const centerId = targeting.center === 'self' ? sourceId : targeting.targetId
    const center = state.players[centerId]
    if (!center) return []

    const radius = Number(targeting.radius ?? 0)
    return enemies.filter((id) => {
      const target = state.players[id]
      if (typeof target.position !== 'number' || typeof center.position !== 'number') return false
      return Math.abs(target.position - center.position) <= radius
    })
  }

  if (mode === 'explicit') return Array.isArray(targeting.targetIds) ? targeting.targetIds : []

  return []
}

export function resolveEffectTargets(state, sourceId, effect = {}, fallbackTargetId) {
  return resolveTargets(state, sourceId, effect.targeting || (fallbackTargetId ? { mode: 'explicit', targetIds: [fallbackTargetId] } : {}))
}
