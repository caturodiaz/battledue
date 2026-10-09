import test from 'node:test'
import assert from 'node:assert/strict'
import { normalizeAbility, validateAbility } from './abilitySchema.js'

test('validates a basic declarative ability', () => {
  const ability = {
    id: 'flash-impactante',
    name: 'FLASH IMPACTANTE',
    costs: { energy: 20 },
    effects: [{ type: 'damage_resolve', multiplier: 1.25 }],
  }

  assert.deepEqual(validateAbility(ability), { valid: true, errors: [] })
})

test('validates reactive triggers and advanced effects', () => {
  const ability = {
    id: 'exposicion-maxima',
    name: 'EXPOSICIÓN MÁXIMA',
    triggers: [{
      event: 'before_receive_damage',
      conditions: [{ state: 'negative-mode' }],
      modifiers: [{ type: 'damage_multiplier', value: 0.5 }],
    }],
    effects: [
      { type: 'snapshot', target: 'incoming_action' },
      { type: 'delay', turns: 2 },
      { type: 'restore_snapshot' },
      { type: 'transform', state: 'negative-mode' },
    ],
  }

  assert.equal(validateAbility(ability).valid, true)
})

test('rejects unknown trigger and effect types', () => {
  const result = validateAbility({
    id: 'broken',
    name: 'Broken',
    effects: [{ type: 'teleport_to_moon' }],
    triggers: [{ event: 'when_moon_is_full', effects: [] }],
  })

  assert.equal(result.valid, false)
  assert.equal(result.errors.length, 2)
})

test('normalizes optional ability fields', () => {
  const result = normalizeAbility({ id: 'heal', name: 'Heal', effects: [{ type: 'heal', value: 10 }] })

  assert.deepEqual(result.targeting, { mode: 'single_enemy' })
  assert.deepEqual(result.costs, {})
  assert.deepEqual(result.conditions, [])
  assert.deepEqual(result.triggers, [])
})

test('rejects unsupported state stack effects', () => {
  const result = validateAbility({
    id: 'unsupported-stacks',
    name: 'Unsupported stacks',
    effects: [
      { type: 'state_stack_add' },
      { type: 'state_stack_remove' },
    ],
  })

  assert.equal(result.valid, false)
  assert.deepEqual(result.errors, [
    'invalid effect type at effects: state_stack_add',
    'invalid effect type at effects: state_stack_remove',
  ])
})

test('accepts fixed damage effects supported by both combat engines', () => {
  const result = validateAbility({
    id: 'fixed-damage',
    name: 'Fixed Damage',
    effects: [{ type: 'damage', value: 20 }],
  })

  assert.deepEqual(result, { valid: true, errors: [] })
})
