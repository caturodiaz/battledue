import victorySound from '../../assets/sounds/Victory.mp3'
import energySound from '../../assets/sounds/energy.mp3'
import hitSound from '../../assets/sounds/golpe.mp3'
import swordSound from '../../assets/sounds/sword.wav'
import swordShieldSound from '../../assets/sounds/sword_with_shield.mp3'
import swooshSound from '../../assets/sounds/swoosh.mp3'
import lostBattleSound from '../../assets/sounds/lost-battle.mp3'
import fullHealingSound from '../../assets/sounds/full-healing.mp3'

const soundSources = {
  victory: victorySound,
  energy: energySound,
  hit: hitSound,
  sword: swordSound,
  swordShield: swordShieldSound,
  swoosh: swooshSound,
  lostBattle: lostBattleSound,
  fullHealing: fullHealingSound,
}

function playSound(source) {
  if (!source) {
    return
  }

  const audio = new Audio(source)

  audio.volume = 0.85

  audio.play().catch(() => {})
}

function getWeapon(character) {
  return (
    character?.weapon
      ?.trim()
      .toLowerCase() || ''
  )
}

export function usesSword(character) {
  const weapon =
    getWeapon(character)

  return (
    weapon.includes('espada') ||
    weapon.includes('katana')
  )
}

export function playVictorySound() {
  playSound(
    soundSources.victory
  )
}

export function playEnergyReadySound() {
  playSound(
    soundSources.energy
  )
}

export function playAttackSound({
  attacker,
  defenderIsDefending = false,
}) {
  if (
    defenderIsDefending &&
    usesSword(attacker)
  ) {
    playSound(
      soundSources.swordShield
    )

    return
  }

  if (usesSword(attacker)) {
    playSound(
      soundSources.sword
    )

    return
  }

  playSound(
    soundSources.hit
  )
}

export function playDodgeSound() {
  playSound(soundSources.swoosh)
}

export function playLostBattleSound() {
  playSound(soundSources.lostBattle)
}

export function playFullHealingSound() {
  playSound(soundSources.fullHealing)
}