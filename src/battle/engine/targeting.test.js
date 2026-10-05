import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveTargets } from './targeting.js'

const state = {
  players: {
    a: { team: 'red', position: 0 },
    b: { team: 'blue', position: 2 },
    c: { team: 'blue', position: 5 },
    d: { team: 'red', position: 3 },
  },
}

test('resolves single enemy and self targeting', () => {
  assert.deepEqual(resolveTargets(state, 'a', { mode: 'single_enemy' }), ['b'])
  assert.deepEqual(resolveTargets(state, 'a', { mode: 'self' }), ['a'])
})

test('resolves team targeting', () => {
  assert.deepEqual(resolveTargets(state, 'a', { mode: 'all_enemies' }), ['b', 'c'])
  assert.deepEqual(resolveTargets(state, 'a', { mode: 'all_allies' }), ['a', 'd'])
})

test('resolves area targeting around an explicit target', () => {
  assert.deepEqual(resolveTargets(state, 'a', { mode: 'area', targetId: 'b', radius: 3 }), ['b'])
})

test('resolves explicit target lists', () => {
  assert.deepEqual(resolveTargets(state, 'a', { mode: 'explicit', targetIds: ['b', 'c'] }), ['b', 'c'])
})
