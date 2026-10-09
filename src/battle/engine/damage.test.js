import test from 'node:test'
import assert from 'node:assert/strict'
import {
  calculateBaseDamage,
  calculateCriticalChance,
  calculateDamage,
  calculateEnergyGain,
} from './damage.js'

test('basic damage preserves the current base formula', () => {
  const stats = { strength: 4, range: 3, control: 5 }
  assert.equal(calculateBaseDamage(stats), 17.7)
})

test('damage applies multiplier, defense and defending reduction', () => {
  const damage = calculateDamage({
    attackerStats: { strength: 4, range: 3, control: 5 },
    defenderStats: { defense: 5 },
    multiplier: 1,
    randomFactor: 1,
    critical: false,
    defending: true,
  })

  assert.equal(damage, 6)
})

test('critical chance matches the current online formula', () => {
  assert.equal(calculateCriticalChance({ control: 5, ultimate: false }), 23)
  assert.equal(calculateCriticalChance({ control: 5, ultimate: true }), 33)
})

test('energy gain matches current outcomes', () => {
  assert.equal(calculateEnergyGain({ critical: false, hit: true, ultimate: false }), 13)
  assert.equal(calculateEnergyGain({ critical: true, hit: true, ultimate: false }), 18)
  assert.equal(calculateEnergyGain({ critical: false, hit: false, ultimate: false }), 8)
  assert.equal(calculateEnergyGain({ critical: true, hit: true, ultimate: true }), 0)
})
