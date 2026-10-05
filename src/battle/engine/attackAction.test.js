import test from 'node:test'
import assert from 'node:assert/strict'
import { executeBasicAttack } from './attackAction.js'

test('basic attack runs through the action engine', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 20, stats: { strength: 4, range: 3, control: 5 }, defending: false },
      defender: { hp: 100, max_hp: 100, stats: { defense: 0 }, defending: false },
    },
    combat_events: [],
    event_history: [],
  }

  const result = executeBasicAttack(state, 'attacker', 'defender', { randomFactor: 1 })

  assert.equal(result.state.players.defender.hp, 82)
  assert.equal(result.state.players.attacker.energy, 33)
  assert.deepEqual(result.processedEvents.map((event) => event.type), [
    'before_action',
    'before_damage',
    'after_damage',
    'ability_used',
  ])
  assert.equal(result.effectResults.length, 1)
  assert.equal(result.effectResults[0].amount, 18)
})

test('basic attack emits target_defeated when it reduces hp to zero', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 20, stats: { strength: 4, range: 3, control: 5 }, defending: false },
      defender: { hp: 10, max_hp: 100, stats: { defense: 0 }, defending: false },
    },
    combat_events: [],
    event_history: [],
  }

  const result = executeBasicAttack(state, 'attacker', 'defender', { randomFactor: 1 })

  assert.equal(result.state.players.defender.hp, 0)
  assert.ok(result.processedEvents.some((event) => event.type === 'target_defeated'))
})
