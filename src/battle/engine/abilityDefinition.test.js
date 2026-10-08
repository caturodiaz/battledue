import test from 'node:test'
import assert from 'node:assert/strict'

import { createAbilityAction } from './abilityDefinition.js'

test('preserves the current legacy ability defaults inside the engine', () => {
  const action = createAbilityAction({ name: 'Golpe lunar', battleEffect: 'bleeding' }, { index: 2 })

  assert.deepEqual(action, {
    id: undefined,
    name: 'Golpe lunar',
    kind: 'ability',
    energyCost: 25,
    multiplier: 1.75,
    guaranteedHit: false,
    criticalBonus: 5,
    battleEffect: { type: 'bleeding', target: 'enemy', data: { turns: 3, stacks: 1 } },
    dealsDamage: true,
  })
})

test('uses declarative cost, damage, and state definitions', () => {
  const action = createAbilityAction({
    id: 'violet-fang',
    name: 'Colmillo Violeta',
    costs: { energy: 40 },
    effects: [
      { type: 'damage_resolve', multiplier: 2.2 },
      { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 2 },
    ],
  })

  assert.equal(action.energyCost, 40)
  assert.equal(action.multiplier, 2.2)
  assert.equal(action.dealsDamage, true)
  assert.deepEqual(action.battleEffect, {
    type: 'bleeding',
    target: 'enemy',
    data: { turns: 3, stacks: 2 },
  })
})

test('uses the ultimate defaults without React-owned combat values', () => {
  const action = createAbilityAction({ name: 'Pulso final' }, { kind: 'ultimate' })

  assert.equal(action.energyCost, 100)
  assert.equal(action.multiplier, 3)
  assert.equal(action.guaranteedHit, true)
  assert.equal(action.criticalBonus, 15)
})

test('marks a full-heal legacy ability as non-damaging', () => {
  const action = createAbilityAction({ battleEffect: 'full_heal_self' }, { kind: 'ultimate' })

  assert.equal(action.dealsDamage, false)
  assert.equal(action.multiplier, 0)
})
