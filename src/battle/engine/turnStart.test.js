import test from 'node:test'
import assert from 'node:assert/strict'

import { startBattleTurn } from './turnStart.js'

test('startBattleTurn applies bleeding damage to the active player', () => {
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
  assert.equal(result.messages[0].type, 'bleeding')
  assert.equal(result.messages[0].text, '🩸 Sangrado causa 10 de daño.')
})

test('startBattleTurn preserves state when the player does not exist', () => {
  const state = { players: { attacker: { hp: 100, states: [] } } }
  const result = startBattleTurn(state, 'missing')

  assert.equal(result.state, state)
  assert.equal(result.hpChange, 0)
  assert.deepEqual(result.messages, [])
})
