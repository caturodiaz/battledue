import test from 'node:test'
import assert from 'node:assert/strict'
import { drosAbilities, drosUltimate } from './dros.js'
import { validateAbility } from '../engine/abilitySchema.js'

test('all Dros abilities satisfy the declarative schema', () => {
  for (const ability of drosAbilities) {
    const result = validateAbility(ability)
    assert.equal(result.valid, true, `${ability.name}: ${result.errors.join(', ')}`)
  }

  assert.equal(validateAbility(drosUltimate).valid, true)
})

test('Dros bleeding effects preserve the current profile mechanics', () => {
  const fang = drosAbilities.find((ability) => ability.id === 'colmillo-violeta')
  const bleed = fang.effects.find((effect) => effect.state === 'bleeding')

  assert.equal(bleed.duration, 3)
  assert.equal(bleed.stacks, 1)
  assert.equal(bleed.target, 'target')

  const ultimateBleed = drosUltimate.effects.find((effect) => effect.state === 'bleeding')
  assert.equal(ultimateBleed.duration, 3)
  assert.equal(ultimateBleed.stacks, 1)
})
