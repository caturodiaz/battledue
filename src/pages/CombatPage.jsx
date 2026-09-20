import { useState } from 'react'
import BattlePage from './BattlePage'
import OnlineBattlePage from './OnlineBattlePage'
import OnlineBattleEffects from './OnlineBattleEffects'
import './CombatPage.css'

export default function CombatPage() {
  const [mode, setMode] = useState(null)

  if (mode === 'computer') {
    return <BattlePage onBackToModes={() => setMode(null)} />
  }

  if (mode === 'online') {
    return (
      <OnlineBattleEffects>
        <OnlineBattlePage onBackToModes={() => setMode(null)} />
      </OnlineBattleEffects>
    )
  }

  return (
    <main className="combat-mode-page">
      <header className="combat-mode-page__header">
        <p className="eyebrow">COMBATE</p>
        <h1>Elegí tu rival</h1>
        <p>Podés enfrentarte a la computadora o desafiar a otro jugador.</p>
      </header>

      <section className="combat-mode-grid">
        <button className="combat-mode-card combat-mode-card--computer" type="button" onClick={() => setMode('computer')}>
          <span className="combat-mode-card__icon">🤖</span>
          <span className="combat-mode-card__title">CONTRA LA PC</span>
          <span className="combat-mode-card__description">Una batalla individual contra la inteligencia artificial.</span>
          <span className="combat-mode-card__action">JUGAR →</span>
        </button>

        <button className="combat-mode-card combat-mode-card--online" type="button" onClick={() => setMode('online')}>
          <span className="combat-mode-card__icon">👥</span>
          <span className="combat-mode-card__title">MULTIPLAYER</span>
          <span className="combat-mode-card__description">Creá una sala o unite a la batalla de otro jugador.</span>
          <span className="combat-mode-card__action">JUGAR →</span>
        </button>
      </section>
    </main>
  )
}
