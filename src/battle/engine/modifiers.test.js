import test from 'node:test'
import assert from 'node:assert/strict'
import { applyDamageModifiers, createDamageContext } from './modifiers.js'

test('damage multiplier modifier changes the pending damage multiplier', () => {
  const result = applyDamageModifiers(
    createDamageContext({ amount: 20 }),
    [{ type: 'damage_multiplier', value: 0.5 }],
  )

  assert.equal(result.multiplier, 0.5)
  assert.equal(result.amount, 20)
})

test('flat modifier changes pending damage', () => {
  const result = applyDamageModifiers(
    createDamageContext({ amount: 20 }),
    [{ type: 'damage_flat', value: -5 }],
  )

  assert.equal(result.amount, 15)
})

test('damage prevention sets pending damage to zero', () => {
  const result = applyDamageModifiers(
    createDamageContext({ amount: 20 }),
    [{ type: 'prevent_damage' }],
  )

  assert.equal(result.amount, 0)
  assert.equal(result.prevented, true)
})
