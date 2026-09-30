import React from 'react';

/**
 * Mobile presentation shell for the battle arena.
 * Gameplay state and action handling remain in BattlePage.
 */
export default function MobileBattleArena({
  player,
  opponent,
  currentAttackerId,
  round,
  onAttack,
}) {
  const playerHpPercent = player?.maxHp ? Math.max(0, Math.min(100, (player.hp / player.maxHp) * 100)) : 0;
  const opponentHpPercent = opponent?.maxHp ? Math.max(0, Math.min(100, (opponent.hp / opponent.maxHp) * 100)) : 0;

  return (
    <section className="battle-mobile" aria-label="Combate mobile">
      <header className="battle-mobile-header">
        <span>ROUND {round}</span>
        <strong>
          {currentAttackerId === player?.id ? '⚔️ TU TURNO' : '🤖 TURNO DEL RIVAL'}
        </strong>
      </header>

      <div className="battle-mobile-hud">
        <div className="battle-mobile-fighter-hud battle-mobile-fighter-hud-player">
          <div className="battle-mobile-name-row">
            <strong>{player?.name}</strong>
            <span>{player?.hp ?? 0}/{player?.maxHp ?? 0}</span>
          </div>
          <div className="battle-mobile-hp battle-mobile-hp-player">
            <span style={{ width: `${playerHpPercent}%` }} />
          </div>
          <div className="battle-mobile-energy">
            <span>⚡</span>
            <span>{player?.energy ?? 0}%</span>
          </div>
        </div>

        <div className="battle-mobile-hud-vs">VS</div>

        <div className="battle-mobile-fighter-hud battle-mobile-fighter-hud-opponent">
          <div className="battle-mobile-name-row">
            <strong>{opponent?.name}</strong>
            <span>{opponent?.hp ?? 0}/{opponent?.maxHp ?? 0}</span>
          </div>
          <div className="battle-mobile-hp battle-mobile-hp-opponent">
            <span style={{ width: `${opponentHpPercent}%` }} />
          </div>
          <div className="battle-mobile-energy">
            <span>⚡</span>
            <span>{opponent?.energy ?? 0}%</span>
          </div>
        </div>
      </div>

      <div className="battle-mobile-stage">
        <div className={`battle-mobile-character battle-mobile-character-player${currentAttackerId === player?.id ? ' is-active' : ''}`}>
          {player?.image ? <img src={player.image} alt={player.name} /> : <span>?</span>}
        </div>

        <div className="battle-mobile-stage-vs" aria-hidden="true">⚔️</div>

        <div className={`battle-mobile-character battle-mobile-character-opponent${currentAttackerId === opponent?.id ? ' is-active' : ''}`}>
          {opponent?.image ? <img src={opponent.image} alt={opponent.name} /> : <span>?</span>}
        </div>
      </div>

      <div className="battle-mobile-action-bar">
        <button type="button" onClick={onAttack} disabled={currentAttackerId !== player?.id}>
          ⚔️ ATACAR
        </button>
      </div>
    </section>
  );
}
