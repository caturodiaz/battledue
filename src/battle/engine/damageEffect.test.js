import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveDamageEffect } from './damageEffect.js'

test('resolved damage applies damage and queues lifecycle events', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 20, stats: { strength: 4, range: 3, control: 5 } },
      defender: { hp: 100, max_hp: 100, stats: { defense: 0 }, defending: false },
    },
    combat_events: [],
    event_history: [],
  }

  const result = resolveDamageEffect(state, 'attacker', 'defender', { multiplier: 1 }, { randomFactor: 1 })

  assert.equal(result.amount, 18)
  assert.equal(result.energyGain, 13)
  assert.equal(result.state.players.defender.hp, 82)
  assert.equal(result.state.players.attacker.energy, 33)
  assert.deepEqual(
    result.state.combat_events.map((event) => event.type),
    ['before_damage', 'after_damage'],
  )
})

test('defeating a target queues target_defeated', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 20, stats: { strength: 4, range: 3, control: 5 } },
      defender: { hp: 1, max_hp: 100, stats: { defense: 0 }, defending: false },
    },
    combat_events: [],
    event_history: [],
  }

  const result = resolveDamageEffect(state, 'attacker', 'defender', { multiplier: 1 }, { randomFactor: 1 })

  assert.equal(result.state.players.defender.hp, 0)
  assert.equal(result.state.combat_events.at(-1).type, 'target_defeated')
})

test('uses a pre-resolved amount without recalculating damage', () => {
  const state = {
    players: {
      attacker: { hp: 100, energy: 20, stats: { strength: 99, range: 99, control: 99 } },
      defender: { hp: 100, max_hp: 100, stats: { defense: 0 }, defending: false },
    },
    combat_events: [],
    event_history: [],
  }

  const result = resolveDamageEffect(
    state,
    'attacker',
    'defender',
    { multiplier: 1 },
    { resolvedAmount: 17, randomFactor: 999, critical: true },
  )

  assert.equal(result.amount, 17)
  assert.equal(result.state.players.defender.hp, 83)
  assert.equal(result.energyGain, 18)
})
