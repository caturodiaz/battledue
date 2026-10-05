import test from 'node:test'
import assert from 'node:assert/strict'
import { collectDamageModifiers, collectReceiveDamageModifiers } from './triggerModifiers.js'

test('matching trigger contributes damage modifiers', () => {
  const state = { players: { a: { hp: 100 }, b: { hp: 100 } } }
  const event = { type: 'before_damage', payload: { source: 'a', target: 'b', amount: 20 } }
  const triggers = [
    { event: 'before_damage', condition: {}, modifiers: [{ type: 'damage_multiplier', value: 0.5 }] },
    { event: 'after_damage', condition: {}, modifiers: [{ type: 'damage_multiplier', value: 0.1 }] },
  ]

  assert.deepEqual(collectDamageModifiers(state, event, triggers), [
    { type: 'damage_multiplier', value: 0.5 },
  ])
})

test('receive-damage trigger is evaluated against the receiver', () => {
  const state = {
    players: {
      attacker: { hp: 100 },
      defender: { hp: 100, states: [{ id: 'guard', stacks: 1 }] },
    },
  }
  const event = { type: 'before_damage', payload: { amount: 20 } }
  const triggers = [
    {
      event: 'before_receive_damage',
      condition: { state: 'guard' },
      modifiers: [{ type: 'damage_multiplier', value: 0.6 }],
    },
  ]

  assert.deepEqual(collectReceiveDamageModifiers(state, 'attacker', 'defender', event, triggers), [
    { type: 'damage_multiplier', value: 0.6 },
  ])
})
