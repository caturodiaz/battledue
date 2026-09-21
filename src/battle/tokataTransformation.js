import { playTokataTransformationSound } from './audio/battleSounds'

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
  playTokataTransformationSound()
  return {
    originalCharacterId: TOKATA_ID,
    transformedCharacterId: opponent.id,
    transformedCharacterName: opponent.name,
    transformedCharacter: opponent,
    copiedAbilityIds: getCopyableAbilities(opponent).map(ability => ability.id).filter(Boolean),
    copiedAbilities: getCopyableAbilities(opponent),
  }
}

export function getTokataAbilities({ character, transformation, metamorphosisAvailable = false }) {
  if (!isTokata(character)) {
    return Array.isArray(character?.profile?.abilities) ? character.profile.abilities : []
  }

  const nativeAbilities = Array.isArray(character?.profile?.abilities) ? character.profile.abilities : []
  if (!transformation) return nativeAbilities

  const copiedAbilities = Array.isArray(transformation.copiedAbilities) ? transformation.copiedAbilities : []
  return metamorphosisAvailable ? copiedAbilities : copiedAbilities
}

export function getTokataDisplayCharacter({ character, transformation }) {
  if (!isTokata(character) || !transformation) return character

  const transformedProfile = transformation.transformedCharacter?.profile || {}
  return {
    ...character,
    name: `${character.name} (${transformation.transformedCharacterName || 'Desconocido'})`,
    image: transformation.transformedCharacter?.image || character.image,
    profile: {
      ...character.profile,
      primaryImage: transformedProfile.primaryImage || transformation.transformedCharacter?.image || character.profile?.primaryImage,
      title: transformedProfile.title || character.profile?.title,
      tagline: transformedProfile.tagline || character.profile?.tagline,
      abilities: transformation.copiedAbilities || [],
    },
  }
}

export function canUseMetamorphosis({ character, opponent }) {
  return isTokata(character) && Boolean(opponent) && character.id !== opponent.id
}

export { TOKATA_ID, TOKATA_NAME, METAMORPHOSIS_NAME }
