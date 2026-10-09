import test from 'node:test'
import assert from 'node:assert/strict'
import { evaluateCondition } from './conditions.js'

const state = {
  players: {
    a: { hp: 20, max_hp: 100, energy: 50, states: [{ id: 'exposure', stacks: 3 }], defending: true },
    b: { hp: 80, max_hp: 100, energy: 10, states: [{ id: 'guard', stacks: 1 }], defending: false },
  },
}

test('checks source state and stacks', () => {
  assert.equal(evaluateCondition(state, 'a', 'b', { state: 'exposure' }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { stateStacksAtLeast: { state: 'exposure', value: 3 } }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { stateStacksAtLeast: { state: 'exposure', value: 4 } }), false)
})

test('checks HP percentage and resources', () => {
  assert.equal(evaluateCondition(state, 'a', 'b', { hpBelowPercent: 0.3 }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { resourceAtLeast: { resource: 'energy', value: 50 } }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { resourceAtLeast: { resource: 'energy', value: 51 } }), false)
})

test('checks target state and defending', () => {
  assert.equal(evaluateCondition(state, 'a', 'b', { targetState: 'guard' }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { isDefending: true }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { targetIsDefending: true }), false)
})

test('checks event context', () => {
  assert.equal(evaluateCondition(state, 'a', 'b', { critical: true }, { critical: true }), true)
  assert.equal(evaluateCondition(state, 'a', 'b', { critical: true }, { critical: false }), false)
  assert.equal(evaluateCondition(state, 'a', 'b', { ultimate: true }, { ultimate: true }), true)
})
