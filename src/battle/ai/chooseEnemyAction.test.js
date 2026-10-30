import test from 'node:test'
import assert from 'node:assert/strict'

import { chooseEnemyAction } from './chooseEnemyAction.js'

const attacker = { profile: { stats: { strength: 0, defense: 0, speed: 0 } } }
const defender = { profile: { stats: { defense: 0, speed: 0 } } }

function choose(overrides = {}) {
  return chooseEnemyAction({
    attacker,
    defender,
    attackerHp: 100,
    defenderHp: 100,
    attackerMaxHp: 100,
    defenderMaxHp: 100,
    attackerEnergy: 0,
    defenderEnergy: 0,
    abilities: [],
    aiStyle: 'balanced',
    random: () => 0.5,
    ...overrides,
  })
}

test('never selects abilities whose declarative energy cost exceeds its energy', () => {
  const result = choose({
    attackerEnergy: 30,
    abilities: [{
      id: 'expensive',
      name: 'Expensive',
      costs: { energy: 40 },
      effects: [{ type: 'damage_resolve', multiplier: 2 }],
    }],
  })

  assert.notEqual(result.type, 'ability')
})

test('selects from the affordable declarative abilities without changing their original index', () => {
  const result = choose({
    attackerEnergy: 30,
    abilities: [
      { id: 'expensive', name: 'Expensive', costs: { energy: 40 }, effects: [{ type: 'damage_resolve', multiplier: 2 }] },
      { id: 'affordable', name: 'Affordable', costs: { energy: 20 }, effects: [{ type: 'damage_resolve', multiplier: 1 }] },
    ],
  })

  assert.deepEqual(result, { type: 'ability', abilityIndex: 1 })
})
