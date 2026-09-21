import { useEffect, useMemo, useRef, useState } from 'react'
import { useCharacters } from '../hooks/useCharacters'
import { chooseEnemyAction } from '../battle/ai/chooseEnemyAction'
import { executeEnemyTurn } from '../battle/ai/executeEnemyTurn'
import BattleResultScreen from '../components/BattleResultScreen'
import {
  applyBattleState,
  consumeEvasion,
  decrementBattleStates,
  getBattleStateInfo,
  processBattleAttack,
  processBattleStateStartOfTurn,
} from '../battle/ai/battleStates'
import { getAbilityBattleEffect } from '../battle/ai/battleAbilityEffects'
import {
  playAttackSound,
  playEnergyReadySound,
  playVictorySound,
  playDodgeSound,
  playLostBattleSound,
  playFullHealingSound,
  playTokataTransformationSound,
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
const DEFENSE_DAMAGE_REDUCTION = 0.5
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

function calculateAttack({ attacker, defender, multiplier = 1, guaranteedHit = false, criticalBonus = 0 }) {
  const attackerStats = getStats(attacker)
  const defenderStats = getStats(defender)
  const accuracy = Math.max(50, Math.min(97, 72 + attackerStats.control * 3 + attackerStats.range - defenderStats.speed * 2))
  const hit = guaranteedHit || Math.random() * 100 <= accuracy
  if (!hit) return { type: 'miss', damage: 0, accuracy, critical: false }

  const baseDamage = 6 + attackerStats.strength * 2 + attackerStats.range * 0.8 + attackerStats.control * 0.5
  const variation = 0.8 + Math.random() * 0.4
  let damage = baseDamage * variation * multiplier
  const criticalChance = Math.min(40, 8 + attackerStats.control * 2 + criticalBonus)
  const critical = Math.random() * 100 < criticalChance
  if (critical) damage *= 1.7
  const defenseReduction = Math.min(0.5, defenderStats.defense * 0.04)
  damage *= 1 - defenseReduction
  damage = Math.max(1, Math.round(damage))
  return { type: critical ? 'critical' : 'hit', damage, accuracy, critical }
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

  useEffect(() => {
    if (characters.length >= 2 && !characterAId && !characterBId) {
      setCharacterAId(characters[0].id)
      setCharacterBId(characters[1].id)
    }
  }, [characters, characterAId, characterBId])

  useEffect(() => {
    if (!currentAttacker || !battleStarted || battlePhase !== 'fighting') return
    setSelectedAction('basic')
  }, [currentAttackerId, battleStarted, currentAttacker, battlePhase])

  useEffect(() => {
    if (!battleNotification) return
    const timeout = setTimeout(() => setBattleNotification(null), 2200)
    return () => clearTimeout(timeout)
  }, [battleNotification])

  useEffect(() => () => {
    if (finishBattleTimeoutRef.current) clearTimeout(finishBattleTimeoutRef.current)
  }, [])

  function addLog(text, type = 'attack', notification = null) {
    setBattleLog(previousLog => [...previousLog, { id: crypto.randomUUID(), type, text }])
    if (notification) setBattleNotification({ id: crypto.randomUUID(), ...notification })
  }

  function finishBattle(winner, loser, reason = '') {
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
  }

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

  async function performAction(actionOverride = null) {
    if (!battleStarted || isBattleFinished || battlePhase !== 'fighting' || isProcessingTurn || !currentAttacker || !currentDefender) return
    const action = actionOverride || selectedAction
    if (typeof action !== 'string') { console.error('⚠️ Acción inválida:', action); return }

    const turnStateKey = `${turn}-${currentAttacker.id}`
    if (processedTurnRef.current !== turnStateKey) {
      processedTurnRef.current = turnStateKey
      const attackerStates = battleStates[currentAttacker.id] || []
      const startOfTurnResult = processBattleStateStartOfTurn(attackerStates, getMaxHp(currentAttacker))
      if (startOfTurnResult.hpChange !== 0) {
        const currentHp = hp[currentAttacker.id] || 0
        const newHp = Math.max(0, currentHp + startOfTurnResult.hpChange)
        setHp(previousHp => ({ ...previousHp, [currentAttacker.id]: newHp }))
        if (startOfTurnResult.hpChange < 0) {
          setHpFlash(previous => ({ ...previous, [currentAttacker.id]: true }))
          setTimeout(() => setHpFlash(previous => ({ ...previous, [currentAttacker.id]: false })), 500)
        }
      }
      startOfTurnResult.messages.forEach(message => addLog(message.text, 'status', { icon: message.type === 'bleeding' ? '🩸' : '⚠️', title: '¡ESTADO!', text: message.text, type: 'status' }))
      const currentHpAfterState = Math.max(0, (hp[currentAttacker.id] || 0) + startOfTurnResult.hpChange)
      if (currentHpAfterState <= 0) {
        finishBattle(
          currentDefender,
          currentAttacker,
          `🏆 ¡${currentDefender.name} gana el combate! ${currentAttacker.name} cayó por efecto de estado.`,
        )
        return
      }
    }

    if (action === 'defend') {
      setIsProcessingTurn(true)
      setDefending(previousDefending => ({ ...previousDefending, [currentAttacker.id]: true }))
      const previousEnergy = currentEnergy
      const newDefendEnergy = Math.min(MAX_ENERGY, previousEnergy + 10)
      if (previousEnergy < MAX_ENERGY && newDefendEnergy >= MAX_ENERGY) playEnergyReadySound()
      setEnergy(previousEnergyState => ({ ...previousEnergyState, [currentAttacker.id]: newDefendEnergy }))
      setEnergyPulse(previous => ({ ...previous, [currentAttacker.id]: true }))
      setTimeout(() => setEnergyPulse(previous => ({ ...previous, [currentAttacker.id]: false })), 600)
      addLog(`🛡️ ${currentAttacker.name} se prepara para defenderse y reducirá el próximo daño recibido en un 50%.`, 'defend', { icon: '🛡️', title: '¡SE DEFENDIÓ!', text: `${currentAttacker.name} reducirá el próximo daño en un 50%`, type: 'defend' })
      setBattleStates(previous => {
        const nextStates = {}
        Object.keys(previous).forEach(id => { nextStates[id] = decrementBattleStates(previous[id] || []) })
        return nextStates
      })
      setCurrentAttackerId(currentDefender.id)
      setTurn(previousTurn => previousTurn + 1)
      if (tokataTransformation && currentAttacker.id === characterAId) {
        setTokataMetamorphosisCooldown(previous => Math.max(0, previous - 1))
      }
      setTimeout(() => setIsProcessingTurn(false), 350)
      return
    }

    let actionName = 'Ataque básico'
    let multiplier = 1
    let energyCost = 0
    let guaranteedHit = false
    let criticalBonus = 0
    let actionType = 'attack'
    let abilityBattleEffect = null
    let ultimateBattleEffect = null

    if (action === 'ultimate') {
      if (currentEnergy < 100) return
      actionName = currentAttacker.profile?.ultimateName || 'Técnica definitiva'
      ultimateBattleEffect = currentAttacker.profile?.ultimateBattleEffect || null
      multiplier = ultimateBattleEffect?.type === 'full_heal_self' ? 0 : 3
      energyCost = 100
      guaranteedHit = true
      criticalBonus = 15
      actionType = 'ultimate'
    } else if (action === 'metamorphosis') {
      if (!canUseMetamorphosis({ character: currentAttacker, opponent: currentDefender }) || tokataMetamorphosisCooldown > 0) return
      setIsProcessingTurn(true)
      const transformation = createTokataTransformation(currentDefender)
      playTokataTransformationSound()
      setTokataTransformation(transformation)
      setTokataMetamorphosisCooldown(TOKATA_METAMORPHOSIS_COOLDOWN)
      addLog(`🦎 ${currentAttacker.name} utiliza Metamorfosis y adopta la forma de ${currentDefender.name}. Sus habilidades normales han sido copiadas.`, 'ability', { icon: '🦎', title: '¡METAMORFOSIS!', text: `${currentAttacker.name} ahora tiene la forma de ${currentDefender.name}`, type: 'ability' })
      setBattleNotification({ id: crypto.randomUUID(), icon: '🦎', title: '¡METAMORFOSIS!', text: `Tokata adopta la forma de ${currentDefender.name}`, type: 'system' })
      setBattleStates(previous => {
        const nextStates = {}
        Object.keys(previous).forEach(id => { nextStates[id] = decrementBattleStates(previous[id] || []) })
        return nextStates
      })
      setCurrentAttackerId(currentDefender.id)
      setTurn(previousTurn => previousTurn + 1)
      setTimeout(() => setIsProcessingTurn(false), 500)
      return
    } else if (action.startsWith('ability-')) {
      const abilityIndex = Number(action.replace('ability-', ''))
      const ability = currentAbilities[abilityIndex]
      if (!ability) return
      if (isMetamorphosisAbility(ability)) {
        if (!canUseMetamorphosis({ character: currentAttacker, opponent: currentDefender }) || tokataMetamorphosisCooldown > 0) return
        setIsProcessingTurn(true)
        const transformation = createTokataTransformation(currentDefender)
        playTokataTransformationSound()
        setTokataTransformation(transformation)
        setTokataMetamorphosisCooldown(TOKATA_METAMORPHOSIS_COOLDOWN)
        addLog(`🦎 ${currentAttacker.name} utiliza Metamorfosis y adopta la forma de ${currentDefender.name}. Sus habilidades normales han sido copiadas.`, 'ability', { icon: '🦎', title: '¡METAMORFOSIS!', text: `${currentAttacker.name} ahora tiene la forma de ${currentDefender.name}`, type: 'ability' })
        setBattleNotification({ id: crypto.randomUUID(), icon: '🦎', title: '¡METAMORFOSIS!', text: `Tokata adopta la forma de ${currentDefender.name}`, type: 'system' })
        setBattleStates(previous => {
          const nextStates = {}
          Object.keys(previous).forEach(id => { nextStates[id] = decrementBattleStates(previous[id] || []) })
          return nextStates
        })
        setCurrentAttackerId(currentDefender.id)
        setTurn(previousTurn => previousTurn + 1)
        setTimeout(() => setIsProcessingTurn(false), 500)
        return
      }
      abilityBattleEffect = getAbilityBattleEffect(ability)
      actionName = ability.name || 'Habilidad'
      energyCost = 25
      if (currentEnergy < energyCost) return
      multiplier = 1.45 + abilityIndex * 0.15
      criticalBonus = 5
      actionType = 'ability'
    }

    setIsProcessingTurn(true)
    if (action === 'ultimate') {
      setUltimateAnimation({ id: crypto.randomUUID(), name: currentAttacker.name, ultimateName: actionName, image: currentAttacker.profile?.ultimateImage || '' })
      await new Promise(resolve => setTimeout(resolve, 1400))
      setUltimateAnimation(null)
    }

    const attackerStates = battleStates[currentAttacker.id] || []
    const defenderStates = battleStates[currentDefender.id] || []
    const baseResult = calculateAttack({ attacker: currentAttacker, defender: currentDefender, multiplier, guaranteedHit, criticalBonus })
    const stateResult = processBattleAttack({ attackerStates, defenderStates, damage: baseResult.damage })
    const result = { ...baseResult, damage: stateResult.damage, type: stateResult.hit ? baseResult.type : 'miss', stateReason: stateResult.reason, stateMessage: stateResult.message }
    const wasDefending = defending[currentDefender.id] || false
    if (result.type !== 'miss') playAttackSound({ attacker: currentAttacker, defenderIsDefending: wasDefending })
    if (stateResult.consumeEvasion) setBattleStates(previous => ({ ...previous, [currentDefender.id]: consumeEvasion(previous[currentDefender.id] || []) }))
    setCombatEffect(result.type)
    setTimeout(() => setCombatEffect(null), 550)
    const newEnergy = Math.max(0, currentEnergy - energyCost + (action === 'ultimate' ? 0 : result.type === 'miss' ? 8 : result.critical ? 18 : 13))
