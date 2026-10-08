import test from 'node:test'
import assert from 'node:assert/strict'

import { executeAbilityAction } from './abilityAction.js'

function createState() {
  return {
    players: {
      attacker: { hp: 100, max_hp: 100, energy: 50, stats: { strength: 10 }, defending: false, states: [] },
      defender: { hp: 100, max_hp: 100, energy: 20, stats: { defense: 0 }, defending: false, states: [] },
    },
  }
}

test('ability action applies resolved damage, energy and bleeding', () => {
  const result = executeAbilityAction(createState(), 'attacker', 'defender', {
    damage: 20,
    critical: false,
    energy: 38,
    battleEffect: { type: 'bleeding', target: 'enemy', turns: 3, stacks: 1 },
  })

  assert.equal(result.state.players.defender.hp, 80)
  assert.equal(result.state.players.attacker.energy, 38)
  assert.deepEqual(result.state.players.defender.states, [
    { type: 'bleeding', turns: 3, stacks: 1 },
  ])
})

test('missed ability does not apply its battle state', () => {
  const result = executeAbilityAction(createState(), 'attacker', 'defender', {
    damage: 0,
    energy: 33,
    hit: false,
    battleEffect: { type: 'bleeding', target: 'enemy', turns: 3, stacks: 1 },
  })

  assert.equal(result.state.players.defender.hp, 100)
  assert.equal(result.state.players.defender.states.length, 0)
  assert.equal(result.state.players.attacker.energy, 33)
})

test('ability action heals the source without exceeding max hp', () => {
  const state = createState()
  state.players.attacker.hp = 60

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    damage: 20,
    energy: 38,
    healAmount: 12,
    battleEffect: { type: 'heal_self', target: 'self', amount: 0.12 },
  })

  assert.equal(result.state.players.attacker.hp, 72)
})

test('full heal restores the source to max hp', () => {
  const state = createState()
  state.players.attacker.hp = 35
  state.players.attacker.energy = 100

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    damage: 20,
    energy: 0,
    fullHeal: true,
    hit: true,
    battleEffect: { type: 'full_heal_self', target: 'self' },
  })

  assert.equal(result.state.players.attacker.hp, 100)
})

test('missed healing ability does not heal the source', () => {
  const state = createState()
  state.players.attacker.hp = 60

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    damage: 0,
    energy: 33,
    healAmount: 12,
    hit: false,
    battleEffect: { type: 'heal_self', target: 'self', amount: 0.12 },
  })

  assert.equal(result.state.players.attacker.hp, 60)
})

test('ability action applies stunned to the enemy', () => {
  const result = executeAbilityAction(createState(), 'attacker', 'defender', {
    damage: 15,
    energy: 38,
    battleEffect: { type: 'stunned', target: 'enemy', turns: 1 },
  })

  assert.deepEqual(result.state.players.defender.states, [
    { type: 'stunned', turns: 1, stacks: 1 },
  ])
})

test('declarative ability resolves ordered damage, state and resource effects', () => {
  const state = createState()
  state.players.attacker.energy = 50

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    ability: {
      id: 'violet-fang',
      name: 'Violet Fang',
      costs: { energy: 40 },
      effects: [
        { type: 'damage_resolve', multiplier: 2.2 },
        { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 2 },
        { type: 'resource_add', resource: 'energy', target: 'source', value: 7 },
      ],
    },
    combatResult: {
      hit: true,
      critical: false,
      damage: 30,
    },
  })

  assert.equal(result.state.players.defender.hp, 70)
  assert.equal(result.state.players.attacker.energy, 30)
  assert.deepEqual(result.state.players.defender.states, [
    { type: 'bleeding', turns: 3, stacks: 2 },
  ])
})

test('declarative percentage and full healing clamp at max hp', () => {
  const state = createState()
  state.players.attacker.hp = 60

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    ability: {
      id: 'renewal',
      name: 'Renewal',
      effects: [
        { type: 'heal', target: 'self', percent: 0.5 },
      ],
    },
  })

  assert.equal(result.state.players.attacker.hp, 100)

  const fullHealResult = executeAbilityAction(
    { ...state, players: { ...state.players, attacker: { ...state.players.attacker, hp: 35 } } },
    'attacker',
    'defender',
    {
      ability: {
        id: 'full-renewal',
        name: 'Full Renewal',
        effects: [
          { type: 'heal', target: 'self', full: true },
        ],
      },
    },
  )

  assert.equal(fullHealResult.state.players.attacker.hp, 100)
})

test('declarative resource modifications can be repeated and ordered', () => {
  const state = createState()
  state.players.attacker.energy = 20

  const result = executeAbilityAction(state, 'attacker', 'defender', {
    ability: {
      id: 'charge',
      name: 'Charge',
      effects: [
        { type: 'resource_add', target: 'source', resource: 'energy', value: 10 },
        { type: 'resource_add', target: 'source', resource: 'energy', value: 5 },
      ],
    },
  })

  assert.equal(result.state.players.attacker.energy, 35)
})

test('declarative self and enemy targets resolve correctly', () => {
  const result = executeAbilityAction(createState(), 'attacker', 'defender', {
    ability: {
      id: 'dual-state',
      name: 'Dual State',
      effects: [
        { type: 'state_add', target: 'self', state: 'rage', duration: 2, stacks: 1, requiresHit: false },
        { type: 'state_add', target: 'enemy', state: 'stunned', duration: 1, stacks: 1 },
      ],
    },
    combatResult: { hit: true },
  })

  assert.deepEqual(result.state.players.attacker.states, [
    { type: 'rage', turns: 2, stacks: 1 },
  ])
  assert.deepEqual(result.state.players.defender.states, [
    { type: 'stunned', turns: 1, stacks: 1 },
  ])
})

test('miss skips impact-dependent declarative effects but keeps explicit non-impact effects', () => {
  const result = executeAbilityAction(createState(), 'attacker', 'defender', {
    ability: {
      id: 'miss-test',
      name: 'Miss Test',
      effects: [
        { type: 'damage_resolve', multiplier: 2 },
        { type: 'state_add', target: 'enemy', state: 'bleeding', duration: 3, stacks: 1 },
        { type: 'resource_add', target: 'source', resource: 'energy', value: 5 },
        { type: 'state_add', target: 'self', state: 'rage', duration: 2, stacks: 1, requiresHit: false },
      ],
    },
    combatResult: { hit: false },
  })

  assert.equal(result.state.players.defender.hp, 100)
  assert.deepEqual(result.state.players.defender.states, [])
  assert.equal(result.state.players.attacker.resources.energy, 55)
  assert.deepEqual(result.state.players.attacker.states, [
    { type: 'rage', turns: 2, stacks: 1 },
  ])
})

test('declarative ability rejects an insufficient resource cost', () => {
  assert.throws(
    () => executeAbilityAction(createState(), 'attacker', 'defender', {
      ability: {
        id: 'expensive',
        name: 'Expensive',
        costs: { energy: 60 },
        effects: [],
      },
    }),
    /Insufficient energy/,
  )
})

test('declarative triggers continue to process emitted combat events', () => {
  const result = executeAbilityAction(createState(), 'attacker', 'defender', {
    ability: {
      id: 'triggered',
      name: 'Triggered',
      effects: [{ type: 'resource_add', target: 'source', resource: 'exposure', value: 1 }],
      triggers: [{
        event: 'ability_used',
        effects: [{ type: 'resource_add', target: 'source', resource: 'marked', value: 1 }],
      }],
    },
  })

  assert.equal(result.state.players.attacker.resources.exposure, 1)
  assert.equal(result.state.players.attacker.resources.marked, 1)
})
