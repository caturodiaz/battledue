export function evaluateBattleState({
  attackerHp,
  defenderHp,
  attackerMaxHp,
  defenderMaxHp,
  attackerEnergy = 0,
  defenderEnergy = 0,
}) {
  const attackerHpPercentage =
    attackerMaxHp > 0
      ? (attackerHp / attackerMaxHp) * 100
      : 0

  const defenderHpPercentage =
    defenderMaxHp > 0
      ? (defenderHp / defenderMaxHp) * 100
      : 0

  return {
    attackerHpPercentage,
    defenderHpPercentage,

    attackerIsLow:
      attackerHpPercentage <= 25,

    defenderIsLow:
      defenderHpPercentage <= 30,

    attackerIsCritical:
      attackerHpPercentage <= 15,

    defenderIsCritical:
      defenderHpPercentage <= 15,

    ultimateReady:
      attackerEnergy >= 100,

    defenderUltimateReady:
      defenderEnergy >= 100,
  }
}