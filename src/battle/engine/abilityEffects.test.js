import test from 'node:test'
import assert from 'node:assert/strict'

import { getAbilityBattleEffect } from './abilityEffects.js'

test('adapts a legacy status effect using the engine defaults', () => {
  assert.deepEqual(getAbilityBattleEffect({ statusEffect: 'bleeding' }), {
    type: 'bleeding',
    target: 'enemy',
    data: { turns: 3, stacks: 1 },
  })
})

test('preserves explicit status duration, stacks, and target', () => {
  assert.deepEqual(getAbilityBattleEffect({
    battleEffect: { type: 'stunned', target: 'self', turns: 2, stacks: 3 },
  }), {
    type: 'stunned',
    target: 'self',
    data: { turns: 2, stacks: 3, type: 'stunned', target: 'self' },
  })
})

test('does not infer combat behavior from an unknown legacy effect', () => {
  assert.equal(getAbilityBattleEffect({ status: 'mystery' }), null)
})
