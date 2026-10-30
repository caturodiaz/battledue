import test from 'node:test'
import assert from 'node:assert/strict'
import { applyStatModifiers, collectActiveStatModifiers } from './statModifiers.js'

test('applies additive and multiplicative stat modifiers', () => {
  const result = applyStatModifiers(
    { strength: 5, speed: 3 },
    [
      { stat: 'strength', operation: 'add', value: 2 },
      { stat: 'speed', operation: 'multiply', value: 1.5 },
    ],
  )

  assert.equal(result.strength, 7)
  assert.equal(result.speed, 4.5)
})

test('collects stat modifiers from active states', () => {
  const result = collectActiveStatModifiers([
    { id: 'toshoyo', statModifiers: [{ stat: 'strength', operation: 'add', value: 2 }] },
    { id: 'bleeding' },
  ])

  assert.deepEqual(result, [
    { stat: 'strength', operation: 'add', value: 2, sourceState: 'toshoyo' },
  ])
})
