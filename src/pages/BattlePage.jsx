import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCharacters } from '../hooks/useCharacters'
import { chooseEnemyAction } from '../battle/ai/chooseEnemyAction'
import { executeEnemyTurn } from '../battle/ai/executeEnemyTurn'
import BattleResultScreen from '../components/BattleResultScreen'
import { getBattleStateInfo } from '../battle/battleStateInfo'
import { endBattleTurn, executeCombatAction, startBattleTurn } from '../battle/engine'
import {
  playAttackSound,
  playEnergyReadySound,
  playVictorySound,
  playDodgeSound,
  playLostBattleSound,
  playFullHealingSound,
} from '../battle/audio/battleSounds'
import {
  canUseMetamorphosis,
  createTokataTransformation,
  getTokataAbilities,
  getTokataDisplayCharacter,
  isMetamorphosisAbility,
  isTokata,
} from '../battle/tokataTransformation'

const BASE_HP = 100
const MAX_ENERGY = 100
const BATTLE_FINISH_DELAY = 2200
const TOKATA_METAMORPHOSIS_COOLDOWN = 3

function getCharacterImage(character) {
  return character?.profile?.primaryImage || character?.image || ''
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
  return Array.isArray(character?.profile?.abilities) ? character.profile.abilities : []
}

function getMaxHp(character) {
  const stats = getStats(character)
  return BASE_HP + stats.endurance * 10 + stats.defense * 5
}

function getTurnOrder(characterA, characterB) {
  const speedA = getStats(characterA).speed
  const speedB = getStats(characterB).speed
  if (speedA > speedB) return [characterA, characterB]
  if (speedB > speedA) return [characterB, characterA]
  return Math.random() < 0.5 ? [characterA, characterB] : [characterB, characterA]
}

function getPcBattleStats(battleLog, playerName, enemyName, rounds) {
  const entries = Array.isArray(battleLog) ? battleLog : []
  const damageFromEntry = (entry) => {
    const text = entry?.text || ''
    const reduced = text.match(/→\s*(\d+)\s+de daño/)
    if (reduced) return Number(reduced[1])
    const damage = text.match(/causa\s+(\d+)\s+de daño/)
    return damage ? Number(damage[1]) : 0
  }
  return {
    rounds: Math.max(0, Number(rounds) || 0),
    damageDealt: entries.filter(entry => (entry?.text || '').includes(playerName)).reduce((sum, entry) => sum + damageFromEntry(entry), 0),
    damageReceived: entries.filter(entry => (entry?.text || '').includes(enemyName)).reduce((sum, entry) => sum + damageFromEntry(entry), 0),
    criticalHits: entries.filter(entry => entry?.type === 'critical' && (entry?.text || '').includes(playerName)).length,
    abilitiesUsed: entries.filter(entry => (entry?.type === 'ability' || entry?.type === 'ultimate') && (entry?.text || '').includes(playerName)).length,
    healingDone: entries.filter(entry => entry?.type === 'heal' && (entry?.text || '').includes(playerName)).length,
  }
}

function BattleCharacterCard({ character, hp, maxHp, energy, isActive, isDefending, side, combatEffect, hpFlash, energyPulse, isDefeated, isVictorious, healingCharacterId, states = [] }) {
  const image = getCharacterImage(character)
  const hpPercentage = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const energyPercentage = Math.max(0, Math.min(100, energy))
  return (
    <article className={`battle-character battle-character-${side} ${isActive ? 'is-active' : ''} ${isDefending ? 'is-defending' : ''} ${hpFlash ? 'is-hit' : ''} ${combatEffect === 'critical' ? 'is-critical' : ''} ${combatEffect === 'miss' ? 'is-dodging' : ''} ${isDefeated ? 'is-defeated' : ''} ${isVictorious ? 'is-victorious' : ''} ${healingCharacterId === character.id ? 'is-healing' : ''}`}>
      <div className="battle-character-heading">
        <div><p className="battle-side-label">{side === 'left' ? 'LUCHADOR A' : 'LUCHADOR B'}</p><h2>{character.name}</h2></div>
        <strong className="battle-hp-value">{Math.ceil(hp)}</strong>
      </div>
      <div className="battle-hp-bar"><div className={`battle-hp-fill ${hpFlash ? 'hp-is-changing' : ''}`} style={{ width: `${hpPercentage}%` }} /></div>
      <div className="battle-hp-label"><span>VIDA</span><span>{Math.ceil(hp)} / {maxHp}</span></div>
      <div className={`battle-energy ${energyPulse ? 'energy-is-charging' : ''} ${energy >= 100 ? 'energy-is-full' : ''}`}>
        <div className="battle-energy-header"><span>ENERGÍA</span><span>{Math.round(energy)}%</span></div>
        <div className="battle-energy-bar"><div className="battle-energy-fill" style={{ width: `${energyPercentage}%` }} /></div>
      </div>
      {states.length > 0 && <div className="battle-status-list">{getBattleStateInfo(states).map((state) => <span className={`battle-status battle-status-${state.type}`} key={state.type} title={state.name}>{state.icon} {state.name}{state.stacks > 1 ? ` x${state.stacks}` : ''}{state.turns ? ` · ${state.turns}` : ''}</span>)}</div>}
      <div className="battle-character-image">
        {healingCharacterId === character.id && <div className="battle-healing-banner"><span className="battle-healing-icon">💚</span><span className="battle-healing-title">CURACIÓN SÚPER</span><span className="battle-healing-subtitle">¡VIDA RESTAURADA!</span></div>}
        {isActive && <div className="battle-turn-badge">⚔️ ¡TU TURNO!</div>}
        {isDefending && <div className="battle-defense-badge">🛡️ DEFENDIENDO</div>}
        {image ? <img src={image} alt={character.name} /> : <div className="battle-character-placeholder">{character.name?.[0] || '?'}</div>}
      </div>
    </article>
  )
}

function BattlePage() {
  const { characters } = useCharacters()
  const [characterAId, setCharacterAId] = useState('')
  const [characterBId, setCharacterBId] = useState('')
  const playerId = characterAId
  const enemyId = characterBId
  const [battleStarted, setBattleStarted] = useState(false)
  const [turn, setTurn] = useState(0)
  const [currentAttackerId, setCurrentAttackerId] = useState('')
  const isPlayerTurn = currentAttackerId === playerId
  const [hp, setHp] = useState({})
  const [energy, setEnergy] = useState({})
  const [defending, setDefending] = useState({})
  const [battleStates, setBattleStates] = useState({})
  const [battleLog, setBattleLog] = useState([])
  const [winnerId, setWinnerId] = useState('')
  const [isBattleFinished, setIsBattleFinished] = useState(false)
  const [battlePhase, setBattlePhase] = useState('setup')
  const [isProcessingTurn, setIsProcessingTurn] = useState(false)
  const [isEnemyThinking, setIsEnemyThinking] = useState(false)
  const [selectedAction, setSelectedAction] = useState('basic')
  const [battleNotification, setBattleNotification] = useState(null)
  const [combatEffect, setCombatEffect] = useState(null)
  const [hpFlash, setHpFlash] = useState({})
  const [energyPulse, setEnergyPulse] = useState({})
  const [healingCharacterId, setHealingCharacterId] = useState('')
  const [ultimateAnimation, setUltimateAnimation] = useState(null)
  const [tokataTransformation, setTokataTransformation] = useState(null)
  const [tokataMetamorphosisCooldown, setTokataMetamorphosisCooldown] = useState(0)
  const performActionRef = useRef(null)
  const processedTurnRef = useRef(null)
  const finishBattleTimeoutRef = useRef(null)

  const characterA = useMemo(() => characters.find(character => character.id === characterAId), [characters, characterAId])
  const characterB = useMemo(() => characters.find(character => character.id === characterBId), [characters, characterBId])
  const currentAttacker = useMemo(() => !currentAttackerId ? null : characters.find(character => character.id === currentAttackerId) || null, [characters, currentAttackerId])
  const currentDefender = useMemo(() => {
    if (!currentAttackerId) return null
    if (currentAttackerId === characterA?.id) return characterB
    return characterA
  }, [currentAttackerId, characterA, characterB])
  const currentAttackerTransformation = currentAttacker?.id === characterAId && isTokata(currentAttacker) ? tokataTransformation : null
  const currentAttackerDisplay = getTokataDisplayCharacter({ character: currentAttacker, transformation: currentAttackerTransformation })
  const characterADisplay = getTokataDisplayCharacter({ character: characterA, transformation: tokataTransformation })
  const currentEnergy = currentAttacker ? energy[currentAttacker.id] || 0 : 0
  const currentAbilities = getTokataAbilities({ character: currentAttacker, transformation: currentAttackerTransformation, metamorphosisAvailable: tokataMetamorphosisCooldown <= 0 })
  const currentAbilityActions = useMemo(() => currentAbilities.map((ability, index) => {
    const effects = Array.isArray(ability?.effects)
      ? ability.effects
      : Array.isArray(ability?.steps)
        ? ability.steps.flatMap(step => step?.effects || [])
        : []
    const damageEffect = effects.find(effect => effect?.type === 'damage_resolve')
    return {
      name: ability?.name || `Habilidad ${index + 1}`,
      energyCost: Number(ability?.costs?.energy ?? 25),
      multiplier: Number(ability?.combat?.multiplier ?? damageEffect?.multiplier ?? 1),
      guaranteedHit: Boolean(ability?.combat?.guaranteedHit),
      criticalBonus: Number(ability?.combat?.criticalBonus ?? 5),
      dealsDamage: effects.some(effect => effect?.type === 'damage_resolve'),
    }
  }), [currentAbilities])
  const currentUltimateAbility = useMemo(() => currentAttacker?.profile?.ultimateAbility || null, [currentAttacker])

  const currentUltimateAction = useMemo(() => {
    const effects = Array.isArray(currentUltimateAbility?.effects)
      ? currentUltimateAbility.effects
      : Array.isArray(currentUltimateAbility?.steps)
        ? currentUltimateAbility.steps.flatMap(step => step?.effects || [])
        : []
    const damageEffect = effects.find(effect => effect?.type === 'damage_resolve')
    return {
      name: currentUltimateAbility?.name || currentAttacker?.profile?.ultimateName || 'Técnica definitiva',
      energyCost: Number(currentUltimateAbility?.costs?.energy ?? 100),
      multiplier: Number(currentUltimateAbility?.combat?.multiplier ?? damageEffect?.multiplier ?? 3),
      guaranteedHit: Boolean(currentUltimateAbility?.combat?.guaranteedHit ?? true),
      criticalBonus: Number(currentUltimateAbility?.combat?.criticalBonus ?? 15),
      dealsDamage: effects.some(effect => effect?.type === 'damage_resolve'),
    }
  }, [currentAttacker, currentUltimateAbility])

  useEffect(() => {
    if (characters.length < 2 || characterAId || characterBId) return
    const initializeCharacters = setTimeout(() => {
      setCharacterAId(characters[0].id)
      setCharacterBId(characters[1].id)
    }, 0)
    return () => clearTimeout(initializeCharacters)
  }, [characters, characterAId, characterBId])

  useEffect(() => {
    if (!currentAttacker || !battleStarted || battlePhase !== 'fighting') return
    const resetSelectedAction = setTimeout(() => setSelectedAction('basic'), 0)
    return () => clearTimeout(resetSelectedAction)
  }, [currentAttackerId, battleStarted, currentAttacker, battlePhase])

  useEffect(() => {
    if (!battleNotification) return
    const timeout = setTimeout(() => setBattleNotification(null), 2200)
    return () => clearTimeout(timeout)
  }, [battleNotification])

  useEffect(() => () => {
    if (finishBattleTimeoutRef.current) clearTimeout(finishBattleTimeoutRef.current)
  }, [])

  const addLog = useCallback((text, type = 'attack', notification = null) => {
    setBattleLog(previousLog => [...previousLog, { id: crypto.randomUUID(), type, text }])
    if (notification) setBattleNotification({ id: crypto.randomUUID(), ...notification })
  }, [])

  const finishBattle = useCallback((winner, loser, reason = '') => {
    if (!winner || !loser) return
    if (finishBattleTimeoutRef.current) clearTimeout(finishBattleTimeoutRef.current)
    setWinnerId(winner.id)
    setBattlePhase('finishing')
    setIsProcessingTurn(true)
    setIsEnemyThinking(false)
    if (winner.id === playerId) playVictorySound(); else playLostBattleSound()
    addLog(
      reason || `🏆 ¡${winner.name} gana el combate!`,
      'winner',
      { icon: '🏆', title: '¡COMBATE TERMINADO!', text: `${winner.name} es el ganador`, type: 'winner' },
    )
    finishBattleTimeoutRef.current = setTimeout(() => {
      setIsBattleFinished(true)
      setBattlePhase('result')
      setIsProcessingTurn(false)
      finishBattleTimeoutRef.current = null
    }, BATTLE_FINISH_DELAY)
  }, [addLog, playerId])

  function startBattle() {
    if (!characterA || !characterB || characterA.id === characterB.id) return
    if (finishBattleTimeoutRef.current) clearTimeout(finishBattleTimeoutRef.current)
    const maxHpA = getMaxHp(characterA)
    const maxHpB = getMaxHp(characterB)
    const [firstAttacker] = getTurnOrder(characterA, characterB)
    setHp({ [characterA.id]: maxHpA, [characterB.id]: maxHpB })
    setEnergy({ [characterA.id]: 0, [characterB.id]: 0 })
    setDefending({ [characterA.id]: false, [characterB.id]: false })
    setBattleStates({ [characterA.id]: [], [characterB.id]: [] })
    setTurn(1)
    setCurrentAttackerId(firstAttacker.id)
    setBattleLog([{ id: crypto.randomUUID(), type: 'system', text: `⚔️ ¡Comienza el combate! ${firstAttacker.name} tiene la iniciativa.` }])
    setBattleNotification({ id: crypto.randomUUID(), icon: '⚔️', title: '¡COMIENZA EL COMBATE!', text: `${firstAttacker.name} tiene la iniciativa`, type: 'system' })
    setWinnerId('')
    setIsBattleFinished(false)
    setBattlePhase('fighting')
    setIsProcessingTurn(false)
    setIsEnemyThinking(false)
    setSelectedAction('basic')
    setUltimateAnimation(null)
    setTokataTransformation(null)
    setTokataMetamorphosisCooldown(0)
    processedTurnRef.current = null
    setBattleStarted(true)
  }

  function resetBattle() {
    if (finishBattleTimeoutRef.current) clearTimeout(finishBattleTimeoutRef.current)
    finishBattleTimeoutRef.current = null
    setBattleStarted(false)
    setTurn(0)
    setCurrentAttackerId('')
    setHp({})
    setEnergy({})
    setDefending({})
    setBattleStates({})
    setBattleLog([])
    setWinnerId('')
    setIsBattleFinished(false)
    setBattlePhase('setup')
    setIsProcessingTurn(false)
    setIsEnemyThinking(false)
    setSelectedAction('basic')
    setBattleNotification(null)
    setUltimateAnimation(null)
    setTokataTransformation(null)
    setTokataMetamorphosisCooldown(0)
    processedTurnRef.current = null
  }

  const performAction = useCallback(async (actionOverride = null) => {
    if (!battleStarted || isBattleFinished || battlePhase !== 'fighting' || isProcessingTurn || !currentAttacker || !currentDefender) return
    const action = actionOverride || selectedAction
    if (typeof action !== 'string') { console.error('⚠️ Acción inválida:', action); return }

    let currentAttackerHp = hp[currentAttacker.id] || 0
    const turnStateKey = `${turn}-${currentAttacker.id}`
    if (processedTurnRef.current !== turnStateKey) {
      processedTurnRef.current = turnStateKey
      const turnStartResult = startBattleTurn({
        players: Object.fromEntries(Object.entries(hp).map(([id, currentHp]) => [id, {
          hp: currentHp,
          max_hp: id === currentAttacker.id ? getMaxHp(currentAttacker) : getMaxHp(currentDefender),
          states: battleStates[id] || [],
        }])),
      }, currentAttacker.id)
      currentAttackerHp = turnStartResult.state.players[currentAttacker.id].hp
      if (turnStartResult.hpChange !== 0) {
        setHp(previousHp => ({ ...previousHp, [currentAttacker.id]: currentAttackerHp }))
        if (turnStartResult.hpChange < 0) {
          setHpFlash(previous => ({ ...previous, [currentAttacker.id]: true }))
          setTimeout(() => setHpFlash(previous => ({ ...previous, [currentAttacker.id]: false })), 500)
        }
      }
      turnStartResult.messages.forEach(message => addLog(message.text, 'status', { icon: message.type === 'bleeding' ? '🩸' : '⚠️', title: '¡ESTADO!', text: message.text, type: 'status' }))
      if (turnStartResult.state.players[currentAttacker.id].hp <= 0) {
        finishBattle(currentDefender, currentAttacker, `🏆 ¡${currentDefender.name} gana el combate! ${currentAttacker.name} cayó por efecto de estado.`)
        return
      }
    }

    if (action === 'metamorphosis') {
      if (!canUseMetamorphosis({ character: currentAttacker, opponent: currentDefender }) || tokataMetamorphosisCooldown > 0) return
      setIsProcessingTurn(true)
      const transformation = createTokataTransformation(currentDefender)
      setTokataTransformation(transformation)
      setTokataMetamorphosisCooldown(TOKATA_METAMORPHOSIS_COOLDOWN)
      addLog(`🦎 ${currentAttacker.name} utiliza Metamorfosis y adopta la forma de ${currentDefender.name}. Sus habilidades normales han sido copiadas.`, 'ability', { icon: '🦎', title: '¡METAMORFOSIS!', text: `${currentAttacker.name} ahora tiene la forma de ${currentDefender.name}`, type: 'ability' })
      setBattleNotification({ id: crypto.randomUUID(), icon: '🦎', title: '¡METAMORFOSIS!', text: `Tokata adopta la forma de ${currentDefender.name}`, type: 'system' })
      setBattleStates(previous => {
        const engineState = { players: Object.fromEntries(Object.entries(previous).map(([id, states]) => [id, { states }])) }
        return Object.fromEntries(Object.entries(endBattleTurn(engineState, currentAttacker.id).players).map(([id, player]) => [id, player.states]))
      })
      setCurrentAttackerId(currentDefender.id)
      setTurn(previousTurn => previousTurn + 1)
      setTimeout(() => setIsProcessingTurn(false), 500)
      return
    }

    let actionName = 'Ataque básico'
    let actionType = 'attack'
    let combatAction = { type: 'basic' }

    if (action === 'defend') {
      actionType = 'defend'
      actionName = 'Defender'
      combatAction = { type: 'defend' }
    } else if (action === 'ultimate') {
      if (currentEnergy < currentUltimateAction.energyCost) return
      actionName = currentUltimateAction.name
      actionType = 'ultimate'
      combatAction = {
        type: 'ultimate',
        ability: currentUltimateAbility,
        attackOptions: {
          multiplier: currentUltimateAction.multiplier,
          energyCost: currentUltimateAction.energyCost,
          guaranteedHit: currentUltimateAction.guaranteedHit,
          criticalBonus: currentUltimateAction.criticalBonus,
          ultimate: true,
          skipDamage: !currentUltimateAction.dealsDamage,
        },
      }
    } else if (action.startsWith('ability-')) {
      const abilityIndex = Number(action.replace('ability-', ''))
      const ability = currentAbilities[abilityIndex]
      const abilityAction = currentAbilityActions[abilityIndex]
      if (!ability || !abilityAction) return
      if (isMetamorphosisAbility(ability)) {
        if (!canUseMetamorphosis({ character: currentAttacker, opponent: currentDefender }) || tokataMetamorphosisCooldown > 0) return
        setIsProcessingTurn(true)
        const transformation = createTokataTransformation(currentDefender)
        setTokataTransformation(transformation)
        setTokataMetamorphosisCooldown(TOKATA_METAMORPHOSIS_COOLDOWN)
        addLog(`🦎 ${currentAttacker.name} utiliza Metamorfosis y adopta la forma de ${currentDefender.name}. Sus habilidades normales han sido copiadas.`, 'ability', { icon: '🦎', title: '¡METAMORFOSIS!', text: `${currentAttacker.name} ahora tiene la forma de ${currentDefender.name}`, type: 'ability' })
        setBattleNotification({ id: crypto.randomUUID(), icon: '🦎', title: '¡METAMORFOSIS!', text: `Tokata adopta la forma de ${currentDefender.name}`, type: 'system' })
        setBattleStates(previous => {
          const engineState = { players: Object.fromEntries(Object.entries(previous).map(([id, states]) => [id, { states }])) }
          return Object.fromEntries(Object.entries(endBattleTurn(engineState, currentAttacker.id).players).map(([id, player]) => [id, player.states]))
        })
        setCurrentAttackerId(currentDefender.id)
        setTurn(previousTurn => previousTurn + 1)
        setTimeout(() => setIsProcessingTurn(false), 500)
        return
      }
      if (currentEnergy < abilityAction.energyCost) return
      actionName = abilityAction.name
      actionType = 'ability'
      combatAction = {
        type: 'ability',
        ability,
        attackOptions: {
          multiplier: abilityAction.multiplier,
          energyCost: abilityAction.energyCost,
          guaranteedHit: abilityAction.guaranteedHit,
          criticalBonus: abilityAction.criticalBonus,
          skipDamage: !abilityAction.dealsDamage,
        },
      }
    }

    setIsProcessingTurn(true)
    if (action === 'ultimate') {
      setUltimateAnimation({ id: crypto.randomUUID(), name: currentAttacker.name, ultimateName: actionName, image: currentAttacker.profile?.ultimateImage || '' })
      await new Promise(resolve => setTimeout(resolve, 1400))
      setUltimateAnimation(null)
    }

    const engineState = {
      players: {
        [currentAttacker.id]: { hp: currentAttackerHp, max_hp: getMaxHp(currentAttacker), energy: currentEnergy, stats: getStats(currentAttacker), defending: defending[currentAttacker.id] || false, states: battleStates[currentAttacker.id] || [] },
        [currentDefender.id]: { hp: hp[currentDefender.id] || 0, max_hp: getMaxHp(currentDefender), energy: energy[currentDefender.id] || 0, stats: getStats(currentDefender), defending: defending[currentDefender.id] || false, states: battleStates[currentDefender.id] || [] },
      },
      combat_events: [],
      event_history: [],
    }

    const result = executeCombatAction(engineState, currentAttacker.id, currentDefender.id, combatAction)
    const attackResult = result.attack || { type: actionType === 'defend' ? 'defend' : 'hit', damage: 0, critical: false, hit: true }
    const engineAttacker = result.state.players[currentAttacker.id]
    const engineDefender = result.state.players[currentDefender.id]
    const newAttackerHp = Math.max(0, Number(engineAttacker?.hp) || 0)
    const newDefenderHp = Math.max(0, Number(engineDefender?.hp) || 0)
    const newEnergy = Math.min(MAX_ENERGY, Number(engineAttacker?.energy) || 0)
    const wasDefending = Boolean(attackResult.defending)

    if (actionType !== 'defend' && attackResult.type !== 'miss') playAttackSound({ attacker: currentAttacker, defenderIsDefending: wasDefending })
    if (actionType !== 'defend') { setCombatEffect(attackResult.type); setTimeout(() => setCombatEffect(null), 550) }

    if (attackResult.type === 'miss') {
      playDodgeSound()
      addLog(attackResult.message || `💨 ${currentDefender.name} esquiva ${actionName} de ${currentAttacker.name}.`, 'miss', { icon: '💨', title: '¡ESQUIVÓ EL ATAQUE!', text: `${currentDefender.name} evitó el ataque de ${currentAttacker.name}`, type: 'miss' })
    } else if (attackResult.type === 'critical') {
      addLog(wasDefending ? `🛡️💥 ¡GOLPE CRÍTICO BLOQUEADO! ${currentAttacker.name} causa ${attackResult.unblockedDamage} de daño a ${currentDefender.name}, pero su defensa lo reduce a ${attackResult.damage}.` : `💥 ¡GOLPE CRÍTICO! ${currentAttacker.name} usa ${actionName} y causa ${attackResult.damage} de daño a ${currentDefender.name}.`, 'critical', { icon: wasDefending ? '🛡️💥' : '💥', title: wasDefending ? '¡DEFENSA CONTRA CRÍTICO!' : '¡GOLPE CRÍTICO!', text: wasDefending ? `${currentDefender.name}: ${attackResult.unblockedDamage} → ${attackResult.damage} de daño` : `${currentDefender.name} recibió ${attackResult.damage} de daño`, type: 'critical' })
    } else if (actionType === 'defend') {
      addLog(`🛡️ ${currentAttacker.name} se prepara para defenderse y reducirá el próximo daño recibido en un 50%.`, 'defend', { icon: '🛡️', title: '¡SE DEFENDIÓ!', text: `${currentAttacker.name} reducirá el próximo daño en un 50%`, type: 'defend' })
    } else {
      const emoji = actionType === 'ultimate' ? '⚡' : actionType === 'ability' ? '✨' : '⚔️'
      const notificationTitle = actionType === 'ultimate' ? '¡TÉCNICA DEFINITIVA!' : actionType === 'ability' ? '¡HABILIDAD!' : '¡ATAQUE!'
      addLog(wasDefending ? `🛡️ ${emoji} ${currentAttacker.name} usa ${actionName} y causa ${attackResult.unblockedDamage} de daño, pero ${currentDefender.name} lo reduce a ${attackResult.damage}.` : `${emoji} ${currentAttacker.name} usa ${actionName} y causa ${attackResult.damage} de daño a ${currentDefender.name}.`, actionType, { icon: wasDefending ? `🛡️${emoji}` : emoji, title: wasDefending ? '¡DEFENSA!' : notificationTitle, text: wasDefending ? `${currentDefender.name}: ${attackResult.unblockedDamage} → ${attackResult.damage} de daño` : `${currentAttacker.name} causó ${attackResult.damage} de daño a ${currentDefender.name}`, type: wasDefending ? 'defend-hit' : actionType })
    }

    if (currentEnergy < MAX_ENERGY && newEnergy >= MAX_ENERGY) playEnergyReadySound()
    setHp(previousHp => ({ ...previousHp, [currentAttacker.id]: newAttackerHp, [currentDefender.id]: newDefenderHp }))
    setEnergy(previousEnergy => ({ ...previousEnergy, [currentAttacker.id]: newEnergy, [currentDefender.id]: Math.min(MAX_ENERGY, Number(engineDefender?.energy) || 0) }))
    setDefending(previousDefending => ({ ...previousDefending, [currentAttacker.id]: Boolean(engineAttacker?.defending), [currentDefender.id]: Boolean(engineDefender?.defending) }))
    setBattleStates(previous => ({ ...previous, [currentAttacker.id]: engineAttacker?.states || [], [currentDefender.id]: engineDefender?.states || [] }))

    if (attackResult.damage > 0) {
      setHpFlash(previous => ({ ...previous, [currentDefender.id]: true }))
      setTimeout(() => setHpFlash(previous => ({ ...previous, [currentDefender.id]: false })), 500)
    }
    if (result.healing > 0 && attackResult.type !== 'miss') {
      addLog(`💚 ${currentAttacker.name} recupera ${result.healing} HP con ${actionName}.`, 'heal', { icon: '💚', title: '¡CURACIÓN!', text: `${currentAttacker.name} recuperó ${result.healing} HP.`, type: 'heal' })
      if (result.healing >= getMaxHp(currentAttacker) - (hp[currentAttacker.id] || 0)) {
        setHealingCharacterId(currentAttacker.id)
        setTimeout(() => setHealingCharacterId(''), 1800)
        playFullHealingSound()
      }
    }

    setBattleStates(previous => {
      const stateForTurnEnd = { ...result.state, players: Object.fromEntries(Object.entries(result.state.players).map(([id, player]) => [id, { states: player.states }])) }
      const previousAttackerStates = battleStates[currentAttacker.id] || []
      const nextAttackerStates = result.state.players[currentAttacker.id]?.states || []
      const refreshedStateTypes = nextAttackerStates
        .filter(state => {
          const previousState = previousAttackerStates.find(item => item?.type === state?.type)
          return !previousState || previousState.turns !== state.turns || previousState.stacks !== state.stacks
        })
        .map(state => state.type)
      const nextStates = Object.fromEntries(Object.entries(
        endBattleTurn(stateForTurnEnd, currentAttacker.id, refreshedStateTypes).players
      ).map(([id, player]) => [id, player.states]))
      return { ...previous, ...nextStates }
    })

    if (newDefenderHp <= 0) { finishBattle(currentAttacker, currentDefender); return }
    if (newAttackerHp <= 0) { finishBattle(currentDefender, currentAttacker); return }

    setCurrentAttackerId(currentDefender.id)
    setTurn(previousTurn => previousTurn + 1)
    if (tokataTransformation && currentAttacker.id === characterAId) setTokataMetamorphosisCooldown(previous => Math.max(0, previous - 1))
    setTimeout(() => setIsProcessingTurn(false), 350)
  }, [
    addLog, battlePhase, battleStarted, battleStates, characterAId, currentAbilities, currentAbilityActions, currentAttacker,
    currentDefender, currentEnergy, currentUltimateAction, defending, energy, finishBattle, hp, isBattleFinished,
    isProcessingTurn, selectedAction, tokataMetamorphosisCooldown, tokataTransformation, turn,
  ])

  useEffect(() => {
    performActionRef.current = performAction
  }, [performAction])

  useEffect(() => {
    if (!battleStarted || isBattleFinished || battlePhase !== 'fighting' || isProcessingTurn || !currentAttacker || !currentDefender) return
    if (currentAttacker.id !== enemyId) return
    const enemyAbilities = getAbilities(currentAttacker)
    const enemyAction = chooseEnemyAction({ attacker: currentAttacker, defender: currentDefender, attackerHp: hp[currentAttacker.id] || 0, defenderHp: hp[currentDefender.id] || 0, attackerMaxHp: getMaxHp(currentAttacker), defenderMaxHp: getMaxHp(currentDefender), attackerEnergy: energy[currentAttacker.id] || 0, defenderEnergy: energy[currentDefender.id] || 0, abilities: enemyAbilities })
    const actionForBattle = enemyAction.type === 'ability' ? `ability-${enemyAction.abilityIndex}` : enemyAction.type
    console.log('🤖 IA decidió:', enemyAction, '→', actionForBattle)
    const cleanup = executeEnemyTurn({
      action: actionForBattle,
      delay: 1000,
      onThinkingStart: () => {
        setIsEnemyThinking(true)
        setBattleNotification({ id: crypto.randomUUID(), icon: '🤖', title: '¡TURNO DEL RIVAL!', text: `${currentAttacker.name} está pensando...`, type: 'system' })
      },
      onExecute: action => { setIsEnemyThinking(false); performActionRef.current?.(action) },
    })
    return cleanup
  }, [battleStarted, isBattleFinished, battlePhase, isProcessingTurn, currentAttacker, currentDefender, enemyId, hp, energy])

  if (characters.length < 2) {
    return <section className="battle-page"><p className="eyebrow">Modo combate</p><h1>La arena necesita <span>rivales.</span></h1><div className="empty-state"><h2>Necesitas al menos dos personajes.</h2><p>Crea dos personajes para poder iniciar un combate.</p></div></section>
  }

  return (
    <section className="battle-page">
      <div className="battle-heading">
        <div><p className="eyebrow">Modo combate</p><h1>⚔️ La <span>arena</span></h1><p>Elige dos personajes y observa cómo se enfrentan turno a turno.</p></div>
        {battleStarted && <button className="button secondary" type="button" onClick={resetBattle}>Nuevo combate</button>}
      </div>

      {!battleStarted ? (
        <div className="battle-setup">
          <div className="battle-selector"><label className="field">Primer combatiente<select value={characterAId} onChange={event => setCharacterAId(event.target.value)}>{characters.map(character => <option value={character.id} key={character.id}>{character.name}</option>)}</select></label></div>
          <div className="battle-vs">VS</div>
          <div className="battle-selector"><label className="field">Segundo combatiente<select value={characterBId} onChange={event => setCharacterBId(event.target.value)}>{characters.map(character => <option value={character.id} key={character.id}>{character.name}</option>)}</select></label></div>
          <button className="button battle-start-button" type="button" disabled={!characterA || !characterB || characterA.id === characterB.id} onClick={startBattle}>⚔️ Comenzar combate</button>
        </div>
      ) : (
        <div className={`battle-arena battle-arena-phase-${battlePhase}`}>
          {ultimateAnimation && <div className="battle-ultimate-overlay" key={ultimateAnimation.id} aria-live="assertive"><div className="battle-ultimate-backdrop" /><div className="battle-ultimate-content"><p className="battle-ultimate-eyebrow">⚡ TÉCNICA DEFINITIVA ⚡</p><h2>{ultimateAnimation.ultimateName}</h2><p className="battle-ultimate-character">{ultimateAnimation.name}</p>{ultimateAnimation.image ? <div className="battle-ultimate-image"><img src={ultimateAnimation.image} alt={ultimateAnimation.ultimateName} /></div> : <div className="battle-ultimate-no-image">⚡</div>}</div></div>}
          {battleNotification && <div className={`battle-notification battle-notification-${battleNotification.type}`} key={battleNotification.id}><div className="battle-notification-icon">{battleNotification.icon}</div><div className="battle-notification-content"><strong>{battleNotification.title}</strong><span>{battleNotification.text}</span></div></div>}
          <div className="battle-round"><span>ROUND {turn}</span>{battlePhase === 'fighting' && <strong>Turno de {currentAttackerDisplay?.name}</strong>}{battlePhase === 'finishing' && <strong>💥 ¡GOLPE FINAL!</strong>}{battlePhase === 'result' && <strong>🏆 ¡COMBATE TERMINADO!</strong>}</div>
          <div className="battle-fighters">
            <BattleCharacterCard character={characterADisplay} isActive={currentAttackerId === characterA.id && battlePhase === 'fighting'} isDefending={defending[characterA.id] || false} hp={hp[characterA.id] || 0} maxHp={getMaxHp(characterA)} energy={energy[characterA.id] || 0} side="left" combatEffect={currentAttackerId === characterA.id ? combatEffect : null} hpFlash={hpFlash[characterA.id] || false} energyPulse={energyPulse[characterA.id] || false} isDefeated={hp[characterA.id] <= 0} isVictorious={winnerId === characterA.id} states={battleStates[characterA.id] || []} healingCharacterId={healingCharacterId} />
            <div className="battle-vs">VS</div>
            <BattleCharacterCard character={characterB} isActive={currentAttackerId === characterB.id && battlePhase === 'fighting'} isDefending={defending[characterB.id] || false} hp={hp[characterB.id] || 0} maxHp={getMaxHp(characterB)} energy={energy[characterB.id] || 0} side="right" combatEffect={currentAttackerId === characterB.id ? combatEffect : null} hpFlash={hpFlash[characterB.id] || false} energyPulse={energyPulse[characterB.id] || false} isDefeated={hp[characterB.id] <= 0} isVictorious={winnerId === characterB.id} states={battleStates[characterB.id] || []} healingCharacterId={healingCharacterId} />
          </div>

          {battlePhase === 'fighting' && <div className={`battle-action-panel ${!isPlayerTurn ? 'is-opponent-turn' : ''}`} key={currentAttackerId}>
            <p className="eyebrow">Acciones de {currentAttackerDisplay?.name}</p>
            {isEnemyThinking && <div className="battle-enemy-thinking">🤖 {currentAttackerDisplay?.name} está pensando...</div>}
            <div className="battle-actions">
              <button className={selectedAction === 'basic' ? 'battle-action active' : 'battle-action'} type="button" disabled={!isPlayerTurn || isEnemyThinking} onClick={() => setSelectedAction('basic')}><strong>⚔️ Ataque</strong><span>Ataque básico</span></button>
              {currentAbilities.map((ability, index) => { const actionId = `ability-${index}`; const metamorphosis = isMetamorphosisAbility(ability); const abilityAction = currentAbilityActions[index]; const disabled = !isPlayerTurn || isEnemyThinking || currentEnergy < (metamorphosis ? 0 : abilityAction.energyCost) || (metamorphosis && tokataMetamorphosisCooldown > 0); return <button className={selectedAction === actionId ? 'battle-action active' : 'battle-action'} type="button" key={ability.id || actionId} disabled={disabled} onClick={() => setSelectedAction(actionId)}><strong>{metamorphosis ? '🦎' : '✨'} {ability.name || `Habilidad ${index + 1}`}</strong><span>{metamorphosis ? (tokataMetamorphosisCooldown > 0 ? `Disponible en ${tokataMetamorphosisCooldown} turnos` : 'Transforma al oponente actual') : `${abilityAction.energyCost} energía`}</span></button> })}
              <button className={`battle-action battle-action-ultimate ${selectedAction === 'ultimate' ? 'active' : ''} ${currentEnergy >= currentUltimateAction.energyCost ? 'is-ready' : ''}`} type="button" disabled={!isPlayerTurn || isEnemyThinking || currentEnergy < currentUltimateAction.energyCost} onClick={() => setSelectedAction('ultimate')}><strong>⚡ {currentUltimateAction.name}</strong><span>{currentEnergy >= currentUltimateAction.energyCost ? '¡LISTA!' : `${Math.round(currentEnergy)}% de energía`}</span></button>
              <button className={selectedAction === 'defend' ? 'battle-action battle-action-defend active' : 'battle-action battle-action-defend'} type="button" disabled={!isPlayerTurn || isEnemyThinking} onClick={() => setSelectedAction('defend')}><strong>🛡️ Defender</strong><span>-50% próximo daño</span></button>
            </div>
            <button className="button battle-attack-button" type="button" disabled={isProcessingTurn || isEnemyThinking || (selectedAction === 'ultimate' && currentEnergy < currentUltimateAction.energyCost) || (selectedAction.startsWith('ability-') && currentAbilityActions[Number(selectedAction.replace('ability-', ''))] && !isMetamorphosisAbility(currentAbilities[Number(selectedAction.replace('ability-', ''))]) && currentEnergy < currentAbilityActions[Number(selectedAction.replace('ability-', ''))].energyCost)} onClick={() => performAction()}>{isProcessingTurn ? '⚔️ Resolviendo...' : selectedAction === 'defend' ? '🛡️ Defender' : selectedAction === 'ultimate' ? '⚡ Usar técnica definitiva' : selectedAction.startsWith('ability-') ? `✨ ${isMetamorphosisAbility(currentAbilities[Number(selectedAction.replace('ability-', ''))]) ? 'Usar Metamorfosis' : 'Usar habilidad'}` : '⚔️ Atacar'}</button>
          </div>}

          {battlePhase === 'result' && (() => {
            const playerStats = getPcBattleStats(battleLog, characterA.name, characterB.name, turn)
            return <BattleResultScreen result={winnerId === playerId ? 'victory' : 'defeat'} character={characterA} stats={playerStats} onBack={resetBattle} />
          })()}

          <div className="battle-log"><div className="battle-log-header"><p className="eyebrow">Registro del combate</p></div>{battleLog.map(entry => <div className={`battle-log-entry battle-log-${entry.type}`} key={entry.id}>{entry.text}</div>)}</div>
        </div>
      )}
    </section>
  )
}

export default BattlePage
