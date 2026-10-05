import test from 'node:test'
import assert from 'node:assert/strict'

import { executeBasicAction } from './actions.js'

test('defend matches the legacy battle-state contract', () => {
  const state = {
    round: 1,
    players: {
      attacker: { hp: 100, max_hp: 100, energy: 20, defending: false, states: [] },
      defender: { hp: 100, max_hp: 100, energy: 30, defending: false, states: [] },
    },
  }

  const result = executeBasicAction(state, 'attacker', 'defender', 'defend')

  assert.equal(result.state.players.attacker.energy, 30)
  assert.equal(result.state.players.attacker.defending, true)
  assert.equal(result.state.players.defender.hp, 100)
  assert.equal(result.processedEvents.length, 1)
  assert.equal(result.processedEvents[0].type, 'ability_used')
})

test('defend can trigger generic event reactions without losing custom resources', () => {
  const state = {
    players: {
      attacker: { hp: 100, max_hp: 100, energy: 0, defending: false },
      defender: { hp: 100, max_hp: 100, energy: 0, defending: false },
    },
  }

  const result = executeBasicAction(state, 'attacker', 'defender', 'defend', {
    triggers: [{
      event: 'ability_used',
      effects: [{ type: 'resource_add', target: 'source', resource: 'exposure', value: 1 }],
    }],
  })

  assert.equal(result.state.players.attacker.resources.exposure, 1)
  assert.equal(result.state.players.attacker.energy, 10)
  assert.equal(result.state.players.attacker.defending, true)
})
