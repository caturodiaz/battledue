const METAMORPHOSIS_RE = /metamorfosis/i
const TOKATA_FORM_RE = /^Tokata\s*\(/i

function enhanceTokataButtons(root = document) {
  root.querySelectorAll('.online-battle-page .battle-action').forEach((button) => {
    const text = button.textContent || ''
    if (!METAMORPHOSIS_RE.test(text)) return
    button.classList.add('battle-action-metamorphosis')
    if (button.disabled) button.disabled = false
    button.setAttribute('aria-label', 'Usar Metamorfosis de Tokata. No requiere energía.')
  })
}

function enhanceTokataCards(root = document) {
  root.querySelectorAll('.online-battle-page .battle-character').forEach((card) => {
    const heading = card.querySelector('.battle-character-heading h2')
    const isTransformed = TOKATA_FORM_RE.test((heading?.textContent || '').trim())
    card.classList.toggle('tokata-is-transformed', isTransformed)
    if (!isTransformed) return
    const image = card.querySelector('.battle-character-image')
    if (image && !image.querySelector('.tokata-copy-aura')) {
      const aura = document.createElement('span')
      aura.className = 'tokata-copy-aura'
      aura.setAttribute('aria-hidden', 'true')
      image.appendChild(aura)
    }
    if (!card.querySelector('.tokata-copy-label')) {
      const label = document.createElement('span')
      label.className = 'tokata-copy-label'
      label.textContent = 'FORMA COPIADA'
      card.appendChild(label)
    }
  })
}

function enhance() {
  enhanceTokataButtons()
  enhanceTokataCards()
}

if (typeof document !== 'undefined') {
  const observer = new MutationObserver(enhance)
  observer.observe(document.body, { childList: true, subtree: true, characterData: true, attributes: true, attributeFilter: ['disabled'] })
  window.setTimeout(enhance, 0)
}
