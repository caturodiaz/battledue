import { useEffect, useMemo, useState } from 'react'
import { useCharacters } from '../hooks/useCharacters'

const BASE_HP = 100
const MAX_ENERGY = 100

function getCharacterImage(character) {
  return (
    character?.profile?.primaryImage ||
    character?.image ||
    ''
  )
}

function getCharacterStats(character) {
  return {
    strength: Number(
      character?.profile?.stats?.strength ??
      character?.stats?.strength ??
      0
    ),

    speed: Number(
      character?.profile?.stats?.speed ??
      character?.stats?.speed ??
      0
    ),

    resistance: Number(
      character?.profile?.stats?.resistance ??
      character?.stats?.resistance ??
      0
    ),

    technique: Number(
      character?.profile?.stats?.technique ??
      character?.stats?.technique ??
      0
    ),

    power: Number(
      character?.profile?.stats?.power ??
      character?.stats?.power ??
      0
    ),
  }
}

function getMaxHp(character) {
  const stats = getCharacterStats(character)

  return (
    BASE_HP +
    stats.resistance * 8
  )
}

function getTurnOrder(characterA, characterB) {
  const statsA =
    getCharacterStats(characterA)

  const statsB =
    getCharacterStats(characterB)

  if (statsA.speed > statsB.speed) {
    return [characterA, characterB]
  }

  if (statsB.speed > statsA.speed) {
    return [characterB, characterA]
  }

  return Math.random() < 0.5
    ? [characterA, characterB]
    : [characterB, characterA]
}

function getAttackResult(attacker, defender) {
  const attackerStats =
    getCharacterStats(attacker)

  const defenderStats =
    getCharacterStats(defender)

  /*
   * PRECISIÓN
   *
   * La técnica ayuda a acertar.
   * La velocidad del defensor ayuda a esquivar.
   *
   * El mínimo evita que un personaje
   * pueda llegar a tener 0% de precisión.
   */

  const accuracy = Math.max(
    55,
    Math.min(
      95,
      75 +
        attackerStats.technique * 3 -
        defenderStats.speed * 2
    )
  )

  const roll = Math.random() * 100

  if (roll > accuracy) {
    return {
      type: 'miss',
      damage: 0,
      accuracy,
    }
  }

  /*
   * DAÑO BASE
   *
   * La fuerza representa el daño físico.
   * El poder agrega daño adicional.
   */

  const baseDamage =
    7 +
    attackerStats.strength * 2 +
    attackerStats.power

  /*
   * VARIACIÓN
   *
   * El mismo ataque no hace siempre
   * exactamente el mismo daño.
   */

  const variation =
    0.8 +
    Math.random() * 0.4

  let damage =
    baseDamage * variation

  /*
   * CRÍTICO
   *
   * La técnica aumenta ligeramente
   * la posibilidad de crítico.
   */

  const criticalChance = Math.min(
    35,
    8 +
      attackerStats.technique * 2
  )

  const criticalRoll =
    Math.random() * 100

  const critical =
    criticalRoll < criticalChance

  if (critical) {
    damage *= 1.75
  }

  /*
   * RESISTENCIA
   *
   * La resistencia reduce el daño.
   */

  const resistanceReduction = Math.min(
    0.45,
    defenderStats.resistance * 0.035
  )

  damage *=
    1 - resistanceReduction

  damage = Math.max(
    1,
    Math.round(damage)
  )

  return {
    type: critical
      ? 'critical'
      : 'hit',
    damage,
    accuracy,
    critical,
  }
}

function BattleCharacterCard({
  character,
  hp,
  maxHp,
  energy,
  isActive,
  side,
}) {
  const image =
    getCharacterImage(character)

  const hpPercentage = Math.max(
    0,
    Math.min(
      100,
      (hp / maxHp) * 100
    )
  )

  const energyPercentage = Math.max(
    0,
    Math.min(
      100,
      energy
    )
  )

  return (
    <article
      className={`battle-character battle-character-${side} ${
        isActive
          ? 'is-active'
          : ''
      }`}
    >
      <div className="battle-character-heading">
        <div>
          <p className="battle-side-label">
            {side === 'left'
              ? 'LUCHADOR A'
              : 'LUCHADOR B'}
          </p>

          <h2>
            {character.name}
          </h2>
        </div>

        <strong className="battle-hp-value">
          {Math.ceil(hp)}
        </strong>
      </div>

      <div className="battle-hp-bar">
        <div
          className="battle-hp-fill"
          style={{
            width: `${hpPercentage}%`,
          }}
        />
      </div>

      <div className="battle-hp-label">
        <span>VIDA</span>

        <span>
          {Math.ceil(hp)} / {maxHp}
        </span>
      </div>

      <div className="battle-energy">
        <div className="battle-energy-header">
          <span>ENERGÍA</span>

          <span>
            {Math.round(energy)}%
          </span>
        </div>

        <div className="battle-energy-bar">
          <div
            className="battle-energy-fill"
            style={{
              width: `${energyPercentage}%`,
            }}
          />
        </div>
      </div>

      <div className="battle-character-image">
        {image ? (
          <img
            src={image}
            alt={character.name}
          />
        ) : (
          <div className="battle-character-placeholder">
            {character.name?.[0] ||
              '?'}
          </div>
        )}
      </div>
    </article>
  )
}

function BattlePage() {
  const { characters } =
    useCharacters()

  const [characterAId, setCharacterAId] =
    useState('')

  const [characterBId, setCharacterBId] =
    useState('')

  const [battleStarted, setBattleStarted] =
    useState(false)

  const [turn, setTurn] =
    useState(0)

  const [currentAttackerId, setCurrentAttackerId] =
    useState('')

  const [hp, setHp] =
    useState({})

  const [energy, setEnergy] =
    useState({})

  const [battleLog, setBattleLog] =
    useState([])

  const [winnerId, setWinnerId] =
    useState('')

  const [isBattleFinished, setIsBattleFinished] =
    useState(false)

  const [isProcessingTurn, setIsProcessingTurn] =
    useState(false)

  const characterA = useMemo(
    () =>
      characters.find(
        (character) =>
          character.id ===
          characterAId
      ),
    [
      characters,
      characterAId,
    ]
  )

  const characterB = useMemo(
    () =>
      characters.find(
        (character) =>
          character.id ===
          characterBId
      ),
    [
      characters,
      characterBId,
    ]
  )

  useEffect(() => {
    if (
      characters.length >= 2 &&
      !characterAId &&
      !characterBId
    ) {
      setCharacterAId(
        characters[0].id
      )

      setCharacterBId(
        characters[1].id
      )
    }
  }, [
    characters,
    characterAId,
    characterBId,
  ])

  function startBattle() {
    if (
      !characterA ||
      !characterB ||
      characterA.id === characterB.id
    ) {
      return
    }

    const maxHpA =
      getMaxHp(characterA)

    const maxHpB =
      getMaxHp(characterB)

    const [firstAttacker] =
      getTurnOrder(
        characterA,
        characterB
      )

    setHp({
      [characterA.id]: maxHpA,
      [characterB.id]: maxHpB,
    })

    setEnergy({
      [characterA.id]: 0,
      [characterB.id]: 0,
    })

    setTurn(1)

    setCurrentAttackerId(
      firstAttacker.id
    )

    setBattleLog([
      {
        id: crypto.randomUUID(),
        type: 'system',
        text: `¡Comienza el combate! ${firstAttacker.name} tiene la iniciativa.`,
      },
    ])

    setWinnerId('')
    setIsBattleFinished(false)
    setIsProcessingTurn(false)
    setBattleStarted(true)
  }

  function resetBattle() {
    setBattleStarted(false)
    setTurn(0)
    setCurrentAttackerId('')
    setHp({})
    setEnergy({})
    setBattleLog([])
    setWinnerId('')
    setIsBattleFinished(false)
    setIsProcessingTurn(false)
  }

  function performTurn() {
    if (
      !battleStarted ||
      isBattleFinished ||
      isProcessingTurn ||
      !characterA ||
      !characterB ||
      !currentAttackerId
    ) {
      return
    }

    setIsProcessingTurn(true)

    const attacker =
      currentAttackerId ===
      characterA.id
        ? characterA
        : characterB

    const defender =
      currentAttackerId ===
      characterA.id
        ? characterB
        : characterA

    const result =
      getAttackResult(
        attacker,
        defender
      )

    /*
     * ENERGÍA
     *
     * Cada turno genera energía.
     * Los golpes exitosos generan
     * un poco más.
     */

    const energyGain =
      result.type === 'miss'
        ? 8
        : result.critical
          ? 18
          : 13

    setEnergy(
      (previousEnergy) => ({
        ...previousEnergy,
        [attacker.id]:
          Math.min(
            MAX_ENERGY,
            (previousEnergy[
              attacker.id
            ] || 0) +
              energyGain
          ),
      })
    )

    let logText = ''

    if (result.type === 'miss') {
      logText =
        `💨 ${defender.name} esquiva el ataque de ${attacker.name}.`
    } else if (
      result.type === 'critical'
    ) {
      logText =
        `💥 ¡GOLPE CRÍTICO! ${attacker.name} ataca a ${defender.name} y causa ${result.damage} de daño.`
    } else {
      logText =
        `⚔️ ${attacker.name} ataca a ${defender.name} y causa ${result.damage} de daño.`
    }

    setBattleLog(
      (previousLog) => [
        ...previousLog,
        {
          id: crypto.randomUUID(),
          type:
            result.type === 'critical'
              ? 'critical'
              : result.type === 'miss'
                ? 'miss'
                : 'attack',
          text: logText,
        },
      ]
    )

    if (result.damage > 0) {
      const currentDefenderHp =
        hp[defender.id]

      const newDefenderHp =
        Math.max(
          0,
          currentDefenderHp -
            result.damage
        )

      setHp(
        (previousHp) => ({
          ...previousHp,
          [defender.id]:
            newDefenderHp,
        })
      )

      if (
        newDefenderHp <= 0
      ) {
        setWinnerId(
          attacker.id
        )

        setIsBattleFinished(
          true
        )

        setBattleLog(
          (previousLog) => [
            ...previousLog,
            {
              id: crypto.randomUUID(),
              type: 'winner',
              text: `🏆 ¡${attacker.name} gana el combate!`,
            },
          ]
        )

        setTimeout(() => {
          setIsProcessingTurn(false)
        }, 350)

        return
      }
    }

    setCurrentAttackerId(
      defender.id
    )

    setTurn(
      (previousTurn) =>
        previousTurn + 1
    )

    setTimeout(() => {
      setIsProcessingTurn(false)
    }, 350)
  }

  if (characters.length < 2) {
    return (
      <section className="battle-page">
        <p className="eyebrow">
          Modo combate
        </p>

        <h1>
          La arena necesita{' '}
          <span>rivales.</span>
        </h1>

        <div className="empty-state">
          <h2>
            Necesitas al menos dos
            personajes.
          </h2>

          <p>
            Crea dos personajes para
            poder iniciar un combate.
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="battle-page">
      <div className="battle-heading">
        <div>
          <p className="eyebrow">
            Modo combate
          </p>

          <h1>
            ⚔️ La <span>arena</span>
          </h1>

          <p>
            Elige dos personajes y
            observa cómo se enfrentan
            turno a turno.
          </p>
        </div>

        {battleStarted && (
          <button
            className="button secondary"
            type="button"
            onClick={
              resetBattle
            }
          >
            Nuevo combate
          </button>
        )}
      </div>

      {!battleStarted ? (
        <div className="battle-setup">
          <div className="battle-selector">
            <label className="field">
              Primer combatiente

              <select
                value={
                  characterAId
                }
                onChange={(event) =>
                  setCharacterAId(
                    event.target.value
                  )
                }
              >
                {characters.map(
                  (character) => (
                    <option
                      value={
                        character.id
                      }
                      key={
                        character.id
                      }
                    >
                      {character.name}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <div className="battle-vs">
            VS
          </div>

          <div className="battle-selector">
            <label className="field">
              Segundo combatiente

              <select
                value={
                  characterBId
                }
                onChange={(event) =>
                  setCharacterBId(
                    event.target.value
                  )
                }
              >
                {characters.map(
                  (character) => (
                    <option
                      value={
                        character.id
                      }
                      key={
                        character.id
                      }
                    >
                      {character.name}
                    </option>
                  )
                )}
              </select>
            </label>
          </div>

          <button
            className="button battle-start-button"
            type="button"
            disabled={
              !characterA ||
              !characterB ||
              characterA.id ===
                characterB.id
            }
            onClick={
              startBattle
            }
          >
            ⚔️ Comenzar combate
          </button>
        </div>
      ) : (
        <div className="battle-arena">
          <div className="battle-round">
            <span>
              ROUND {turn}
            </span>

            {!isBattleFinished && (
              <strong>
                Turno de{' '}
                {
                  (
                    currentAttackerId ===
                    characterA.id
                      ? characterA
                      : characterB
                  ).name
                }
              </strong>
            )}

            {isBattleFinished && (
              <strong>
                ¡COMBATE TERMINADO!
              </strong>
            )}
          </div>

          <div className="battle-fighters">
            <BattleCharacterCard
              character={
                characterA
              }
              hp={
                hp[
                  characterA.id
                ] || 0
              }
              maxHp={getMaxHp(
                characterA
              )}
              energy={
                energy[
                  characterA.id
                ] || 0
              }
              isActive={
                currentAttackerId ===
                  characterA.id &&
                !isBattleFinished
              }
              side="left"
            />

            <div className="battle-vs">
              VS
            </div>

            <BattleCharacterCard
              character={
                characterB
              }
              hp={
                hp[
                  characterB.id
                ] || 0
              }
              maxHp={getMaxHp(
                characterB
              )}
              energy={
                energy[
                  characterB.id
                ] || 0
              }
              isActive={
                currentAttackerId ===
                  characterB.id &&
                !isBattleFinished
              }
              side="right"
            />
          </div>

          <div className="battle-controls">
            {!isBattleFinished ? (
              <button
                className="button battle-attack-button"
                type="button"
                disabled={
                  isProcessingTurn
                }
                onClick={
                  performTurn
                }
              >
                {isProcessingTurn
                  ? '⚔️ Resolviendo...'
                  : '⚔️ Resolver turno'}
              </button>
            ) : (
              <>
                <div className="battle-winner">
                  <p className="eyebrow">
                    Ganador
                  </p>

                  <h2>
                    🏆{' '}
                    {
                      (
                        winnerId ===
                        characterA.id
                          ? characterA
                          : characterB
                      ).name
                    }
                  </h2>
                </div>

                <button
                  className="button"
                  type="button"
                  onClick={
                    resetBattle
                  }
                >
                  Volver a elegir
                </button>
              </>
            )}
          </div>

          <div className="battle-log">
            <div className="battle-log-header">
              <p className="eyebrow">
                Registro del combate
              </p>
            </div>

            {battleLog.map(
              (entry) => (
                <div
                  className={`battle-log-entry battle-log-${entry.type}`}
                  key={entry.id}
                >
                  {entry.text}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </section>
  )
}

export default BattlePage