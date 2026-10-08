import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveAttackState } from './attackState.js'

function createState(attackerStates = [], defenderStates = []) {
  return {
    players: {
      attacker: { hp: 100, states: attackerStates },
      defender: { hp: 100, states: defenderStates },
    },
  }
}

test('unconscious attacker cannot act', () => {
  const result = resolveAttackState(
    createState([{ type: 'unconscious', turns: 1, stacks: 1 }]),
    'attacker',
    'defender',
    50,
    { random: () => 0 },
  )

  assert.equal(result.hit, false)
  assert.equal(result.damage, 0)
  assert.equal(result.reason, 'unconscious')
})

test('stunned attacker misses when the stun roll succeeds', () => {
  const result = resolveAttackState(
    createState([{ type: 'stunned', turns: 1, stacks: 1 }]),
    'attacker',
    'defender',
    50,
    { random: () => 0.49 },
  )

  assert.equal(result.hit, false)
  assert.equal(result.damage, 0)
  assert.equal(result.reason, 'stunned')
})

test('stunned attacker can still hit when the stun roll fails', () => {
  const result = resolveAttackState(
    createState([{ type: 'stunned', turns: 1, stacks: 1 }]),
    'attacker',
    'defender',
    50,
    { random: () => 0.5 },
  )

  assert.equal(result.hit, true)
  assert.equal(result.damage, 50)
})

test('successful evasion prevents damage and consumes the evasion state', () => {
  const result = resolveAttackState(
    createState([], [{ type: 'evasion', turns: 1, stacks: 1 }]),
    'attacker',
    'defender',
    50,
    { random: () => 0.34 },
  )

  assert.equal(result.hit, false)
  assert.equal(result.damage, 0)
  assert.equal(result.reason, 'evasion')
  assert.equal(result.consumeEvasion, true)
  assert.deepEqual(result.state.players.defender.states, [])
})

test('rage modifies outgoing and received damage', () => {
  const result = resolveAttackState(
    createState(
      [{ type: 'rage', turns: 2, stacks: 1 }],
      [{ type: 'rage', turns: 2, stacks: 1 }],
    ),
    'attacker',
    'defender',
    100,
    { random: () => 0.99 },
  )

  assert.equal(result.hit, true)
  assert.equal(result.damage, 143)
})

test('normal attacks keep their incoming damage unchanged', () => {
  const result = resolveAttackState(
    createState(),
    'attacker',
    'defender',
    37,
    { random: () => 0.99 },
  )

  assert.equal(result.hit, true)
  assert.equal(result.damage, 37)
})
