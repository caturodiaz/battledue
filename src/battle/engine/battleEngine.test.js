import test from 'node:test'
import assert from 'node:assert/strict'

import { createBattleState, executeBattleAction } from './battleEngine.js'

test('processes a trigger after an action event', () => {
  const state = createBattleState({
    weyker: { hp: 100, resources: {} },
    enemy: { hp: 100, resources: {} },
  })

  const result = executeBattleAction(state, {
    sourceId: 'weyker',
    targetId: 'enemy',
    steps: [{ events: [{ type: 'ability_used', payload: { ability: 'flash' } }] }],
    triggers: [{
      event: 'ability_used',
      effects: [{ type: 'resource_add', target: 'source', resource: 'exposure', value: 1 }],
    }],
  })

  assert.equal(result.state.players.weyker.resources.exposure, 1)
  assert.equal(result.processedEvents.length, 1)
  assert.equal(result.state.event_history[0].type, 'ability_used')
})

test('processes steps in order so before-damage triggers can react before damage', () => {
  const state = createBattleState({
    attacker: { hp: 100, resources: {} },
    defender: { hp: 100, resources: {} },
  })

  const result = executeBattleAction(state, {
    sourceId: 'attacker',
    targetId: 'defender',
    steps: [
      { events: [{ type: 'before_receive_damage', payload: { amount: 40 } }] },
      { effects: [{ type: 'damage', target: 'target', value: 40 }] },
      { events: [{ type: 'after_receive_damage', payload: { amount: 40 } }] },
    ],
    triggers: [{
      event: 'before_receive_damage',
      effects: [{ type: 'resource_add', target: 'target', resource: 'exposure', value: 2 }],
    }],
  })

  assert.equal(result.state.players.defender.hp, 60)
  assert.equal(result.state.players.defender.resources.exposure, 2)
  assert.deepEqual(
    result.processedEvents.map((event) => event.type),
    ['before_receive_damage', 'after_receive_damage'],
  )
})

test('enforces the configured event processing limit', () => {
  const state = createBattleState({
    a: { hp: 100 },
    b: { hp: 100 },
  })

  assert.throws(
    () => executeBattleAction(state, {
      sourceId: 'a',
      targetId: 'b',
      steps: [{ events: [{ type: 'first' }, { type: 'second' }] }],
    }, { maxEvents: 1 }),
    /Battle event limit exceeded/,
  )
})
