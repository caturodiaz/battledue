import victorySound from '../../assets/sounds/Victory.mp3'
import energySound from '../../assets/sounds/energy.mp3'
import hitSound from '../../assets/sounds/golpe.mp3'
import swordSound from '../../assets/sounds/sword.wav'
import swordShieldSound from '../../assets/sounds/sword_with_shield.mp3'

const sounds = {
  victory: new Audio(victorySound),
  energy: new Audio(energySound),
  hit: new Audio(hitSound),
  sword: new Audio(swordSound),
  swordShield: new Audio(swordShieldSound),
}

Object.values(sounds).forEach((audio) => {
  audio.preload = 'auto'
})

function playSound(audio) {
  if (!audio) {
    return
  }

  audio.currentTime = 0
  audio.play().catch(() => {})
}

function getWeapon(character) {
  return character?.weapon
    ?.trim()
    .toLowerCase() || ''
}

export function usesSword(character) {
  const weapon = getWeapon(character)

  return (
    weapon.includes('espada') ||
    weapon.includes('katana')
  )
}

export function playVictorySound() {
  playSound(sounds.victory)
}

export function playEnergyReadySound() {
  playSound(sounds.energy)
}

export function playAttackSound({
  attacker,
  defenderIsDefending = false,
}) {
  if (defenderIsDefending && usesSword(attacker)) {
    playSound(sounds.swordShield)
    return
  }

  if (usesSword(attacker)) {
    playSound(sounds.sword)
    return
  }

  playSound(sounds.hit)
}
