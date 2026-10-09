import test from 'node:test'
import assert from 'node:assert/strict'

import { createAbilityAction } from './abilityDefinition.js'

test('creates an engine action from a declarative ability', () => {
  const action = createAbilityAction({
    id: 'violet-fang',
    name: 'Colmillo Violeta',
    costs: { energy: 40 },
    effects: [
      { type: 'damage_resolve', multiplier: 2.2 },
      { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 2 },
    ],
  })

  assert.equal(action.abilityId, 'violet-fang')
  assert.deepEqual(action.costs, { energy: 40 })
  assert.equal(action.steps.length, 2)
  assert.deepEqual(action.steps[0].effects, [{ type: 'damage_resolve', multiplier: 2.2 }])
  assert.deepEqual(action.steps[1].effects, [{ type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 2 }])
  assert.equal(action.steps[1].events[0].type, 'ability_used')
})

test('normalizes a declarative ability with steps and triggers', () => {
  const action = createAbilityAction({
    id: 'reactive',
    name: 'Reactive',
    costs: { energy: 10 },
    steps: [{ events: [{ type: 'custom' }], effects: [{ type: 'resource_add', resource: 'energy', target: 'source', value: 2 }] }],
    triggers: [{ event: 'ability_used', effects: [{ type: 'resource_add', resource: 'marked', target: 'source', value: 1 }] }],
  })

  assert.equal(action.steps.length, 1)
  assert.equal(action.steps[0].events[0].type, 'custom')
  assert.equal(action.steps[0].events[1].type, 'ability_used')
  assert.equal(action.triggers.length, 1)
})

test('rejects an invalid ability definition', () => {
  assert.throws(
    () => createAbilityAction({ id: 'broken', name: 'Broken', effects: [{ type: 'not-real' }] }),
    /Invalid ability/,
  )
})

test('rejects an ability without an identity', () => {
  assert.throws(
    () => createAbilityAction({ effects: [{ type: 'damage_resolve', multiplier: 1 }] }),
    /Invalid ability/,
  )
})
