import { useEffect, useState } from 'react'

function readUltimateFromEntry(entry) {
  const actorUserId = entry?.dataset?.actorUserId
  if (!actorUserId) return null

  const card = document.querySelector(
    `.online-battle-page .battle-character[data-user-id="${CSS.escape(actorUserId)}"]`
  )

  if (!card) return null

  const name = card.querySelector('.battle-character-heading h2')?.textContent?.trim() || 'Personaje'
  const image = card.dataset.ultimateImage || ''
  const ultimateName = card.dataset.ultimateName || 'Técnica definitiva'

  return {
    id: entry.dataset.logId || `${actorUserId}-${Date.now()}`,
    name,
    image,
    ultimateName,
  }
}

export default function OnlineBattleUltimateBridge() {
  const [animation, setAnimation] = useState(null)

  useEffect(() => {
    const processed = new Set()
    let hideTimer = null
    let retryTimer = null

    const processUltimateEntries = () => {
      const entries = document.querySelectorAll(
        '.online-battle-page .battle-log-entry[data-log-type="ultimate"]'
      )

      entries.forEach((entry) => {
        const logId = entry.dataset.logId
        if (!logId || processed.has(logId)) return

        const data = readUltimateFromEntry(entry)
        if (!data) return

        processed.add(logId)
        setAnimation(data)

        window.clearTimeout(hideTimer)
        hideTimer = window.setTimeout(() => {
          setAnimation(null)
        }, 1400)
      })
    }

    const observer = new MutationObserver(() => {
      processUltimateEntries()

      window.clearTimeout(retryTimer)
      retryTimer = window.setTimeout(processUltimateEntries, 40)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['data-log-id', 'data-log-type', 'data-actor-user-id'],
    })

    processUltimateEntries()

    return () => {
      observer.disconnect()
      window.clearTimeout(hideTimer)
      window.clearTimeout(retryTimer)
    }
  }, [])

  if (!animation) return null

  return (
    <div className="battle-ultimate-overlay" key={animation.id} aria-live="assertive">
      <div className="battle-ultimate-backdrop" />

      <div className="battle-ultimate-content">
        <p className="battle-ultimate-eyebrow">
          ⚡ TÉCNICA DEFINITIVA ⚡
        </p>

        <h2>{animation.ultimateName}</h2>

        <p className="battle-ultimate-character">
          {animation.name}
        </p>

        {animation.image ? (
          <div className="battle-ultimate-image">
            <img src={animation.image} alt={animation.ultimateName} />
          </div>
        ) : (
          <div className="battle-ultimate-no-image">⚡</div>
        )}
      </div>
    </div>
  )
}
