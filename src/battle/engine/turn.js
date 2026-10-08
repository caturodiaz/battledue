export function endBattleTurn(state) {
  const players = Object.fromEntries(
    Object.entries(state?.players || {}).map(([id, player]) => {
      const states = Array.isArray(player?.states)
        ? player.states
            .map((battleState) => ({
              ...battleState,
              turns: Number(battleState.turns) - 1,
            }))
            .filter((battleState) => battleState.turns > 0)
        : []

      return [id, { ...player, states }]
    }),
  )

  return {
    ...state,
    players,
  }
}
