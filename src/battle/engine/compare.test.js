import test from 'node:test'
import assert from 'node:assert/strict'
import { buildCriticalThresholdScenario, buildDeterministicAttackScenario } from './compare.js'

test('normal attack deterministic scenario', () => {
  const result = buildDeterministicAttackScenario({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    attackerEnergy: 20,
    defenderHp: 100,
    randomFactor: 1,
  })

  assert.deepEqual(result, {
    damage: 18,
    finalHp: 82,
    finalEnergy: 33,
    critical: false,
    targetDefeated: false,
  })
})

test('critical attack deterministic scenario', () => {
  const result = buildDeterministicAttackScenario({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    attackerEnergy: 20,
    defenderHp: 100,
    randomFactor: 1,
    critical: true,
  })

  assert.deepEqual(result, {
    damage: 30,
    finalHp: 70,
    finalEnergy: 38,
    critical: true,
    targetDefeated: false,
  })
})

test('defending scenario applies 50 percent damage reduction', () => {
  const result = buildDeterministicAttackScenario({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    attackerEnergy: 20,
    defenderHp: 100,
    randomFactor: 1,
    defending: true,
  })

  assert.equal(result.damage, 9)
  assert.equal(result.finalHp, 91)
})

test('ability scenario consumes energy before applying gain', () => {
  const result = buildDeterministicAttackScenario({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    attackerEnergy: 50,
    defenderHp: 100,
    multiplier: 1.45,
    randomFactor: 1,
  })

  assert.equal(result.damage, 26)
  assert.equal(result.finalHp, 74)
  assert.equal(result.finalEnergy, 38)
})

test('critical threshold uses control and the same chance formula', () => {
  assert.deepEqual(buildCriticalThresholdScenario(5, 22), { chance: 23, critical: true })
  assert.deepEqual(buildCriticalThresholdScenario(5, 23), { chance: 23, critical: false })
})
