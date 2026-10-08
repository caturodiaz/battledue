import test from 'node:test'
import assert from 'node:assert/strict'

import { executeAbilityAction } from './abilityAction.js'

test('ability action applies resolved damage, energy and bleeding', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 25, stats: {}, defending: false, states: [] },
      defender: { hp: 100, max_hp: 100, stats: {}, defending: false, states: [] },
    },
  }

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    damage: 20,
    critical: false,
    energy: 38,
    battleEffect: { type: 'bleeding', target: 'enemy', turns: 3, stacks: 1 },
  })

  assert.equal(result.state.players.defender.hp, 80)
  assert.equal(result.state.players.attacker.energy, 38)
  assert.deepEqual(result.state.players.defender.states, [
    { type: 'bleeding', turns: 3, stacks: 1 },
  ])
})

test('missed ability does not apply its battle state', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 25, states: [] },
      defender: { hp: 100, max_hp: 100, states: [] },
    },
  }

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    damage: 0,
    energy: 33,
    hit: false,
    battleEffect: { type: 'bleeding', target: 'enemy', turns: 3, stacks: 1 },
  })

  assert.equal(result.state.players.defender.hp, 100)
  assert.equal(result.state.players.defender.states.length, 0)
  assert.equal(result.state.players.attacker.energy, 33)
})
