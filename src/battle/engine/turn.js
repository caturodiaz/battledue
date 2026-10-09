export function endBattleTurn(state, unitId = null, preserveStateTypes = []) {
  const preserved = new Set(preserveStateTypes)
  const players = Object.fromEntries(
    Object.entries(state?.players || {}).map(([id, player]) => {
      if (unitId && id !== unitId) return [id, player]

      const states = Array.isArray(player?.states)
        ? player.states
            .map((battleState) => {
              if (preserved.has(battleState?.type)) return battleState
              return {
                ...battleState,
                turns: Number(battleState.turns) - 1,
              }
            })
            .filter((battleState) => preserved.has(battleState?.type) || battleState.turns > 0)
        : []

      return [id, { ...player, states }]
    }),
  )

  return {
    ...state,
    players,
  }
}
