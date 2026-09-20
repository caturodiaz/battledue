import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import { getBattleStateInfo } from '../battle/ai/battleStates'
import BattleResultScreen from '../components/BattleResultScreen'
import '../styles/OnlineBattle.css'

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

function getMaxHp(character) {
  const stats = character?.profile?.stats || {}
  return 100 + (Number(stats.endurance) || 0) * 10 + (Number(stats.defense) || 0) * 5
}

function getSpeed(character) {
  return Number(character?.profile?.stats?.speed) || 0
}

function getImage(character) {
  return character?.profile?.primaryImage || character?.image || ''
}

function getOnlineBattleStats(battleState, userId) {
  const logs = Array.isArray(battleState?.log) ? battleState.log : []
  const mine = logs.filter(entry => entry?.user_id === userId)
  const opponent = logs.filter(entry => entry?.user_id && entry.user_id !== userId)

  return {
    rounds: Math.max(0, Number(battleState?.round || 1) - 1),
    damageDealt: mine.reduce((total, entry) => total + (Number(entry?.damage) || 0), 0),
    damageReceived: opponent.reduce((total, entry) => total + (Number(entry?.damage) || 0), 0),
    criticalHits: mine.filter(entry => entry?.critical === true).length,
    abilitiesUsed: mine.filter(entry => entry?.type === 'ability' || entry?.type === 'ultimate').length,
    healingDone: mine.filter(entry => entry?.type === 'heal' || /recupera|curaci[oó]n/i.test(entry?.message || entry?.text || '')).length,
  }
}

function OnlineBattleCharacterCard({ character, participant, state, isActive, isMine, side }) {
  const hp = Number(state?.hp || 0)
  const maxHp = Math.max(1, Number(state?.max_hp || getMaxHp(character)))
  const energy = Number(state?.energy || 0)
  const hpPercentage = Math.max(0, Math.min(100, (hp / maxHp) * 100))
  const energyPercentage = Math.max(0, Math.min(100, energy))
  const states = Array.isArray(state?.states) ? state.states : []
  const image = getImage(character)

  return (
    <article className={`battle-character battle-character-${side} ${isActive ? 'is-active' : ''} ${state?.defending ? 'is-defending' : ''} ${hp <= 0 ? 'is-defeated' : ''}`} data-user-id={participant.user_id} data-character-id={state?.character_id || ''} data-ultimate-image={character?.profile?.ultimateImage || ''} data-ultimate-name={character?.profile?.ultimateName || 'Técnica definitiva'}>
      <div className="battle-character-heading">
        <div>
          <p className="battle-side-label">{isMine ? 'VOS' : 'OPONENTE'}</p>
          <h2>{character?.name || 'Personaje'}</h2>
        </div>
        <strong className="battle-hp-value">{Math.ceil(hp)}</strong>
      </div>
      <div className="battle-hp-bar"><div className="battle-hp-fill" style={{ width: `${hpPercentage}%` }} /></div>
      <div className="battle-hp-label"><span>VIDA</span><span>{Math.ceil(hp)} / {Math.ceil(maxHp)}</span></div>
      <div className={`battle-energy ${energy >= 100 ? 'energy-is-full' : ''}`}>
        <div className="battle-energy-header"><span>ENERGÍA</span><span>{Math.round(energy)}%</span></div>
        <div className="battle-energy-bar"><div className="battle-energy-fill" style={{ width: `${energyPercentage}%` }} /></div>
      </div>
      {states.length > 0 && (
        <div className="battle-status-list">
          {getBattleStateInfo(states).map((battleState) => (
            <span className={`battle-status battle-status-${battleState.type}`} key={battleState.type} title={battleState.name}>
              {battleState.icon} {battleState.name}{battleState.stacks > 1 ? ` x${battleState.stacks}` : ''}{battleState.turns ? ` · ${battleState.turns}` : ''}
            </span>
          ))}
        </div>
      )}
      <div className="battle-character-image">
        {isActive && <div className="battle-turn-badge">⚔️ {isMine ? '¡TU TURNO!' : '¡TURNO DEL OPONENTE!'}</div>}
        {state?.defending && <div className="battle-defense-badge">🛡️ DEFENDIENDO</div>}
        {image ? <img src={image} alt={character?.name || 'Personaje'} /> : <div className="battle-character-placeholder">{character?.name?.[0] || '?'}</div>}
      </div>
    </article>
  )
}

export default function OnlineBattlePage() {
  const { user, profile } = useAuth()
  const [code, setCode] = useState('')
  const [room, setRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [characters, setCharacters] = useState([])
  const [battleCharacters, setBattleCharacters] = useState([])
  const [selectedCharacterId, setSelectedCharacterId] = useState(null)
  const [selectedAction, setSelectedAction] = useState('basic')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [xpReward, setXpReward] = useState(null)
  const battleCharactersRef = useRef([])
  const battleCharacterIdsRef = useRef('')
  const rematchResetInFlight = useRef(false)
  const rewardRoomRef = useRef(null)

  useEffect(() => { battleCharactersRef.current = battleCharacters }, [battleCharacters])

  async function loadCharacters() {
    if (!user) return
    const { data: unlocks, error: unlockError } = await supabase.from('character_unlocks').select('character_id').eq('user_id', user.id)
    if (unlockError) { setError(unlockError.message); return }
    const ids = (unlocks || []).map(item => item.character_id)
    if (!ids.length) { setCharacters([]); return }
    const { data, error: charactersError } = await supabase.from('characters').select('id, name, image, profile').in('id', ids).order('name')
    if (charactersError) setError(charactersError.message); else setCharacters(data || [])
  }

  async function loadBattleCharactersFromState(battleState) {
    const players = battleState?.players || {}
    const characterIds = [...new Set(Object.values(players).map(player => player?.character_id).filter(Boolean))]
    if (characterIds.length !== 2) return
    const key = [...characterIds].sort().join('|')
    if (battleCharacterIdsRef.current === key && battleCharactersRef.current.length === 2) return
    const { data, error: charactersError } = await supabase.from('characters').select('id, name, image, profile').in('id', characterIds)
    if (charactersError) { setError(charactersError.message); return }
    const loadedCharacters = data || []
    setBattleCharacters(loadedCharacters)
    battleCharacterIdsRef.current = loadedCharacters.length === 2 ? key : ''
  }

  async function refreshRoom(roomId, { includeParticipants = true } = {}) {
    const { data, error: roomError } = await supabase.from('battle_rooms').select('*').eq('id', roomId).single()
    if (roomError) { setError(roomError.message); return }
    setRoom(data)
    if (data.status === 'active' || data.status === 'finished') await loadBattleCharactersFromState(data.battle_state)
    else if (data.status === 'ready') battleCharacterIdsRef.current = ''
    if (!includeParticipants) return
    const { data: participantData, error: participantsError } = await supabase.from('battle_participants').select('user_id, role, character_id, rematch_status').eq('room_id', roomId)
    if (participantsError) { setError(participantsError.message); return }
    setParticipants(participantData || [])
    const mine = (participantData || []).find(p => p.user_id === user?.id)
    setSelectedCharacterId(mine?.character_id || null)
  }

  useEffect(() => {
    if (!room?.id) return
    let realtimeHealthy = false
    let disposed = false
    let fullRefreshInFlight = false
    refreshRoom(room.id)
    const refreshParticipantsAndCharacters = async () => {
      if (disposed || fullRefreshInFlight) return
      fullRefreshInFlight = true
      try { await refreshRoom(room.id, { includeParticipants: true }) } finally { fullRefreshInFlight = false }
    }
    const channel = supabase.channel(`battle-room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${room.id}` }, payload => {
        if (disposed) return
        if (payload.eventType === 'DELETE') {
          setRoom(null); setParticipants([]); setBattleCharacters([]); battleCharacterIdsRef.current = ''; return
        }
        if (payload.new) {
          setRoom(payload.new)
          if (payload.new.status === 'active' || payload.new.status === 'finished') loadBattleCharactersFromState(payload.new.battle_state)
          if (payload.new.status === 'ready') { setBattleCharacters([]); battleCharacterIdsRef.current = '' }
          if (payload.new.status === 'active' && battleCharactersRef.current.length === 0) refreshParticipantsAndCharacters()
        }
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_participants', filter: `room_id=eq.${room.id}` }, () => {
        if (!disposed) refreshParticipantsAndCharacters()
      })
      .subscribe((status, subscriptionError) => {
        realtimeHealthy = status === 'SUBSCRIBED'
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') console.warn('Supabase Realtime no disponible para la sala:', subscriptionError)
      })
    const fallbackPoll = window.setInterval(() => {
      if (!disposed && !realtimeHealthy) refreshRoom(room.id, { includeParticipants: false })
    }, 10000)
    return () => { disposed = true; window.clearInterval(fallbackPoll); supabase.removeChannel(channel) }
  }, [room?.id])

  useEffect(() => { if (room?.status === 'ready') loadCharacters() }, [room?.status, user?.id])

  useEffect(() => {
    const isFinished = room?.status === 'finished' || room?.battle_state?.status === 'finished' || Boolean(room?.battle_state?.winner_user_id)
    if (!room?.id || !user?.id || !isFinished || rewardRoomRef.current === room.id) return
    rewardRoomRef.current = room.id
    let cancelled = false
    async function awardOnlineXp() {
      const { data, error: rewardError } = await supabase.rpc('award_online_battle_xp', { p_room_id: room.id })
      if (cancelled) return
      if (rewardError) {
        setError(rewardError.message)
        return
      }
      const reward = Array.isArray(data) ? data[0] : data
      setXpReward(reward || null)
    }
    awardOnlineXp()
    return () => { cancelled = true }
  }, [room?.id, room?.status, room?.battle_state?.status, room?.battle_state?.winner_user_id, user?.id])

  async function createRoom() {
    setLoading(true); setError(''); setXpReward(null); rewardRoomRef.current = null
    const roomCode = makeRoomCode()
    const { data, error: insertError } = await supabase.from('battle_rooms').insert({ code: roomCode, host_user_id: user.id, status: 'waiting' }).select().single()
    if (insertError) { setError(insertError.message); setLoading(false); return }
    const { error: participantError } = await supabase.from('battle_participants').insert({ room_id: data.id, user_id: user.id, role: 'host', rematch_status: 'pending' })
    if (participantError) {
      setError(participantError.message); await supabase.from('battle_rooms').delete().eq('id', data.id)
    } else {
      setRoom(data); setParticipants([{ user_id: user.id, role: 'host', character_id: null, rematch_status: 'pending' }])
    }
    setLoading(false)
  }

  async function joinRoom() {
    setLoading(true); setError(''); setXpReward(null); rewardRoomRef.current = null
    const normalized = code.trim().toUpperCase()
    const { data, error: findError } = await supabase.from('battle_rooms').select('*').eq('code', normalized).eq('status', 'waiting').maybeSingle()
    if (findError || !data) { setError(findError?.message || 'No encontramos una sala disponible con ese código.'); setLoading(false); return }
    if (data.host_user_id === user.id) { setError('No podés unirte a tu propia sala.'); setLoading(false); return }
    const { count } = await supabase.from('battle_participants').select('*', { count: 'exact', head: true }).eq('room_id', data.id)
    if ((count || 0) >= 2) { setError('Esta sala ya tiene dos jugadores.'); setLoading(false); return }
    const { error: joinError } = await supabase.from('battle_participants').insert({ room_id: data.id, user_id: user.id, role: 'guest', rematch_status: 'pending' })
    if (joinError) setError(joinError.message)
    else {
      const { data: updated, error: updateError } = await supabase.from('battle_rooms').update({ status: 'ready' }).eq('id', data.id).eq('status', 'waiting').select().single()
      if (updateError) setError(updateError.message); else { setRoom(updated || data); await refreshRoom(data.id) }
    }
    setLoading(false)
  }

  async function selectCharacter(characterId) {
    if (!room?.id || !user || loading || room.status !== 'ready') return
    setLoading(true); setError('')
    const { error: updateError } = await supabase.from('battle_participants').update({ character_id: characterId }).eq('room_id', room.id).eq('user_id', user.id)
    if (updateError) setError(updateError.message); else setSelectedCharacterId(characterId)
    setLoading(false)
  }

  async function startOnlineBattle() {
    if (!room || room.status !== 'ready' || room.host_user_id !== user?.id || !host?.character_id || !guest?.character_id) return
    setLoading(true); setError('')
    const { data: selectedCharacters, error: charactersError } = await supabase.from('characters').select('id, name, image, profile').in('id', [host.character_id, guest.character_id])
    if (charactersError) { setError(charactersError.message); setLoading(false); return }
    const hostCharacter = selectedCharacters.find(c => c.id === host.character_id)
    const guestCharacter = selectedCharacters.find(c => c.id === guest.character_id)
    const hostHp = getMaxHp(hostCharacter)
    const guestHp = getMaxHp(guestCharacter)
    const firstUserId = getSpeed(hostCharacter) >= getSpeed(guestCharacter) ? host.user_id : guest.user_id
    const battleState = {
      version: 1, round: 1, turn_user_id: firstUserId,
      players: {
        [host.user_id]: { user_id: host.user_id, role: 'host', character_id: host.character_id, hp: hostHp, max_hp: hostHp, energy: 0, defending: false, states: [] },
        [guest.user_id]: { user_id: guest.user_id, role: 'guest', character_id: guest.character_id, hp: guestHp, max_hp: guestHp, energy: 0, defending: false, states: [] },
      },
      winner_user_id: null, status: 'active', log: [],
    }
    const { data, error: updateError } = await supabase.from('battle_rooms').update({ status: 'active', host_character_id: host.character_id, guest_character_id: guest.character_id, battle_state: battleState }).eq('id', room.id).eq('status', 'ready').select().single()
    if (updateError) setError(updateError.message); else setRoom(data)
    setLoading(false)
  }

  async function performOnlineAction(action = selectedAction) {
    if (!room?.id || room.status !== 'active' || room.battle_state?.turn_user_id !== user?.id || loading) return
    setLoading(true); setError('')
    let rpcAction = action
    let abilityIndex = null
    if (action.startsWith('ability-')) { abilityIndex = Number(action.replace('ability-', '')); rpcAction = `ability-${abilityIndex}` }
    const { data, error: actionError } = await supabase.rpc('process_online_battle_action', { p_room_id: room.id, p_action: rpcAction, p_ability_index: abilityIndex })
    if (actionError) setError(actionError.message); else setRoom(previous => ({ ...previous, battle_state: data, status: data?.status === 'finished' ? 'finished' : 'active' }))
    setSelectedAction('basic'); setLoading(false)
  }

  async function requestRematch() {
    if (!room?.id || !user?.id || loading || room.status !== 'finished') return
    setLoading(true); setError('')
    const { error: rematchError } = await supabase.from('battle_participants').update({ rematch_status: 'accepted' }).eq('room_id', room.id).eq('user_id', user.id)
    if (rematchError) setError(rematchError.message)
    setLoading(false)
  }

  async function declineRematch() {
    if (!room?.id || !user?.id || loading || room.status !== 'finished') return
    setLoading(true); setError('')
    const { error: rematchError } = await supabase.from('battle_participants').update({ rematch_status: 'declined' }).eq('room_id', room.id).eq('user_id', user.id)
    if (rematchError) setError(rematchError.message)
    setLoading(false)
  }

  async function resetForRematch() {
    if (!room?.id || loading || rematchResetInFlight.current) return
    if (room.host_user_id !== user?.id || host?.rematch_status !== 'accepted' || guest?.rematch_status !== 'accepted') return
    rematchResetInFlight.current = true
    setLoading(true); setError('')
    const { error: participantsError } = await supabase.from('battle_participants').update({ character_id: null, rematch_status: 'pending' }).eq('room_id', room.id)
    if (participantsError) {
      setError(participantsError.message); setLoading(false); rematchResetInFlight.current = false; return
    }
    const { data, error: roomError } = await supabase.from('battle_rooms').update({ status: 'ready', host_character_id: null, guest_character_id: null, battle_state: null }).eq('id', room.id).eq('status', 'finished').select().single()
    if (roomError) {
      setError(roomError.message); setLoading(false); rematchResetInFlight.current = false; return
    }
    setRoom(data); setParticipants(previous => previous.map(participant => ({ ...participant, character_id: null, rematch_status: 'pending' })))
    setBattleCharacters([]); battleCharacterIdsRef.current = ''; setSelectedCharacterId(null); setSelectedAction('basic'); setXpReward(null); rewardRoomRef.current = null; setLoading(false); rematchResetInFlight.current = false
  }

  const host = participants.find(p => p.role === 'host')
  const guest = participants.find(p => p.role === 'guest')
  const myName = profile?.display_name || user?.email?.split('@')[0] || 'Vos'
  const hostName = host?.user_id === user?.id ? myName : 'Jugador'
  const guestName = guest?.user_id === user?.id ? myName : (guest ? 'Jugador' : 'Esperando...')
  const bothSelected = Boolean(host?.character_id && guest?.character_id)
  const selectedCharacter = useMemo(() => characters.find(character => character.id === selectedCharacterId), [characters, selectedCharacterId])
  const battleState = room?.battle_state || null
  const myBattlePlayer = battleState?.players?.[user?.id] || null
  const myBattleCharacter = myBattlePlayer ? battleCharacters.find(c => c.id === myBattlePlayer.character_id) : null
  const isMyTurn = battleState?.turn_user_id === user?.id && battleState?.status !== 'finished' && room?.status !== 'finished'
  const myAbilities = Array.isArray(myBattleCharacter?.profile?.abilities) ? myBattleCharacter.profile.abilities : []
  const currentEnergy = Number(myBattlePlayer?.energy || 0)
  const isFinished = room?.status === 'finished' || battleState?.status === 'finished' || Boolean(battleState?.winner_user_id)
  const turnParticipant = participants.find(p => p.user_id === battleState?.turn_user_id)
  const turnCharacter = turnParticipant ? battleCharacters.find(c => c.id === battleState?.players?.[turnParticipant.user_id]?.character_id) : null

  useEffect(() => {
    if (!room?.id || room.status !== 'finished' || !host || !guest) return
    if (host.rematch_status === 'accepted' && guest.rematch_status === 'accepted' && room.host_user_id === user?.id) resetForRematch()
  }, [room?.id, room?.status, host?.rematch_status, guest?.rematch_status, user?.id])

  if (room?.status === 'active' || room?.status === 'finished') {
    const didWin = Boolean(battleState?.winner_user_id) && battleState.winner_user_id === user?.id
    const myRematchStatus = participants.find(p => p.user_id === user?.id)?.rematch_status || 'pending'
    const opponent = participants.find(p => p.user_id !== user?.id)
    const opponentRematchStatus = opponent?.rematch_status || 'pending'

    if (isFinished) {
      const stats = getOnlineBattleStats(battleState, user?.id)
      const unlockedId = xpReward?.unlocked_character_ids?.[0]
      const unlockedCharacter = unlockedId ? characters.find(character => character.id === unlockedId) || battleCharacters.find(character => character.id === unlockedId) : null
      return (
        <section className="battle-page online-battle-page">
          <BattleResultScreen
            result={didWin ? 'victory' : 'defeat'}
            character={myBattleCharacter}
            xpEarned={xpReward?.experience_gained || 0}
            currentLevel={xpReward?.new_level || 1}
            previousLevel={xpReward?.previous_level || xpReward?.new_level || 1}
            leveledUp={Boolean(xpReward?.leveled_up)}
            unlockedCharacter={unlockedCharacter}
            stats={stats}
            isOnline
            rematchStatus={myRematchStatus}
            opponentRematchStatus={opponentRematchStatus}
            rematchLoading={loading}
            onRequestRematch={requestRematch}
            onDeclineRematch={declineRematch}
            onBack={() => { setRoom(null); setXpReward(null); rewardRoomRef.current = null }}
          />
        </section>
      )
    }

    return (
      <section className="battle-page online-battle-page">
        <div className="battle-heading">
          <div><p className="eyebrow">Combate online</p><h1>⚔️ La <span>arena</span></h1><p>Las acciones se sincronizan entre los dos jugadores.</p></div>
          <button className="button secondary" type="button" onClick={() => setRoom(null)}>Salir</button>
        </div>
        <div className="battle-arena online-arena">
          <div className="battle-round"><span>ROUND {battleState?.round || 1}</span><strong>{`Turno de ${turnCharacter?.name || (isMyTurn ? 'vos' : 'tu oponente')}`}</strong></div>
          <div className="battle-fighters">
            {host && <OnlineBattleCharacterCard participant={host} state={battleState?.players?.[host.user_id] || {}} character={battleCharacters.find(c => c.id === battleState?.players?.[host.user_id]?.character_id)} side="left" isMine={host.user_id === user?.id} isActive={host.user_id === battleState?.turn_user_id} />}
            <div className="battle-vs">VS</div>
            {guest && <OnlineBattleCharacterCard participant={guest} state={battleState?.players?.[guest.user_id] || {}} character={battleCharacters.find(c => c.id === battleState?.players?.[guest.user_id]?.character_id)} side="right" isMine={guest.user_id === user?.id} isActive={guest.user_id === battleState?.turn_user_id} />}
          </div>
          <div className={`battle-action-panel ${!isMyTurn ? 'is-opponent-turn' : ''}`} key={battleState?.turn_user_id}>
            <p className="eyebrow">Acciones de {myBattleCharacter?.name || 'tu personaje'}</p>
            <div className="battle-actions">
              <button className={selectedAction === 'basic' ? 'battle-action active' : 'battle-action'} disabled={!isMyTurn || loading} onClick={() => setSelectedAction('basic')} type="button"><strong>⚔️ Ataque</strong><span>Ataque básico</span></button>
              {myAbilities.map((ability, index) => {
                const actionId = `ability-${index}`
                return <button key={ability.id || actionId} className={selectedAction === actionId ? 'battle-action active' : 'battle-action'} disabled={!isMyTurn || loading || currentEnergy < 25} onClick={() => setSelectedAction(actionId)} type="button"><strong>✨ {ability.name || `Habilidad ${index + 1}`}</strong><span>25 energía</span></button>
              })}
              <button className={`battle-action battle-action-ultimate ${selectedAction === 'ultimate' ? 'active' : ''} ${currentEnergy >= 100 ? 'is-ready' : ''}`} disabled={!isMyTurn || loading || currentEnergy < 100} onClick={() => setSelectedAction('ultimate')} type="button"><strong>⚡ {myBattleCharacter?.profile?.ultimateName || 'Técnica definitiva'}</strong><span>{currentEnergy >= 100 ? '¡LISTA!' : `${Math.round(currentEnergy)}% de energía`}</span></button>
              <button className={selectedAction === 'defend' ? 'battle-action battle-action-defend active' : 'battle-action battle-action-defend'} disabled={!isMyTurn || loading} onClick={() => setSelectedAction('defend')} type="button"><strong>🛡️ Defender</strong><span>-50% próximo daño</span></button>
            </div>
            <button className="button battle-attack-button" disabled={!isMyTurn || loading} onClick={() => performOnlineAction()} type="button">{loading ? '⚔️ Resolviendo...' : selectedAction === 'defend' ? '🛡️ Defender' : selectedAction === 'ultimate' ? '⚡ Usar técnica definitiva' : selectedAction.startsWith('ability-') ? '✨ Usar habilidad' : '⚔️ Atacar'}</button>
          </div>
          <div className="battle-log online-log">
            <div className="battle-log-header"><p className="eyebrow">Registro del combate</p></div>
            {(battleState?.log || []).slice().reverse().map(entry => <div className={`battle-log-entry battle-log-${entry.type || 'attack'}`} data-log-id={entry.id || ''} data-log-type={entry.type || 'attack'} data-actor-user-id={entry.user_id || ''} key={entry.id}>{entry.message || entry.text}</div>)}
          </div>
        </div>
      </section>
    )
  }

  return (
    <main className="online-battle">
      <header><p className="eyebrow">BATALLAS ONLINE</p><h1>Desafiar a otro jugador</h1><p>Creá una sala o unite con un código.</p></header>
      {!room && <section className="online-battle__actions"><button onClick={createRoom} disabled={loading}>⚔️ CREAR SALA</button><div className="join-card"><h2>UNIRSE A UNA SALA</h2><input value={code} onChange={event => setCode(event.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO" /><button onClick={joinRoom} disabled={loading || code.length < 5}>ENTRAR</button></div></section>}
      {error && <p className="online-battle__error">{error}</p>}
      {room && <section className="battle-room panel">
        <div className="room-code"><span>CÓDIGO DE SALA</span><strong>{room.code}</strong></div>
        <div className="room-status"><span>ESTADO</span><strong>{room.status === 'ready' ? 'SELECCIÓN DE PERSONAJE' : 'ESPERANDO AL OPONENTE...'}</strong></div>
        <div className="players"><article><span>HOST</span><strong>{hostName}</strong>{host?.character_id && <small>✓ Personaje elegido</small>}</article><div>VS</div><article><span>OPONENTE</span><strong>{guestName}</strong>{guest?.character_id && <small>✓ Personaje elegido</small>}</article></div>
        {room.status === 'ready' && <div className="character-select"><div className="character-select__heading"><div><p className="eyebrow">TU COLECCIÓN</p><h2>Elegí tu personaje</h2></div><span>{selectedCharacter ? `Elegido: ${selectedCharacter.name}` : 'Ninguno elegido'}</span></div><div className="character-grid">{characters.map(character => { const image = getImage(character); const selected = character.id === selectedCharacterId; return <button key={character.id} className={`character-card ${selected ? 'is-selected' : ''}`} onClick={() => selectCharacter(character.id)} disabled={loading} type="button">{image ? <img src={image} alt={character.name} /> : <div className="character-card__fallback">{character.name.charAt(0)}</div>}<strong>{character.name}</strong>{selected && <span>✓ ELEGIDO</span>}</button> })}</div><div className="selection-status">{bothSelected ? '✓ Ambos jugadores eligieron personaje' : 'Esperando la elección del otro jugador...'}</div></div>}
        {bothSelected && <button className="start-button" onClick={startOnlineBattle} disabled={loading || user?.id !== room.host_user_id} type="button">{user?.id === room.host_user_id ? 'COMENZAR BATALLA' : 'ESPERANDO AL HOST...'}</button>}
      </section>}
    </main>
  )
}
