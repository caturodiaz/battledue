export function applyPositionEffect(state, actorId, effect = {}) {
  const actor = state?.players?.[actorId]
  if (!actor) return state

  const players = { ...(state.players || {}) }
  const nextActor = { ...actor }

  if (effect.type === 'teleport') {
    if (effect.position != null) nextActor.position = effect.position
    if (effect.relativeTo) nextActor.position = `${effect.relativeTo}:${effect.offset || 'behind'}`
  }

  if (effect.type === 'move') {
    const current = Number(nextActor.position || 0)
    nextActor.position = current + Number(effect.distance || 0)
  }

  players[actorId] = nextActor
  return { ...state, players }
}
