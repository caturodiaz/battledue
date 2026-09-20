import { useEffect, useRef } from 'react'
import {
  playAttackSound,
  playDodgeSound,
  playFullHealingSound,
  playVictorySound,
  playLostBattleSound,
} from '../battle/audio/battleSounds'
import '../styles/OnlineBattleEffects.css'

function flash(element, className, duration = 650) {
  if (!element) return
  element.classList.remove(className)
  void element.offsetWidth
  element.classList.add(className)
  window.setTimeout(() => element.classList.remove(className), duration)
}

function getFighters(root) {
  return Array.from(root.querySelectorAll('.battle-character[data-user-id]'))
}

function getFighterName(fighter) {
  return fighter?.querySelector('h2')?.textContent?.trim() || ''
}

function findFighterByUserId(root, userId) {
  if (!userId) return null
  return root.querySelector(`.battle-character[data-user-id="${CSS.escape(userId)}"]`)
}

function getOpponentFighter(root, actorUserId) {
  return getFighters(root).find(fighter => fighter.dataset.userId !== actorUserId) || null
}

function isDodgeMessage(message) {
  return /esquiv(?:ó|o)|evit(?:ó|o)|ataque fue esquivado/i.test(message)
}

function showNotification(root, { icon, title, text, type }) {
  const arena = root.querySelector('.battle-arena')
  if (!arena) return

  arena.querySelector('.online-battle-notification')?.remove()

  const notification = document.createElement('div')
  notification.className = `battle-notification battle-notification-${type} online-battle-notification`

  const iconElement = document.createElement('div')
  iconElement.className = 'battle-notification-icon'
  iconElement.textContent = icon

  const content = document.createElement('div')
  content.className = 'battle-notification-content'

  const titleElement = document.createElement('strong')
  titleElement.textContent = title

  const textElement = document.createElement('span')
  textElement.textContent = text

  content.append(titleElement, textElement)
  notification.append(iconElement, content)
  arena.appendChild(notification)
  window.setTimeout(() => notification.remove(), 2250)
}

function showUltimate(root, actor) {
  if (!actor) return

  const image = actor.dataset.ultimateImage || actor.querySelector('img')?.src || ''
  const name = getFighterName(actor) || 'Jugador'
  const ultimateName = actor.dataset.ultimateName || 'Técnica definitiva'

  root.querySelector('.online-battle-ultimate')?.remove()

  const overlay = document.createElement('div')
  overlay.className = 'battle-ultimate-overlay online-battle-ultimate'
  overlay.setAttribute('aria-live', 'assertive')

  const backdrop = document.createElement('div')
  backdrop.className = 'battle-ultimate-backdrop'

  const content = document.createElement('div')
  content.className = 'battle-ultimate-content'

  const eyebrow = document.createElement('p')
  eyebrow.className = 'battle-ultimate-eyebrow'
  eyebrow.textContent = '⚡ TÉCNICA DEFINITIVA ⚡'

  const title = document.createElement('h2')
  title.textContent = ultimateName

  const character = document.createElement('p')
  character.className = 'battle-ultimate-character'
  character.textContent = name

  content.append(eyebrow, title, character)

  if (image) {
    const imageWrap = document.createElement('div')
    imageWrap.className = 'battle-ultimate-image'
    const img = document.createElement('img')
    img.src = image
    img.alt = ultimateName
    imageWrap.appendChild(img)
    content.appendChild(imageWrap)
  } else {
    const placeholder = document.createElement('div')
    placeholder.className = 'battle-ultimate-no-image'
    placeholder.textContent = '⚡'
    content.appendChild(placeholder)
  }

  overlay.append(backdrop, content)
  root.appendChild(overlay)
  window.setTimeout(() => overlay.remove(), 1500)

  showNotification(root, {
    icon: '⚡',
    title: '¡TÉCNICA DEFINITIVA!',
    text: `${name} usa ${ultimateName}`,
    type: 'ultimate',
  })
}

function processNewLog(root, newestLog) {
  const logText = newestLog?.textContent?.trim() || ''
  const actionType = newestLog?.dataset.logType || 'attack'
  const actorUserId = newestLog?.dataset.actorUserId || ''
  const actor = findFighterByUserId(root, actorUserId)
  const target = getOpponentFighter(root, actorUserId)

  if (!actor) return

  if (actionType === 'defend') {
    showNotification(root, {
      icon: '🛡️',
      title: '¡SE DEFENDIÓ!',
      text: `${getFighterName(actor)} reducirá el próximo daño en un 50%`,
      type: 'defend',
    })
    return
  }

  if (/recupera .*HP|recuperó .*HP|recupera toda su vida|vida restaurada|CURACIÓN COMPLETA/i.test(logText)) {
    flash(actor, 'is-healing', 1200)
    playFullHealingSound()
    showNotification(root, { icon: '💚', title: '¡CURACIÓN!', text: logText, type: 'heal' })
    return
  }

  if (isDodgeMessage(logText)) {
    flash(actor, 'is-dodging', 550)
    playDodgeSound()
    showNotification(root, { icon: '💨', title: '¡ESQUIVÓ EL ATAQUE!', text: logText, type: 'miss' })
    return
  }

  if (actionType === 'ultimate') {
    showUltimate(root, actor)
  }

  if (target && ['attack', 'ability', 'ultimate'].includes(actionType)) {
    flash(target, 'is-hit', 550)
    playAttackSound({})
  }

  if (/CRÍTICO/i.test(logText)) {
    flash(actor, 'is-critical', 700)
    showNotification(root, { icon: '💥', title: '¡CRÍTICO!', text: logText, type: 'critical' })
  } else if (actionType === 'ability') {
    showNotification(root, { icon: '✨', title: '¡HABILIDAD!', text: logText, type: 'ability' })
  } else if (actionType === 'attack') {
    showNotification(root, { icon: '⚔️', title: '¡ATAQUE!', text: logText, type: 'attack' })
  }
}

export default function OnlineBattleEffects({ children }) {
  const rootRef = useRef(null)
  const previousLogIdRef = useRef('')
  const previousResultRef = useRef('')

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const observer = new MutationObserver(() => {
      const newestLog = root.querySelector('.battle-log-entry[data-log-id]')
      const logId = newestLog?.dataset.logId || ''

      if (!logId) {
        previousLogIdRef.current = ''
      } else if (logId !== previousLogIdRef.current) {
        previousLogIdRef.current = logId
        processNewLog(root, newestLog)
      }

      const result = root.querySelector('.online-result')?.textContent?.trim() || ''
      if (!result) {
        previousResultRef.current = ''
      } else if (result !== previousResultRef.current) {
        previousResultRef.current = result
        const fighters = getFighters(root)
        const winnerText = root.querySelector('.online-result h2')?.textContent?.trim() || ''
        const winnerName = winnerText.replace(/^🏆\s*/, '').trim()
        const winner = fighters.find(fighter => getFighterName(fighter) === winnerName)

        if (winner) {
          winner.classList.add('is-victorious')
          fighters.filter(fighter => fighter !== winner).forEach(fighter => fighter.classList.add('is-defeated'))
        }

        if (/VICTORIA/i.test(result)) playVictorySound()
        if (/DERROTA/i.test(result)) playLostBattleSound()
      }
    })

    observer.observe(root, {
      subtree: true,
      childList: true,
      characterData: true,
      attributes: true,
      attributeFilter: ['style', 'class'],
    })

    return () => observer.disconnect()
  }, [])

  return <div ref={rootRef} className="online-battle-effects-root">{children}</div>
}
