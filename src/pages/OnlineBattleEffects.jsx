import { useEffect, useRef } from 'react'
import {
  playAttackSound,
  playDodgeSound,
  playFullHealingSound,
  playVictorySound,
  playLostBattleSound,
} from '../battle/audio/battleSounds'
import '../styles/OnlineBattleEffects.css'

function flash(fighter, className, duration = 650) {
  if (!fighter) return
  fighter.classList.remove(className)
  void fighter.offsetWidth
  fighter.classList.add(className)
  window.setTimeout(() => fighter.classList.remove(className), duration)
}

function getFighters(root) {
  return Array.from(root.querySelectorAll('.online-fighter'))
}

function getFighterName(fighter) {
  return fighter?.querySelector('strong')?.textContent?.trim() || ''
}

function findFighterByUserId(root, userId) {
  if (!userId) return null
  return root.querySelector(`.online-fighter[data-user-id="${CSS.escape(userId)}"]`)
}

function getOpponentFighter(root, actorUserId) {
  return getFighters(root).find(fighter => fighter.dataset.userId !== actorUserId) || null
}

function isDodgeMessage(message) {
  return /esquiv(?:ó|o)|evit(?:ó|o)|ataque fue esquivado/i.test(message)
}

function isSelfStatusMiss(message) {
  return /inconsciente|aturdido/i.test(message)
}

function showUltimate(root, actor, logText) {
  if (!actor) return

  const image = actor.querySelector('img')?.src || ''
  const name = getFighterName(actor) || 'Jugador'
  const overlay = document.createElement('div')
  overlay.className = 'battle-ultimate-overlay'

  const backdrop = document.createElement('div')
  backdrop.className = 'battle-ultimate-backdrop'

  const content = document.createElement('div')
  content.className = 'battle-ultimate-content'

  const eyebrow = document.createElement('p')
  eyebrow.className = 'battle-ultimate-eyebrow'
  eyebrow.textContent = '⚡ TÉCNICA DEFINITIVA ⚡'

  const title = document.createElement('h2')
  title.textContent = logText.replace(/^[^:]*:\s*/, '')

  const character = document.createElement('span')
  character.className = 'battle-ultimate-character'
  character.textContent = name

  content.append(eyebrow, title, character)

  if (image) {
    const imageWrap = document.createElement('div')
    imageWrap.className = 'battle-ultimate-image'
    const img = document.createElement('img')
    img.src = image
    img.alt = name
    imageWrap.appendChild(img)
    content.appendChild(imageWrap)
  }

  overlay.append(backdrop, content)
  root.appendChild(overlay)
  window.setTimeout(() => overlay.remove(), 1500)
}

export default function OnlineBattleEffects({ children }) {
  const rootRef = useRef(null)
  const previousLogIdRef = useRef('')
  const previousResultRef = useRef('')

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const observer = new MutationObserver(() => {
      const newestLog = root.querySelector('.battle-log-entry')
      const logId = newestLog?.dataset.logId || ''
      const logText = newestLog?.textContent?.trim() || ''

      if (!logId) {
        previousLogIdRef.current = ''
      } else if (logId !== previousLogIdRef.current) {
        previousLogIdRef.current = logId

        const actionType = newestLog.dataset.logType || 'attack'
        const actorUserId = newestLog.dataset.actorUserId || ''
        const actor = findFighterByUserId(root, actorUserId)
        const target = getOpponentFighter(root, actorUserId)

        if (actionType === 'defend') {
          flash(actor, 'online-fighter-defend', 900)
        } else if (/recupera toda su vida|vida restaurada/i.test(logText)) {
          flash(actor, 'online-fighter-heal', 1200)
          playFullHealingSound()
        } else if (isDodgeMessage(logText)) {
          if (!isSelfStatusMiss(logText)) {
            flash(target, 'online-fighter-dodge')
            playDodgeSound()
          }
        } else if (target && (actionType === 'attack' || actionType === 'ability' || actionType === 'ultimate')) {
          flash(target, 'online-fighter-hit')
          playAttackSound({})
        }

        if (/TÉCNICA DEFINITIVA/i.test(logText)) {
          showUltimate(root, actor, logText)
        }

        if (/CRÍTICO/i.test(logText)) {
          flash(target, 'online-fighter-critical', 700)
        }
      }

      const result = root.querySelector('.online-result')?.textContent?.trim() || ''
      if (!result) {
        previousResultRef.current = ''
        getFighters(root).forEach(fighter => {
          fighter.classList.remove('online-fighter-victorious', 'online-fighter-defeated')
        })
      } else if (result !== previousResultRef.current) {
        previousResultRef.current = result
        const fighters = getFighters(root)
        const winnerText = root.querySelector('.online-result strong')?.textContent?.trim() || ''
        const winnerCharacterName = root.querySelector('.online-result span')?.textContent?.match(/^(.*?) consiguió la victoria|^(.*?) ganó el combate/i)?.[1] || ''
        const winner = fighters.find(fighter => winnerCharacterName && getFighterName(fighter) === winnerCharacterName)

        if (winner) {
          winner.classList.add('online-fighter-victorious')
          fighters.filter(fighter => fighter !== winner).forEach(fighter => fighter.classList.add('online-fighter-defeated'))
        } else if (/VICTORIA/i.test(winnerText)) {
          const mine = root.querySelector('.online-fighter.is-mine')
          mine?.classList.add('online-fighter-victorious')
          fighters.filter(fighter => fighter !== mine).forEach(fighter => fighter.classList.add('online-fighter-defeated'))
        } else if (/DERROTA/i.test(winnerText)) {
          const mine = root.querySelector('.online-fighter.is-mine')
          mine?.classList.add('online-fighter-defeated')
          fighters.filter(fighter => fighter !== mine).forEach(fighter => fighter.classList.add('online-fighter-victorious'))
        }

        if (/ganó/i.test(result)) {
          const myName = root.querySelector('.online-fighter.is-mine strong')?.textContent?.trim() || ''
          if (myName && result.includes(myName)) playVictorySound()
          else playLostBattleSound()
        }
      }

      const turn = root.querySelector('.room-status strong')?.textContent || ''
      if (/TU TURNO/i.test(turn)) {
        root.querySelector('.online-arena')?.classList.add('online-your-turn')
      } else {
        root.querySelector('.online-arena')?.classList.remove('online-your-turn')
      }
    })

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style'],
    })

    return () => observer.disconnect()
  }, [])

  return <div ref={rootRef} className="online-battle-effects-root">{children}</div>
}
