import './BattleResultScreen.css'

function formatNumber(value) {
  return new Intl.NumberFormat('es-AR').format(value || 0)
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
}) {
  const isVictory = result === 'victory'

  return (
    <section className={`battle-result battle-result-${isVictory ? 'victory' : 'defeat'}`}>
      <div className="battle-result-header">
        <p className="eyebrow">
          {isVictory ? 'Combate terminado' : 'Combate terminado'}
        </p>
        <h1>
          {isVictory ? '🏆 VICTORIA' : '💀 DERROTA'}
        </h1>
        <p>
          {isVictory
            ? 'Has ganado el combate.'
            : 'Esta vez no fue suficiente. El combate ha terminado.'}
        </p>
      </div>

      {character && (
        <div className="battle-result-character">
          <div className="battle-result-character-image">
            <img src={character.image} alt={character.name} />
          </div>
          <div>
            <span className="battle-result-label">PERSONAJE UTILIZADO</span>
            <h2>{character.name}</h2>
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
            <span className="battle-result-level-up">
              ⬆️ ¡SUBISTE DEL NIVEL {previousLevel} AL {currentLevel}!
            </span>
          )}
        </div>
      </div>

      <div className="battle-result-stats">
        <div>
          <strong>{formatNumber(stats.rounds)}</strong>
          <span>RONDAS</span>
        </div>
        <div>
          <strong>{formatNumber(stats.damageDealt)}</strong>
          <span>DAÑO CAUSADO</span>
        </div>
        <div>
          <strong>{formatNumber(stats.damageReceived)}</strong>
          <span>DAÑO RECIBIDO</span>
        </div>
        <div>
          <strong>{formatNumber(stats.criticalHits)}</strong>
          <span>CRÍTICOS</span>
        </div>
        <div>
          <strong>{formatNumber(stats.abilitiesUsed)}</strong>
          <span>HABILIDADES</span>
        </div>
        <div>
          <strong>{formatNumber(stats.healingDone)}</strong>
          <span>CURACIÓN</span>
        </div>
      </div>

      {unlockedCharacter && (
        <div className="battle-result-unlock">
          <span className="battle-result-label">🔓 NUEVO PERSONAJE DESBLOQUEADO</span>
          <div>
            <img src={unlockedCharacter.image} alt={unlockedCharacter.name} />
            <strong>{unlockedCharacter.name}</strong>
          </div>
        </div>
      )}

      <button className="button battle-result-back" type="button" onClick={onBack}>
        Volver a Combate
      </button>
    </section>
  )
}
