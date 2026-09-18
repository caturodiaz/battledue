export function executeEnemyTurn({
  action,
  delay = 1000,
  onThinkingStart,
  onExecute,
}) {
  onThinkingStart?.()

  const timeout = setTimeout(() => {
    onExecute?.(action)
  }, delay)

  return () => {
    clearTimeout(timeout)
  }
}