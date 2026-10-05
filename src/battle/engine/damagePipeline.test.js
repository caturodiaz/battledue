import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDamagePipeline } from './damagePipeline.js'

test('pre-damage modifier reduces resolved damage', () => {
  const result = resolveDamagePipeline({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    randomFactor: 1,
    modifiers: [{ type: 'damage_multiplier', value: 0.6 }],
  })

  assert.equal(result.rawAmount, 18)
  assert.equal(result.amount, 11)
  assert.equal(result.prevented, false)
})

test('prevent damage produces zero damage without treating it as a hit', () => {
  const result = resolveDamagePipeline({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    randomFactor: 1,
    modifiers: [{ type: 'prevent_damage' }],
  })

  assert.equal(result.rawAmount, 18)
  assert.equal(result.amount, 0)
  assert.equal(result.prevented, true)
  assert.equal(result.energyGain, 8)
})

test('multiple modifiers are applied in order', () => {
  const result = resolveDamagePipeline({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 0 },
    randomFactor: 1,
    modifiers: [
      { type: 'damage_multiplier', value: 0.5 },
      { type: 'damage_flat', value: 2 },
    ],
  })

  assert.equal(result.amount, 10)
})
