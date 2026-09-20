import { useEffect, useRef } from 'react'
import {
  playAttackSound,
  playDodgeSound,
  playFullHealingSound,
  playVictorySound,
  playLostBattleSound,
} from '../battle/audio/battleSounds'
import '../styles/OnlineBattleEffects.css'

function readHp(fighter) {
  const label = fighter.querySelector('small')?.textContent || ''
  const match = label.match(/(\d+)\s*\/\s*(\d+)/)
  return match ? Number(match[1]) : null
}

function flash(fighter, className, duration = 650) {
  fighter.classList.remove(className)
  void fighter.offsetWidth
  fighter.classList.add(className)
  window.setTimeout(() => fighter.classList.remove(className), duration)
}

function getFighters(root) {
  return Array.from(root.querySelectorAll('.online-fighter'))
}

export default function OnlineBattleEffects({ children }) {
  const rootRef = useRef(null)
  const previousHpRef = useRef(new Map())
  const previousLogRef = useRef('')
  const previousResultRef = useRef('')

  useEffect(() => {
    const root = rootRef.current
    if (!root) return undefined

    const observer = new MutationObserver(() => {
      const fighters = getFighters(root)

      fighters.forEach((fighter) => {
        const hp = readHp(fighter)
        const key = fighter.querySelector('strong')?.textContent || ''
        const previousHp = previousHpRef.current.get(key)

        if (hp !== null && previousHp !== undefined && hp < previousHp) {
          flash(fighter, 'online-fighter-hit')
          playAttackSound({})
        }

        if (hp !== null) previousHpRef.current.set(key, hp)
      })

      const newestLog = root.querySelector('.battle-log-entry')
      const logText = newestLog?.textContent?.trim() || ''

      if (logText && logText !== previousLogRef.current) {
        previousLogRef.current = logText

        if (/esquiv|esquivó|falló/i.test(logText)) {
          getFighters(root).forEach((fighter) => flash(fighter, 'online-fighter-dodge'))
          playDodgeSound()
        } else if (/defiende|defenderse|se prepara para defender/i.test(logText)) {
          const myFighter = root.querySelector('.online-fighter.is-mine')
          if (myFighter) flash(myFighter, 'online-fighter-defend', 900)
        } else if (/recupera toda su vida|vida restaurada/i.test(logText)) {
          const fighters = getFighters(root)
          const target = fighters.find((fighter) => logText.includes(fighter.querySelector('strong')?.textContent || '__never__'))
          if (target) flash(target, 'online-fighter-heal', 1000)
          playFullHealingSound()
        }

        if (/TÉCNICA DEFINITIVA/i.test(logText)) {
          const attacker = getFighters(root).find((fighter) => logText.includes(fighter.querySelector('strong')?.textContent || '__never__'))
          const image = attacker?.querySelector('img')?.src || ''
          const name = attacker?.querySelector('strong')?.textContent || 'Jugador'
          const overlay = document.createElement('div')
          overlay.className = 'online-ultimate-overlay'
          const backdrop = document.createElement('div')
          backdrop.className = 'online-ultimate-backdrop'
          const content = document.createElement('div')
          content.className = 'online-ultimate-content'
          const eyebrow = document.createElement('p')
          eyebrow.textContent = '⚡ TÉCNICA DEFINITIVA ⚡'
          const title = document.createElement('h2')
          title.textContent = logText.replace(/^[^:]*:\s*/, '')
          const character = document.createElement('span')
          character.textContent = name
          content.append(eyebrow, title, character)
          if (image) {
            const img = document.createElement('img')
            img.src = image
            img.alt = name
            content.appendChild(img)
          } else {
            const placeholder = document.createElement('div')
            placeholder.className = 'online-ultimate-placeholder'
            placeholder.textContent = '⚡'
            content.appendChild(placeholder)
          }
          overlay.append(backdrop, content)
          root.appendChild(overlay)
          window.setTimeout(() => overlay.remove(), 1500)
        }

        if (/CRÍTICO/i.test(logText)) {
          getFighters(root).forEach((fighter) => {
            if (logText.includes(fighter.querySelector('strong')?.textContent || '__never__')) {
              flash(fighter, 'online-fighter-critical', 700)
            }
          })
        }
      }

      const result = root.querySelector('.online-result')?.textContent?.trim() || ''
      if (result && result !== previousResultRef.current) {
        previousResultRef.current = result
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
