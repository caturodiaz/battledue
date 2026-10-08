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


test('startBattleTurn applies bleeding damage to the active player', async () => {
  const { startBattleTurn } = await import('./turnStart.js')
  const state = {
    players: {
      attacker: {
        hp: 100,
        max_hp: 100,
        states: [{ type: 'bleeding', turns: 3, stacks: 2 }],
      },
    },
  }

  const result = startBattleTurn(state, 'attacker')

  assert.equal(result.hpChange, -10)
  assert.equal(result.state.players.attacker.hp, 90)
  assert.deepEqual(result.messages, [{
    type: 'bleeding',
    text: '🩸 Sangrado causa 10 de daño.',
  }])
})

test('startBattleTurn preserves state when the player does not exist', async () => {
  const { startBattleTurn } = await import('./turnStart.js')
  const state = { players: {} }

  const result = startBattleTurn(state, 'missing')

  assert.equal(result.state, state)
  assert.equal(result.hpChange, 0)
  assert.deepEqual(result.messages, [])
})

test('processBattleStateStartOfTurn returns unchanged states without bleeding', async () => {
  const { processBattleStateStartOfTurn } = await import('./stateStart.js')
  const states = [{ type: 'rage', turns: 2, stacks: 1 }]

  const result = processBattleStateStartOfTurn(states, 100)

  assert.deepEqual(result.states, states)
  assert.equal(result.hpChange, 0)
  assert.deepEqual(result.messages, [])
})

test('processBattleStateStartOfTurn applies bleeding damage by stacks', async () => {
  const { processBattleStateStartOfTurn } = await import('./stateStart.js')
  const result = processBattleStateStartOfTurn([{ type: 'bleeding', turns: 3, stacks: 2 }], 100)

  assert.deepEqual(result.states, [{ type: 'bleeding', turns: 3, stacks: 2 }])
  assert.equal(result.hpChange, -10)
  assert.deepEqual(result.messages, [{
    type: 'bleeding',
    text: '🩸 Sangrado causa 10 de daño.',
  }])
})

test('processBattleStateStartOfTurn enforces minimum bleeding damage', async () => {
  const { processBattleStateStartOfTurn } = await import('./stateStart.js')
  const result = processBattleStateStartOfTurn([{ type: 'bleeding', turns: 3, stacks: 1 }], 1)

  assert.equal(result.hpChange, -1)
})
