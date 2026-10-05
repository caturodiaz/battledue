export function toEngineState(legacyState) {
  const players = Object.fromEntries(
    Object.entries(legacyState?.players || {}).map(([id, player]) => [
      id,
      {
        ...player,
        resources: {
          ...(player?.resources || {}),
          energy: Number(player?.energy) || 0,
        },
        flags: {
          ...(player?.flags || {}),
          defending: Boolean(player?.defending),
        },
      },
    ]),
  )

  return { ...legacyState, players }
}

export function fromEngineState(engineState) {
  const players = Object.fromEntries(
    Object.entries(engineState?.players || {}).map(([id, player]) => {
      const resources = player?.resources || {}
      const flags = player?.flags || {}
      const { resources: _resources, flags: _flags, ...legacyPlayer } = player

      return [
        id,
        {
          ...legacyPlayer,
          energy: Math.min(100, Math.max(0, Number(resources.energy) || 0)),
          defending: Boolean(flags.defending),
        },
      ]
    }),
  )

  return { ...engineState, players }
}
