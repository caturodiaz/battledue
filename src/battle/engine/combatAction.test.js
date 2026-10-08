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

test('executes ability effects after a miss without applying hit-dependent effects', () => {
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
  assert.equal(result.state.players.attacker.resources.energy, 35)
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
