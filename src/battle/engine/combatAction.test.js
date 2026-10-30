import test from 'node:test'
import assert from 'node:assert/strict'

import { executeCombatAction } from './combatAction.js'

function createState() {
  return {
    players: {
      attacker: {
        hp: 100,
        max_hp: 100,
        energy: 50,
        stats: { strength: 5, range: 0, control: 0 },
        defending: false,
        states: [],
      },
      defender: {
        hp: 100,
        max_hp: 100,
        energy: 20,
        stats: { defense: 0, speed: 0 },
        defending: false,
        states: [],
      },
    },
  }
}

test('executes a basic attack as one complete combat action', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'basic',
    attackOptions: {
      guaranteedHit: true,
      randomFactor: 1,
      random: () => 0.99,
    },
  })

  assert.equal(result.attack.type, 'hit')
  assert.equal(result.state.players.defender.hp, 84)
  assert.equal(result.state.players.attacker.energy, 63)
})

test('grants energy after a missed basic attack', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'basic',
    attackOptions: { random: () => 0.99 },
  })

  assert.equal(result.attack.type, 'miss')
  assert.equal(result.state.players.defender.hp, 100)
  assert.equal(result.state.players.attacker.energy, 58)
})

test('executes a declarative ability without exposing combat resolution to the caller', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'ability',
    ability: {
      id: 'heavy-strike',
      name: 'Heavy Strike',
      costs: { energy: 20 },
      effects: [
        { type: 'damage_resolve', multiplier: 2 },
        { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 1 },
      ],
    },
    attackOptions: {
      guaranteedHit: true,
      randomFactor: 1,
      random: () => 0.99,
    },
  })

  assert.equal(result.attack.type, 'hit')
  assert.equal(result.state.players.defender.hp, 68)
  assert.equal(result.state.players.defender.states[0].type, 'bleeding')
  assert.equal(result.state.players.attacker.energy, 43)
})

test('executes a declarative status ability through the unified combat action', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'ability',
    ability: {
      id: 'bleeding-strike',
      name: 'Bleeding Strike',
      costs: { energy: 25 },
      effects: [
        { type: 'damage_resolve', multiplier: 1.45 },
        { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 1 },
      ],
    },
    attackOptions: {
      guaranteedHit: true,
      randomFactor: 1,
      random: () => 0.99,
    },
  })

  assert.equal(result.attack.type, 'hit')
  assert.equal(result.state.players.defender.hp, 77)
  assert.equal(result.state.players.attacker.energy, 38)
  assert.deepEqual(result.state.players.defender.states, [
    { type: 'bleeding', turns: 3, stacks: 1 },
  ])
})

test('executes ability effects after a miss, grants miss energy, and skips hit-dependent effects', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'ability',
    ability: {
      id: 'miss-test',
      name: 'Miss Test',
      costs: { energy: 20 },
      effects: [
        { type: 'damage_resolve', multiplier: 2 },
        { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 1 },
        { type: 'resource_add', resource: 'energy', target: 'source', value: 5 },
        { type: 'state_add', state: 'rage', target: 'self', duration: 2, stacks: 1, requiresHit: false },
      ],
    },
    attackOptions: {
      random: () => 0.99,
    },
  })

  assert.equal(result.attack.type, 'miss')
  assert.equal(result.state.players.defender.hp, 100)
  assert.deepEqual(result.state.players.defender.states, [])
  assert.equal(result.state.players.attacker.resources.energy, 43)
  assert.deepEqual(result.state.players.attacker.states, [
    { type: 'rage', turns: 2, stacks: 1 },
  ])
})

test('executes defend through the same combat action entry point', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'defend',
  })

  assert.equal(result.state.players.attacker.defending, true)
  assert.equal(result.state.players.attacker.energy, 60)
})


test('executes a declarative ultimate with damage and bleeding', () => {
  const state = createState()
  state.players.attacker.energy = 100

  const result = executeCombatAction(state, 'attacker', 'defender', {
    type: 'ultimate',
    ability: {
      id: 'ultimate',
      name: 'Kitsune no Ōka',
      costs: { energy: 100 },
      combat: {
        multiplier: 3,
        guaranteedHit: true,
        criticalBonus: 15,
        ultimate: true,
      },
      effects: [
        { type: 'damage_resolve', multiplier: 3 },
        { type: 'state_add', state: 'bleeding', target: 'enemy', duration: 3, stacks: 1 },
      ],
    },
    attackOptions: {
      guaranteedHit: true,
      randomFactor: 1,
      random: () => 0.99,
      energyCost: 100,
      ultimate: true,
    },
  })

  assert.equal(result.attack.type, 'hit')
  assert.equal(result.attack.damage, 48)
  assert.equal(result.state.players.defender.hp, 52)
  assert.deepEqual(result.state.players.defender.states, [
    { type: 'bleeding', turns: 3, stacks: 1 },
  ])
  assert.equal(result.state.players.attacker.energy, 0)
})

test('executes a declarative full-heal ultimate without damage', () => {
  const state = createState()
  state.players.attacker.hp = 35
  state.players.attacker.energy = 100

  const result = executeCombatAction(state, 'attacker', 'defender', {
    type: 'ultimate',
    ability: {
      id: 'ultimate',
      name: 'Curación Súper',
      costs: { energy: 100 },
      combat: {
        multiplier: 0,
        guaranteedHit: true,
        criticalBonus: 15,
        ultimate: true,
      },
      effects: [
        { type: 'heal', target: 'self', percent: 1 },
      ],
    },
    attackOptions: {
      multiplier: 0,
      guaranteedHit: true,
      randomFactor: 1,
      random: () => 0.99,
      energyCost: 100,
      ultimate: true,
      skipDamage: true,
    },
  })

  assert.equal(result.attack.type, 'hit')
  assert.equal(result.attack.damage, 0)
  assert.equal(result.state.players.attacker.hp, 100)
  assert.equal(result.healing, 65)
  assert.equal(result.state.players.attacker.energy, 0)
})

test('ignores legacy top-level combat metadata in favor of declarative combat fields', () => {
  const result = executeCombatAction(createState(), 'attacker', 'defender', {
    type: 'ability',
    ability: {
      id: 'explicit-combat',
      name: 'Explicit Combat',
      multiplier: 9,
      guaranteedHit: true,
      criticalBonus: 40,
      effects: [{ type: 'damage_resolve', multiplier: 1 }],
    },
    attackOptions: {
      random: () => 0.99,
      randomFactor: 1,
    },
  })

  assert.equal(result.attack.type, 'miss')
  assert.equal(result.state.players.defender.hp, 100)
})
