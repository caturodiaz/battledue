import test from 'node:test'
import assert from 'node:assert/strict'

import { resolveCombatAttack } from './attackResolution.js'

const state = (overrides = {}) => ({
  players: {
    attacker: { hp: 100, energy: 25, stats: { strength: 5, range: 2, control: 0 }, states: [] },
    defender: { hp: 100, stats: { defense: 0, speed: 0 }, states: [] },
  },
  ...overrides,
})

test('resolves ability damage and energy from the same engine action', () => {
  const result = resolveCombatAttack(state(), 'attacker', 'defender', {
    multiplier: 1.5,
    energyCost: 25,
    randomFactor: 1,
    guaranteedHit: true,
    random: () => 0.99,
  })

  assert.equal(result.type, 'hit')
  assert.equal(result.damage, 26)
  assert.equal(result.energy, 13)
})

test('consumes defense after reducing the damage', () => {
  const result = resolveCombatAttack(state({
    players: {
      attacker: { hp: 100, energy: 0, stats: { strength: 5 }, states: [] },
      defender: { hp: 100, stats: {}, defending: true, states: [] },
    },
  }), 'attacker', 'defender', { randomFactor: 1, guaranteedHit: true, random: () => 0.99 })

  assert.equal(result.unblockedDamage, 16)
  assert.equal(result.damage, 8)
  assert.equal(result.defending, true)
  assert.equal(result.state.players.defender.defending, false)
})

test('does not apply damage when evasion succeeds and grants miss energy', () => {
  const result = resolveCombatAttack(state({
    players: {
      attacker: { hp: 100, energy: 25, stats: { strength: 5 }, states: [] },
      defender: { hp: 100, stats: {}, states: [{ type: 'evasion', turns: 1, stacks: 1 }] },
    },
  }), 'attacker', 'defender', { randomFactor: 1, energyCost: 25, random: () => 0 })

  assert.equal(result.type, 'miss')
  assert.equal(result.reason, 'evasion')
  assert.equal(result.energy, 8)
  assert.deepEqual(result.state.players.defender.states, [])
})
