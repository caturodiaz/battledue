import test from 'node:test'
import assert from 'node:assert/strict'

import { endBattleTurn } from './turn.js'

test('endBattleTurn decrements states for every player', () => {
  const state = {
    players: {
      attacker: {
        states: [
          { type: 'bleeding', turns: 3, stacks: 2 },
          { type: 'evasion', turns: 1, stacks: 1 },
        ],
      },
      defender: {
        states: [{ type: 'rage', turns: 2, stacks: 1 }],
      },
    },
  }

  const result = endBattleTurn(state)

  assert.deepEqual(result.players.attacker.states, [
    { type: 'bleeding', turns: 2, stacks: 2 },
  ])
  assert.deepEqual(result.players.defender.states, [
    { type: 'rage', turns: 1, stacks: 1 },
  ])
})

test('endBattleTurn preserves player data and state immutability', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 20, states: [{ type: 'rage', turns: 2 }] },
      defender: { hp: 80, energy: 30, states: [] },
    },
  }

  const result = endBattleTurn(state)

  assert.equal(result.players.attacker.hp, 100)
  assert.equal(result.players.attacker.energy, 20)
  assert.notEqual(result, state)
  assert.notEqual(result.players.attacker, state.players.attacker)
  assert.deepEqual(state.players.attacker.states, [{ type: 'rage', turns: 2 }])
})
