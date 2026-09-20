import { useState } from 'react'
import './BattleResultScreen.css'

function formatNumber(value) {
  return new Intl.NumberFormat('es-AR').format(Number(value) || 0)
}

export default function BattleResultScreen({
  result = 'victory',
  character,
  xpEarned = 0,
  currentLevel = 1,
  previousLevel = currentLevel,
  leveledUp = false,
  unlockedCharacter = null,
  stats = {},
  onBack = () => {},
  isOnline = false,
  rematchStatus = 'pending',
  opponentRematchStatus = 'pending',
  onRequestRematch = () => {},
  onDeclineRematch = () => {},
  rematchLoading = false,
}) {
  const [showDetails, setShowDetails] = useState(false)
  const isVictory = result === 'victory'
  const waitingForOpponent = isOnline && rematchStatus === 'accepted' && opponentRematchStatus === 'pending'
  const opponentAccepted = isOnline && opponentRematchStatus === 'accepted'
  const opponentDeclined = isOnline && opponentRematchStatus === 'declined'
  const alreadyDeclined = isOnline && rematchStatus === 'declined'

  return (
    <section className={`battle-result-stage battle-result-${isVictory ? 'victory' : 'defeat'}`}>
      <div className="battle-result-summary">
        <p className="eyebrow">Combate terminado</p>
        <h1>{isVictory ? '🏆 VICTORIA' : '💀 DERROTA'}</h1>
        <p>{isVictory ? 'Has ganado el combate.' : 'Esta vez no fue suficiente. El combate ha terminado.'}</p>
        {character && (
          <div className="battle-result-summary-character">
            {character.image || character.profile?.primaryImage ? (
              <img src={character.image || character.profile?.primaryImage} alt={character.name} />
            ) : null}
            <strong>{character.name}</strong>
          </div>
        )}
        <button className="button battle-result-view" type="button" onClick={() => setShowDetails(true)}>
          Ver resultados
        </button>
      </div>

      {showDetails && (
        <div className="battle-result-modal" role="dialog" aria-modal="true" aria-labelledby="battle-result-title">
          <button className="battle-result-modal-backdrop" type="button" aria-label="Cerrar resultados" onClick={() => setShowDetails(false)} />
          <div className="battle-result-modal-content">
            <button className="battle-result-modal-close" type="button" onClick={() => setShowDetails(false)} aria-label="Cerrar resultados">×</button>
            <div className="battle-result-header">
              <p className="eyebrow">Combate terminado</p>
              <h2 id="battle-result-title">{isVictory ? '🏆 VICTORIA' : '💀 DERROTA'}</h2>
              <p>{isVictory ? 'Has ganado el combate.' : 'Esta vez no fue suficiente.'}</p>
            </div>

            {character && (
              <div className="battle-result-character">
                <div className="battle-result-character-image">
                  <img src={character.image || character.profile?.primaryImage || ''} alt={character.name} />
                </div>
                <div>
                  <span className="battle-result-label">PERSONAJE UTILIZADO</span>
                  <h3>{character.name}</h3>
                </div>
              </div>
            )}

            <div className="battle-result-progression">
              <div className="battle-result-xp">
                <span className="battle-result-label">XP OBTENIDA</span>
                <strong>+{formatNumber(xpEarned)} XP</strong>
              </div>
              <div className="battle-result-level">
                <span className="battle-result-label">NIVEL ACTUAL</span>
                <strong>{currentLevel}</strong>
                {leveledUp && previousLevel !== currentLevel && (
                  <span className="battle-result-level-up">⬆️ ¡SUBISTE DEL NIVEL {previousLevel} AL {currentLevel}!</span>
                )}
              </div>
            </div>

            <div className="battle-result-stats">
              <div><strong>{formatNumber(stats.rounds)}</strong><span>RONDAS</span></div>
              <div><strong>{formatNumber(stats.damageDealt)}</strong><span>DAÑO CAUSADO</span></div>
              <div><strong>{formatNumber(stats.damageReceived)}</strong><span>DAÑO RECIBIDO</span></div>
              <div><strong>{formatNumber(stats.criticalHits)}</strong><span>CRÍTICOS</span></div>
              <div><strong>{formatNumber(stats.abilitiesUsed)}</strong><span>HABILIDADES</span></div>
              <div><strong>{formatNumber(stats.healingDone)}</strong><span>CURACIÓN</span></div>
            </div>

            {unlockedCharacter && (
              <div className="battle-result-unlock">
                <span className="battle-result-label">🔓 NUEVO PERSONAJE DESBLOQUEADO</span>
                <div>
                  <img src={unlockedCharacter.image || unlockedCharacter.profile?.primaryImage || ''} alt={unlockedCharacter.name} />
                  <strong>{unlockedCharacter.name}</strong>
                </div>
              </div>
            )}

            {isOnline ? (
              <div className="battle-result-rematch">
                <div className="battle-result-rematch-heading">
                  <span className="battle-result-label">REVANCHA</span>
                  <h3>¿Jugar otra partida con tu compañero?</h3>
                </div>
                {waitingForOpponent && <p className="battle-result-rematch-status">⏳ Esperando que tu compañero decida...</p>}
                {opponentAccepted && rematchStatus === 'pending' && <p className="battle-result-rematch-status">⚔️ Tu compañero quiere jugar otra partida.</p>}
                {opponentDeclined && <p className="battle-result-rematch-status">🚪 Tu compañero decidió no jugar otra partida.</p>}
                {alreadyDeclined && !opponentAccepted && <p className="battle-result-rematch-status">No vas a jugar otra partida en esta sala.</p>}
                <div className="battle-result-rematch-actions">
                  {rematchStatus === 'pending' && (
                    <>
                      <button className="button battle-result-rematch-accept" type="button" onClick={onRequestRematch} disabled={rematchLoading}>{rematchLoading ? '🔄 Guardando...' : '⚔️ Jugar otra partida'}</button>
                      <button className="button secondary" type="button" onClick={onDeclineRematch} disabled={rematchLoading}>No, volver a Combate</button>
                    </>
                  )}
                  {rematchStatus === 'accepted' && opponentRematchStatus === 'accepted' && <p className="battle-result-rematch-status">⚔️ Ambos aceptaron. Preparando la revancha...</p>}
                </div>
              </div>
            ) : (
              <button className="button battle-result-back" type="button" onClick={onBack}>Volver a Combate</button>
            )}

            {isOnline && <button className="button secondary battle-result-leave" type="button" onClick={onBack} disabled={rematchLoading}>Salir de la sala</button>}
          </div>
        </div>
      )}
    </section>
  )
}
