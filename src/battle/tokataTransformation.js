const TOKATA_NAME = 'Tokata'
const TOKATA_ID = '1866b4d1-b0a2-4dfd-96ff-4e3f4f014813'
const METAMORPHOSIS_NAME = 'Metamorfosis'

export function isTokata(character) {
  return Boolean(character && (character.id === TOKATA_ID || character.name === TOKATA_NAME))
}

export function isMetamorphosisAbility(ability) {
  return Boolean(ability && (ability.name === METAMORPHOSIS_NAME || ability.name === 'Imitación Física'))
}

export function getCopyableAbilities(character) {
  if (!character) return []
  const abilities = Array.isArray(character.profile?.abilities) ? character.profile.abilities : []
  return abilities.filter(ability => !ability?.isUltimate && !ability?.ultimate && ability?.type !== 'ultimate' && ability?.kind !== 'ultimate')
}

export function createTokataTransformation(opponent) {
  if (!opponent) return null
  return {
    originalCharacterId: TOKATA_ID,
    transformedCharacterId: opponent.id,
    transformedCharacterName: opponent.name,
    copiedAbilityIds: getCopyableAbilities(opponent).map(ability => ability.id).filter(Boolean),
    copiedAbilities: getCopyableAbilities(opponent),
  }
}

export function getTokataAbilities({ character, opponent, transformation }) {
  if (!isTokata(character)) {
    return Array.isArray(character?.profile?.abilities) ? character.profile.abilities : []
  }

  if (!transformation) {
    return Array.isArray(character?.profile?.abilities) ? character.profile.abilities : []
  }

  return Array.isArray(transformation.copiedAbilities) ? transformation.copiedAbilities : []
}

export function shouldShowMetamorphosis({ character, transformation }) {
  return isTokata(character) && !transformation
}

export function canUseMetamorphosis({ character, opponent }) {
  return isTokata(character) && Boolean(opponent) && character.id !== opponent.id
}

export { TOKATA_ID, TOKATA_NAME, METAMORPHOSIS_NAME }
