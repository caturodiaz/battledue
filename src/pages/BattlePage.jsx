import { useEffect, useMemo, useState } from 'react'
import { useCharacters } from '../hooks/useCharacters'

const BASE_HP = 100
const MAX_ENERGY = 100
const DEFENSE_DAMAGE_REDUCTION = 0.5

function getCharacterImage(character) {
  return (
    character?.profile?.primaryImage ||
    character?.image ||
    ''
  )
}

function getStats(character) {
  const stats = character?.profile?.stats || {}

  return {
    strength: Number(stats.strength) || 0,
    speed: Number(stats.speed) || 0,
    defense: Number(stats.defense) || 0,
    range: Number(stats.range) || 0,
    endurance: Number(stats.endurance) || 0,
    control: Number(stats.control) || 0,
  }
}

function getAbilities(character) {
  return Array.isArray(
    character?.profile?.abilities
  )
    ? character.profile.abilities
    : []
}

function getMaxHp(character) {
  const stats = getStats(character)

  return (
    BASE_HP +
    stats.endurance * 10 +
    stats.defense * 5
  )
}

function getTurnOrder(characterA, characterB) {
  const speedA = getStats(characterA).speed
  const speedB = getStats(characterB).speed

  if (speedA > speedB) {
    return [characterA, characterB]
  }

  if (speedB > speedA) {
    return [characterB, characterA]
  }

  return Math.random() < 0.5
    ? [characterA, characterB]
    : [characterB, characterA]
}

function calculateAttack({
  attacker,
  defender,
  multiplier = 1,
  guaranteedHit = false,
  criticalBonus = 0,
}) {
  const attackerStats = getStats(attacker)
  const defenderStats = getStats(defender)

  const accuracy = Math.max(
    50,
    Math.min(
      97,
      72 +
        attackerStats.control * 3 +
        attackerStats.range -
        defenderStats.speed * 2
    )
  )

  const hit =
    guaranteedHit ||
    Math.random() * 100 <= accuracy

  if (!hit) {
    return {
      type: 'miss',
      damage: 0,
      accuracy,
      critical: false,
    }
  }

  const baseDamage =
    6 +
    attackerStats.strength * 2 +
    attackerStats.range * 0.8 +
    attackerStats.control * 0.5

  const variation =
    0.8 +
    Math.random() * 0.4

  let damage =
    baseDamage *
    variation *
    multiplier

  const criticalChance = Math.min(
    40,
    8 +
      attackerStats.control * 2 +
      criticalBonus
  )

  const critical =
    Math.random() * 100 <
    criticalChance

  if (critical) {
    damage *= 1.7
  }

  const defenseReduction = Math.min(
    0.5,
    defenderStats.defense * 0.04
  )

  damage *=
    1 - defenseReduction

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
  isDefending,
  side,
  combatEffect,
  hpFlash,
  energyPulse,
  isDefeated,
  isVictorious,
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
        isActive ? 'is-active' : ''
    } ${
        isDefending ? 'is-defending' : ''
    } ${
        hpFlash ? 'is-hit' : ''
    } ${
        combatEffect === 'critical'
        ? 'is-critical'
        : ''
    } ${
        combatEffect === 'miss'
        ? 'is-dodging'
        : ''
    } ${
        isDefeated
        ? 'is-defeated'
        : ''
    } ${
        isVictorious
        ? 'is-victorious'
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
        className={`battle-hp-fill ${
            hpFlash
            ? 'hp-is-changing'
            : ''
        }`}
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

      <div
        className={`battle-energy ${
            energyPulse
            ? 'energy-is-charging'
            : ''
        } ${
            energy >= 100
            ? 'energy-is-full'
            : ''
        }`}
        >
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
        {isActive && (
          <div className="battle-turn-badge">
            ⚔️ ¡TU TURNO!
          </div>
        )}

        {isDefending && (
          <div className="battle-defense-badge">
            🛡️ DEFENDIENDO
          </div>
        )}

        {image ? (
          <img
            src={image}
            alt={character.name}
          />
        ) : (
          <div className="battle-character-placeholder">
            {character.name?.[0] || '?'}
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

  const [defending, setDefending] =
    useState({})

  const [battleLog, setBattleLog] =
    useState([])

  const [winnerId, setWinnerId] =
    useState('')

  const [isBattleFinished, setIsBattleFinished] =
    useState(false)

  const [isProcessingTurn, setIsProcessingTurn] =
    useState(false)

  const [selectedAction, setSelectedAction] =
    useState('basic')

  const [battleNotification, setBattleNotification] =
    useState(null)

    const [combatEffect, setCombatEffect] =
    useState(null)

    const [hpFlash, setHpFlash] =
    useState({})

    const [energyPulse, setEnergyPulse] =
    useState({})

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

  const currentAttacker = useMemo(
    () => {
      if (
        !currentAttackerId
      ) {
        return null
      }

      return (
        characters.find(
          (character) =>
            character.id ===
            currentAttackerId
        ) || null
      )
    },
    [
      characters,
      currentAttackerId,
    ]
  )

  const currentDefender = useMemo(
    () => {
      if (
        !currentAttackerId
      ) {
        return null
      }

      if (
        currentAttackerId ===
        characterA?.id
      ) {
        return characterB
      }

      return characterA
    },
    [
      currentAttackerId,
      characterA,
      characterB,
    ]
  )

  const currentEnergy =
    currentAttacker
      ? energy[
          currentAttacker.id
        ] || 0
      : 0

  const currentAbilities =
    getAbilities(
      currentAttacker
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

  useEffect(() => {
    if (
      !currentAttacker ||
      !battleStarted
    ) {
      return
    }

    setSelectedAction('basic')
  }, [
    currentAttackerId,
    battleStarted,
    currentAttacker,
  ])

  useEffect(() => {
    if (!battleNotification) {
      return
    }

    const timeout = setTimeout(() => {
      setBattleNotification(null)
    }, 2200)

    return () => {
      clearTimeout(timeout)
    }
  }, [battleNotification])

  function addLog(
    text,
    type = 'attack',
    notification = null
  ) {
    setBattleLog(
      (previousLog) => [
        ...previousLog,
        {
          id: crypto.randomUUID(),
          type,
          text,
        },
      ]
    )

    if (notification) {
      setBattleNotification({
        id: crypto.randomUUID(),
        ...notification,
      })
    }
  }

  function startBattle() {
    if (
      !characterA ||
      !characterB ||
      characterA.id ===
        characterB.id
    ) {
      return
    }

    const maxHpA =
      getMaxHp(characterA)

    const maxHpB =
      getMaxHp(characterB)

    const [
      firstAttacker,
    ] = getTurnOrder(
      characterA,
      characterB
    )

    setHp({
      [characterA.id]:
        maxHpA,
      [characterB.id]:
        maxHpB,
    })

    setEnergy({
      [characterA.id]: 0,
      [characterB.id]: 0,
    })



    setDefending({
      [characterA.id]: false,
      [characterB.id]: false,
    })

    setTurn(1)

    setCurrentAttackerId(
      firstAttacker.id
    )

    setBattleLog([
      {
        id: crypto.randomUUID(),
        type: 'system',
        text: `⚔️ ¡Comienza el combate! ${firstAttacker.name} tiene la iniciativa.`,
      },
    ])

    setBattleNotification({
      id: crypto.randomUUID(),
      icon: '⚔️',
      title: '¡COMIENZA EL COMBATE!',
      text: `${firstAttacker.name} tiene la iniciativa`,
      type: 'system',
    })

    setWinnerId('')
    setIsBattleFinished(false)
    setIsProcessingTurn(false)
    setSelectedAction('basic')
    setBattleStarted(true)
  }

  function resetBattle() {
    setBattleStarted(false)
    setTurn(0)
    setCurrentAttackerId('')
    setHp({})
    setEnergy({})
    setDefending({})
    setBattleLog([])
    setWinnerId('')
    setIsBattleFinished(false)
    setIsProcessingTurn(false)
    setSelectedAction('basic')
    setBattleNotification(null)
  }

  function performAction() {
    if (
      !battleStarted ||
      isBattleFinished ||
      isProcessingTurn ||
      !currentAttacker ||
      !currentDefender
    ) {
      return
    }

    const action =
      selectedAction

    /*
     * DEFENDER
     */

    if (action === 'defend') {
      setIsProcessingTurn(true)

      setDefending(
        (previousDefending) => ({
          ...previousDefending,
          [currentAttacker.id]:
            true,
        })
      )

      setEnergy(
        (previousEnergy) => ({
          ...previousEnergy,
          [currentAttacker.id]:
            Math.min(
              MAX_ENERGY,
              (
                previousEnergy[
                  currentAttacker.id
                ] || 0
              ) + 10
            ),
        })
      )

      setEnergyPulse(
        (previous) => ({
            ...previous,
            [currentAttacker.id]:
            true,
        })
        )

        setTimeout(() => {
        setEnergyPulse(
            (previous) => ({
            ...previous,
            [currentAttacker.id]:
                false,
            })
        )
        }, 600)

      addLog(
        `🛡️ ${currentAttacker.name} se prepara para defenderse y reducirá el próximo daño recibido en un 50%.`,
        'defend',
        {
          icon: '🛡️',
          title: '¡SE DEFENDIÓ!',
          text: `${currentAttacker.name} reducirá el próximo daño en un 50%`,
          type: 'defend',
        }
      )

      setCurrentAttackerId(
        currentDefender.id
      )

      setTurn(
        (previousTurn) =>
          previousTurn + 1
      )

      setTimeout(() => {
        setIsProcessingTurn(
          false
        )
      }, 350)

      return
    }

    let actionName =
      'Ataque básico'

    let multiplier = 1

    let energyCost = 0

    let guaranteedHit = false

    let criticalBonus = 0

    let actionType = 'attack'

    if (
      action === 'ultimate'
    ) {
      if (
        currentEnergy < 100
      ) {
        return
      }

      actionName =
        currentAttacker
          .profile
          ?.ultimateName ||
        'Técnica definitiva'

      multiplier = 3

      energyCost = 100

      guaranteedHit = true

      criticalBonus = 15

      actionType =
        'ultimate'
    } else if (
      action.startsWith(
        'ability-'
      )
    ) {
      const abilityIndex =
        Number(
          action.replace(
            'ability-',
            ''
          )
        )

      const ability =
        currentAbilities[
          abilityIndex
        ]

      if (!ability) {
        return
      }

      actionName =
        ability.name ||
        'Habilidad'

      energyCost = 25

      if (
        currentEnergy <
        energyCost
      ) {
        return
      }

      multiplier =
        1.45 +
        abilityIndex * 0.15

      criticalBonus =
        5

      actionType =
        'ability'
    }

    setIsProcessingTurn(true)

    const result =
      calculateAttack({
        attacker:
          currentAttacker,
        defender:
          currentDefender,
        multiplier,
        guaranteedHit,
        criticalBonus,
      })

      setCombatEffect(
        result.type
        )

        setTimeout(() => {
        setCombatEffect(null)
        }, 550)

    const newEnergy =
      Math.max(
        0,
        currentEnergy -
          energyCost +
          (
            action ===
            'ultimate'
              ? 0
              : result.type ===
                'miss'
                ? 8
                : result.critical
                  ? 18
                  : 13
          )
      )

    setEnergy(
      (previousEnergy) => ({
        ...previousEnergy,
        [currentAttacker.id]:
          Math.min(
            MAX_ENERGY,
            newEnergy
          ),
      })
    )

    if (
      result.type === 'miss'
    ) {
      addLog(
        `💨 ${currentDefender.name} esquiva ${actionName} de ${currentAttacker.name}.`,
        'miss',
        {
          icon: '💨',
          title: '¡ESQUIVÓ EL ATAQUE!',
          text: `${currentDefender.name} evitó el ataque de ${currentAttacker.name}`,
          type: 'miss',
        }
      )
    } else if (
      result.type === 'critical'
    ) {
      const wasDefending =
        defending[
          currentDefender.id
        ]

      const finalDamage =
        wasDefending
          ? Math.max(
              1,
              Math.round(
                result.damage *
                  (
                    1 -
                    DEFENSE_DAMAGE_REDUCTION
                  )
              )
            )
          : result.damage

      if (wasDefending) {
        setDefending(
          (previousDefending) => ({
            ...previousDefending,
            [currentDefender.id]:
              false,
          })
        )
      }

      addLog(
        wasDefending
          ? `🛡️💥 ¡GOLPE CRÍTICO BLOQUEADO! ${currentAttacker.name} causa ${result.damage} de daño a ${currentDefender.name}, pero su defensa lo reduce a ${finalDamage}.`
          : `💥 ¡GOLPE CRÍTICO! ${currentAttacker.name} usa ${actionName} y causa ${result.damage} de daño a ${currentDefender.name}.`,
        'critical',
        {
          icon: wasDefending
            ? '🛡️💥'
            : '💥',
          title: wasDefending
            ? '¡DEFENSA CONTRA CRÍTICO!'
            : '¡GOLPE CRÍTICO!',
          text: wasDefending
            ? `${currentDefender.name}: ${result.damage} → ${finalDamage} de daño`
            : `${currentDefender.name} recibió ${result.damage} de daño`,
          type: 'critical',
        }
      )

      result.damage =
        finalDamage
    } else {
      const wasDefending =
        defending[
          currentDefender.id
        ]

      const finalDamage =
        wasDefending
          ? Math.max(
              1,
              Math.round(
                result.damage *
                  (
                    1 -
                    DEFENSE_DAMAGE_REDUCTION
                  )
              )
            )
          : result.damage

      if (wasDefending) {
        setDefending(
          (previousDefending) => ({
            ...previousDefending,
            [currentDefender.id]:
              false,
          })
        )
      }

      const emoji =
        actionType ===
        'ultimate'
          ? '⚡'
          : actionType ===
              'ability'
            ? '✨'
            : '⚔️'

      const notificationTitle =
        actionType ===
        'ultimate'
          ? '¡TÉCNICA DEFINITIVA!'
          : actionType ===
              'ability'
            ? '¡HABILIDAD!'
            : '¡ATAQUE!'

      addLog(
        wasDefending
          ? `🛡️ ${emoji} ${currentAttacker.name} usa ${actionName} y causa ${result.damage} de daño, pero ${currentDefender.name} lo reduce a ${finalDamage}.`
          : `${emoji} ${currentAttacker.name} usa ${actionName} y causa ${result.damage} de daño a ${currentDefender.name}.`,
        actionType,
        {
          icon: wasDefending
            ? `🛡️${emoji}`
            : emoji,
          title: wasDefending
            ? '¡DEFENSA!'
            : notificationTitle,
          text: wasDefending
            ? `${currentDefender.name}: ${result.damage} → ${finalDamage} de daño`
            : `${currentAttacker.name} causó ${result.damage} de daño a ${currentDefender.name}`,
          type:
            wasDefending
              ? 'defend-hit'
              : actionType,
        }
      )

      result.damage =
        finalDamage
    }

    if (
      result.damage > 0
    ) {

        setHpFlash(
            (previous) => ({
                ...previous,
                [currentDefender.id]:
                true,
            })
            )

            setTimeout(() => {
            setHpFlash(
                (previous) => ({
                ...previous,
                [currentDefender.id]:
                    false,
                })
            )
            }, 500)
      const currentHp =
        hp[
          currentDefender.id
        ] || 0

      const newHp =
        Math.max(
          0,
          currentHp -
            result.damage
        )

      setHp(
        (previousHp) => ({
          ...previousHp,
          [currentDefender.id]:
            newHp,
        })
      )

      if (
        newHp <= 0
      ) {
        setWinnerId(
          currentAttacker.id
        )

        setIsBattleFinished(
          true
        )

        addLog(
          `🏆 ¡${currentAttacker.name} gana el combate!`,
          'winner',
          {
            icon: '🏆',
            title: '¡COMBATE TERMINADO!',
            text: `${currentAttacker.name} es el ganador`,
            type: 'winner',
          }
        )

        setTimeout(() => {
          setIsProcessingTurn(
            false
          )
        }, 350)

        return
      }
    }

    setCurrentAttackerId(
      currentDefender.id
    )

    setTurn(
      (previousTurn) =>
        previousTurn + 1
    )

    setTimeout(() => {
      setIsProcessingTurn(
        false
      )
    }, 350)
  }

  if (
    characters.length < 2
  ) {
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
          {battleNotification && (
            <div
              className={`battle-notification battle-notification-${battleNotification.type}`}
              key={
                battleNotification.id
              }
            >
              <div className="battle-notification-icon">
                {
                  battleNotification.icon
                }
              </div>

              <div className="battle-notification-content">
                <strong>
                  {
                    battleNotification.title
                  }
                </strong>

                <span>
                  {
                    battleNotification.text
                  }
                </span>
              </div>
            </div>
          )}

          <div className="battle-round">
            <span>
              ROUND {turn}
            </span>

            {!isBattleFinished && (
              <strong>
                Turno de{' '}
                {
                  currentAttacker
                    ?.name
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
              isActive={
                currentAttackerId ===
                  characterA.id &&
                !isBattleFinished
              }
              isDefending={
                defending[
                  characterA.id
                ] || false
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
              side="left"
              combatEffect={
                currentAttackerId === characterA.id
                    ? combatEffect
                    : null
                }
                hpFlash={
                hpFlash[characterA.id] || false
                }
                energyPulse={
                energyPulse[characterA.id] || false
                }
                isDefeated={
                hp[characterA.id] <= 0
                }
                isVictorious={
                winnerId === characterA.id
                }
            />

            <div className="battle-vs">
              VS
            </div>

            <BattleCharacterCard
              character={
                characterB
              }
              isActive={
                currentAttackerId ===
                  characterB.id &&
                !isBattleFinished
              }
              isDefending={
                defending[
                  characterB.id
                ] || false
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
              side="right"
                combatEffect={
                currentAttackerId === characterB.id
                    ? combatEffect
                    : null
                }
                hpFlash={
                hpFlash[characterB.id] || false
                }
                energyPulse={
                energyPulse[characterB.id] || false
                }
                isDefeated={
                hp[characterB.id] <= 0
                }
                isVictorious={
                winnerId === characterB.id
                }
            />
          </div>

          {!isBattleFinished && (
            <div
              className="battle-action-panel"
              key={currentAttackerId}
            >
              <p className="eyebrow">
                Acciones de{' '}
                {
                  currentAttacker
                    ?.name
                }
              </p>

              <div className="battle-actions">
                <button
                  className={
                    selectedAction ===
                    'basic'
                      ? 'battle-action active'
                      : 'battle-action'
                  }
                  type="button"
                  onClick={() =>
                    setSelectedAction(
                      'basic'
                    )
                  }
                >
                  <strong>
                    ⚔️ Ataque
                  </strong>

                  <span>
                    Ataque básico
                  </span>
                </button>

                {currentAbilities.map(
                  (
                    ability,
                    index
                  ) => {
                    const actionId =
                      `ability-${index}`

                    const disabled =
                      currentEnergy <
                      25

                    return (
                      <button
                        className={
                          selectedAction ===
                          actionId
                            ? 'battle-action active'
                            : 'battle-action'
                        }
                        type="button"
                        key={
                          ability.id ||
                          actionId
                        }
                        disabled={
                          disabled
                        }
                        onClick={() =>
                          setSelectedAction(
                            actionId
                          )
                        }
                      >
                        <strong>
                          ✨{' '}
                          {
                            ability.name ||
                            `Habilidad ${
                              index +
                              1
                            }`
                          }
                        </strong>

                        <span>
                          25 energía
                        </span>
                      </button>
                    )
                  }
                )}

                <button
                  className={
                    selectedAction ===
                    'ultimate'
                      ? 'battle-action battle-action-ultimate active'
                      : 'battle-action battle-action-ultimate'
                  }
                  type="button"
                  disabled={
                    currentEnergy <
                    100
                  }
                  onClick={() =>
                    setSelectedAction(
                      'ultimate'
                    )
                  }
                >
                  <strong>
                    ⚡{' '}
                    {
                      currentAttacker
                        ?.profile
                        ?.ultimateName ||
                      'Técnica definitiva'
                    }
                  </strong>

                  <span>
                    {currentEnergy >=
                    100
                      ? '¡LISTA!'
                      : `${Math.round(
                          currentEnergy
                        )}% de energía`}
                  </span>
                </button>

                <button
                  className={
                    selectedAction ===
                    'defend'
                      ? 'battle-action battle-action-defend active'
                      : 'battle-action battle-action-defend'
                  }
                  type="button"
                  onClick={() =>
                    setSelectedAction(
                      'defend'
                    )
                  }
                >
                  <strong>
                    🛡️ Defender
                  </strong>

                  <span>
                    -50% próximo daño
                  </span>
                </button>
              </div>

              <button
                className="button battle-attack-button"
                type="button"
                disabled={
                  isProcessingTurn ||
                  (
                    selectedAction ===
                      'ultimate' &&
                    currentEnergy <
                      100
                  ) ||
                  (
                    selectedAction.startsWith(
                      'ability-'
                    ) &&
                    currentEnergy <
                      25
                  )
                }
                onClick={
                  performAction
                }
              >
                {isProcessingTurn
                  ? '⚔️ Resolviendo...'
                  : selectedAction ===
                      'defend'
                    ? '🛡️ Defender'
                    : selectedAction ===
                        'ultimate'
                      ? '⚡ Usar técnica definitiva'
                      : selectedAction.startsWith(
                            'ability-'
                          )
                        ? '✨ Usar habilidad'
                        : '⚔️ Atacar'}
              </button>
            </div>
          )}

          {isBattleFinished && (
            <div className="battle-controls">
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
            </div>
          )}

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