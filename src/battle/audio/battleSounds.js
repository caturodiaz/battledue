import victorySound from '../../assets/sounds/Victory.mp3'
import energySound from '../../assets/sounds/energy.mp3'
import hitSound from '../../assets/sounds/golpe.mp3'
import swordSound from '../../assets/sounds/sword.wav'
import swordShieldSound from '../../assets/sounds/sword_with_shield.mp3'
import swooshSound from '../../assets/sounds/swoosh.mp3'
import lostBattleSound from '../../assets/sounds/lost-battle.mp3'
import fullHealingSound from '../../assets/sounds/full-healing.mp3'
import { supabase } from '../../lib/supabaseClient'

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

async function awardBattleXp(won) {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      console.error('Error obteniendo usuario para XP:', userError)
      return
    }

    if (!user) {
      console.warn('No hay usuario autenticado. No se otorgará XP.')
      return
    }

    const { data, error } = await supabase.rpc(
      'award_battle_xp',
      {
        p_user_id: user.id,
        p_won: won,
      },
    )

    if (error) {
      console.error('Error otorgando XP de batalla:', error)
      return
    }

    const progression = Array.isArray(data)
      ? data[0]
      : data

    console.log(
      `⭐ XP de batalla: +${progression?.experience_gained ?? (won ? 100 : 50)} XP`,
      progression,
    )
  } catch (error) {
    console.error('Error inesperado otorgando XP de batalla:', error)
  }
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

  void awardBattleXp(true)
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

  void awardBattleXp(false)
}

export function playFullHealingSound() {
  playSound(soundSources.fullHealing)
}