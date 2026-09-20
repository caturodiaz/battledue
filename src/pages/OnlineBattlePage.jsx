import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
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
  const battleCharactersRef = useRef([])
  const battleCharacterIdsRef = useRef('')

  useEffect(() => {
    battleCharactersRef.current = battleCharacters
  }, [battleCharacters])

  async function loadCharacters() {
    if (!user) return
    const { data: unlocks, error: unlockError } = await supabase
      .from('character_unlocks')
      .select('character_id')
      .eq('user_id', user.id)
    if (unlockError) { setError(unlockError.message); return }
    const ids = (unlocks || []).map(item => item.character_id)
    if (!ids.length) { setCharacters([]); return }
    const { data, error: charactersError } = await supabase
      .from('characters')
      .select('id, name, image, profile')
      .in('id', ids)
      .order('name')
    if (charactersError) setError(charactersError.message)
    else setCharacters(data || [])
  }

  async function loadBattleCharactersFromState(battleState) {
    const players = battleState?.players || {}
    const characterIds = [...new Set(
      Object.values(players)
        .map(player => player?.character_id)
        .filter(Boolean)
    )]

    if (characterIds.length !== 2) return

    const key = [...characterIds].sort().join('|')
    if (battleCharacterIdsRef.current === key && battleCharactersRef.current.length === 2) return

    const { data, error: charactersError } = await supabase
      .from('characters')
      .select('id, name, image, profile')
      .in('id', characterIds)

    if (charactersError) {
      setError(charactersError.message)
      return
    }

    const loadedCharacters = data || []
    setBattleCharacters(loadedCharacters)
    battleCharacterIdsRef.current = loadedCharacters.length === 2 ? key : ''
  }

  async function refreshRoom(roomId, { includeParticipants = true } = {}) {
    const { data, error: roomError } = await supabase
      .from('battle_rooms')
      .select('*')
      .eq('id', roomId)
      .single()
    if (roomError) { setError(roomError.message); return }
    setRoom(data)

    if (data.status === 'active' || data.status === 'finished') {
      await loadBattleCharactersFromState(data.battle_state)
    } else if (data.status === 'ready') {
      battleCharacterIdsRef.current = ''
    }

    if (!includeParticipants) return

    const { data: participantData, error: participantsError } = await supabase
      .from('battle_participants')
      .select('user_id, role, character_id')
      .eq('room_id', roomId)
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
      try {
        await refreshRoom(room.id, { includeParticipants: true })
      } finally {
        fullRefreshInFlight = false
      }
    }

    const channel = supabase.channel(`battle-room-${room.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_rooms',
        filter: `id=eq.${room.id}`,
      }, payload => {
        if (disposed) return

        if (payload.eventType === 'DELETE') {
          setRoom(null)
          setParticipants([])
          setBattleCharacters([])
          battleCharacterIdsRef.current = ''
          return
        }

        if (payload.new) {
          setRoom(payload.new)

          if (payload.new.status === 'active' || payload.new.status === 'finished') {
            loadBattleCharactersFromState(payload.new.battle_state)
          }

          if (payload.new.status === 'ready') {
            setBattleCharacters([])
            battleCharacterIdsRef.current = ''
          }

          if (payload.new.status === 'active' && battleCharactersRef.current.length === 0) {
            refreshParticipantsAndCharacters()
          }
        }
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'battle_participants',
        filter: `room_id=eq.${room.id}`,
      }, () => {
        if (!disposed) refreshParticipantsAndCharacters()
      })
      .subscribe((status, subscriptionError) => {
        realtimeHealthy = status === 'SUBSCRIBED'

        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
          console.warn('Supabase Realtime no disponible para la sala:', subscriptionError)
        }
      })

    const fallbackPoll = window.setInterval(() => {
      if (!disposed && !realtimeHealthy) refreshRoom(room.id, { includeParticipants: false })
    }, 10000)

    return () => {
      disposed = true
      window.clearInterval(fallbackPoll)
      supabase.removeChannel(channel)
    }
  }, [room?.id])

  useEffect(() => {
    if (room?.status === 'ready') loadCharacters()
  }, [room?.status, user?.id])

  async function createRoom() {
    setLoading(true); setError('')
    const roomCode = makeRoomCode()
    const { data, error: insertError } = await supabase
      .from('battle_rooms')
      .insert({ code: roomCode, host_user_id: user.id, status: 'waiting' })
      .select()
      .single()
    if (insertError) { setError(insertError.message); setLoading(false); return }
    const { error: participantError } = await supabase
      .from('battle_participants')
      .insert({ room_id: data.id, user_id: user.id, role: 'host' })
    if (participantError) {
      setError(participantError.message)
      await supabase.from('battle_rooms').delete().eq('id', data.id)
    } else {
      setRoom(data)
      setParticipants([{ user_id: user.id, role: 'host', character_id: null }])
    }
    setLoading(false)
  }

  async function joinRoom() {
    setLoading(true); setError('')
    const normalized = code.trim().toUpperCase()
    const { data, error: findError } = await supabase
      .from('battle_rooms')
      .select('*')
      .eq('code', normalized)
      .eq('status', 'waiting')
      .maybeSingle()
    if (findError || !data) { setError(findError?.message || 'No encontramos una sala disponible con ese código.'); setLoading(false); return }
    if (data.host_user_id === user.id) { setError('No podés unirte a tu propia sala.'); setLoading(false); return }
    const { count } = await supabase
      .from('battle_participants')
      .select('*', { count: 'exact', head: true })
      .eq('room_id', data.id)
    if ((count || 0) >= 2) { setError('Esta sala ya tiene dos jugadores.'); setLoading(false); return }
    const { error: joinError } = await supabase
      .from('battle_participants')
      .insert({ room_id: data.id, user_id: user.id, role: 'guest' })
    if (joinError) setError(joinError.message)
    else {
      const { data: updated, error: updateError } = await supabase
        .from('battle_rooms')
        .update({ status: 'ready' })
        .eq('id', data.id)
        .eq('status', 'waiting')
        .select()
        .single()
      if (updateError) setError(updateError.message)
      else { setRoom(updated || data); await refreshRoom(data.id) }
    }
    setLoading(false)
  }

  async function selectCharacter(characterId) {
    if (!room?.id || !user || loading || room.status !== 'ready') return
    setLoading(true); setError('')
    const { error: updateError } = await supabase
      .from('battle_participants')
      .update({ character_id: characterId })
      .eq('room_id', room.id)
      .eq('user_id', user.id)
    if (updateError) setError(updateError.message)
    else setSelectedCharacterId(characterId)
    setLoading(false)
  }

  async function startOnlineBattle() {
    if (!room || room.status !== 'ready' || room.host_user_id !== user?.id || !host?.character_id || !guest?.character_id) return
    setLoading(true); setError('')
    const { data: selectedCharacters, error: charactersError } = await supabase
      .from('characters')
      .select('id, name, image, profile')
      .in('id', [host.character_id, guest.character_id])
    if (charactersError) { setError(charactersError.message); setLoading(false); return }

    const hostCharacter = selectedCharacters.find(c => c.id === host.character_id)
    const guestCharacter = selectedCharacters.find(c => c.id === guest.character_id)
    const hostHp = getMaxHp(hostCharacter)
    const guestHp = getMaxHp(guestCharacter)
    const firstUserId = getSpeed(hostCharacter) >= getSpeed(guestCharacter) ? host.user_id : guest.user_id

    const battleState = {
      version: 1,
      round: 1,
      turn_user_id: firstUserId,
      players: {
        [host.user_id]: { user_id: host.user_id, role: 'host', character_id: host.character_id, hp: hostHp, max_hp: hostHp, energy: 0, defending: false, states: [] },
        [guest.user_id]: { user_id: guest.user_id, role: 'guest', character_id: guest.character_id, hp: guestHp, max_hp: guestHp, energy: 0, defending: false, states: [] },
      },
      winner_user_id: null,
      status: 'active',
      log: [],
    }

    const { data, error: updateError } = await supabase
      .from('battle_rooms')
      .update({ status: 'active', host_character_id: host.character_id, guest_character_id: guest.character_id, battle_state: battleState })
      .eq('id', room.id)
      .eq('status', 'ready')
      .select()
      .single()

    if (updateError) setError(updateError.message)
    else setRoom(data)
    setLoading(false)
  }

  async function performOnlineAction(action = selectedAction) {
    if (!room?.id || room.status !== 'active' || room.battle_state?.turn_user_id !== user?.id || loading) return
    setLoading(true); setError('')
    let rpcAction = action
    let abilityIndex = null
    if (action.startsWith('ability-')) {
      abilityIndex = Number(action.replace('ability-', ''))
      rpcAction = `ability-${abilityIndex}`
    }
    const { data, error: actionError } = await supabase.rpc('process_online_battle_action', {
      p_room_id: room.id,
      p_action: rpcAction,
      p_ability_index: abilityIndex,
    })
    if (actionError) setError(actionError.message)
    else setRoom(previous => ({ ...previous, battle_state: data, status: data?.status === 'finished' ? 'finished' : 'active' }))
    setSelectedAction('basic')
    setLoading(false)
  }

  async function startAnotherBattle() {
    if (!room?.id || loading) return

    setLoading(true)
    setError('')

    const { error: participantsError } = await supabase
      .from('battle_participants')
      .update({ character_id: null })
      .eq('room_id', room.id)

    if (participantsError) {
      setError(participantsError.message)
      setLoading(false)
      return
    }

    const { data, error: roomError } = await supabase
      .from('battle_rooms')
      .update({
        status: 'ready',
        host_character_id: null,
        guest_character_id: null,
        battle_state: null,
      })
      .eq('id', room.id)
      .eq('status', 'finished')
      .select()
      .single()

    if (roomError) {
      setError(roomError.message)
      setLoading(false)
      return
    }

    setRoom(data)
    setParticipants(previous => previous.map(participant => ({ ...participant, character_id: null })))
    setBattleCharacters([])
    battleCharacterIdsRef.current = ''
    setSelectedCharacterId(null)
    setSelectedAction('basic')
    setLoading(false)
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
  const opponentParticipant = participants.find(p => p.user_id !== user?.id)
  const opponentBattlePlayer = opponentParticipant ? battleState?.players?.[opponentParticipant.user_id] : null
  const myBattleCharacter = myBattlePlayer ? battleCharacters.find(c => c.id === myBattlePlayer.character_id) : null
  const isMyTurn = battleState?.turn_user_id === user?.id && battleState?.status !== 'finished' && room?.status !== 'finished'
  const myAbilities = Array.isArray(myBattleCharacter?.profile?.abilities) ? myBattleCharacter.profile.abilities : []
  const currentEnergy = Number(myBattlePlayer?.energy || 0)
  const isFinished = room?.status === 'finished' || battleState?.status === 'finished' || Boolean(battleState?.winner_user_id)

  if (room?.status === 'active' || room?.status === 'finished') {
    const renderFighter = (participant) => {
      const state = battleState?.players?.[participant.user_id] || {}
      const character = battleCharacters.find(c => c.id === state.character_id)
      const hpPercent = Math.max(0, Math.min(100, (Number(state.hp || 0) / Math.max(1, Number(state.max_hp || 1))) * 100))
      return (
        <article className={`online-fighter ${participant.user_id === user?.id ? 'is-mine' : ''} ${state.hp <= 0 ? 'is-defeated' : ''}`} data-user-id={participant.user_id} data-character-id={state.character_id || ''} key={participant.user_id}>
          <span>{participant.user_id === user?.id ? 'VOS' : 'OPONENTE'}</span>
          {getImage(character) ? <img src={getImage(character)} alt={character?.name || 'Personaje'} /> : null}
          <strong>{character?.name || 'Personaje'}</strong>
          <div className="online-battle__hp"><div style={{ width: `${hpPercent}%` }} /></div>
          <small>{Math.ceil(state.hp || 0)} / {state.max_hp || 0} HP</small>
          <small>⚡ {Math.round(state.energy || 0)}% energía</small>
          {state.defending && <em>🛡️ DEFENDIENDO</em>}
        </article>
      )
    }

    const winnerParticipant = participants.find(p => p.user_id === battleState?.winner_user_id)
    const winnerCharacter = winnerParticipant ? battleCharacters.find(c => c.id === battleState?.players?.[winnerParticipant.user_id]?.character_id) : null
    const didWin = Boolean(battleState?.winner_user_id) && battleState.winner_user_id === user?.id
    const didDraw = isFinished && !battleState?.winner_user_id

    return <main className="online-battle">
      <header><p className="eyebrow">COMBATE ONLINE</p><h1>{isFinished ? 'Combate terminado' : 'La batalla comenzó'}</h1><p>{isFinished ? (didDraw ? 'El combate terminó sin un ganador.' : `Ganador: ${winnerCharacter?.name || 'Jugador'}`) : 'Las acciones se sincronizan entre los dos jugadores.'}</p></header>
      <section className="battle-room online-arena">
        <div className="online-fighters">{participants.map(renderFighter)}</div>
        <div className="room-status"><span>{isFinished ? 'RESULTADO' : `ROUND ${battleState?.round || 1}`}</span><strong>{isFinished ? '🏆 COMBATE TERMINADO' : isMyTurn ? '⚔️ TU TURNO' : '⌛ TURNO DEL OPONENTE'}</strong></div>

        {!isFinished && (
          <div className={`online-actions ${!isMyTurn ? 'is-disabled' : ''}`}>
            <p className="eyebrow">ACCIONES DE {myBattleCharacter?.name || 'TU PERSONAJE'}</p>
            <div className="online-action-grid">
              <button className={selectedAction === 'basic' ? 'is-selected' : ''} disabled={!isMyTurn || loading} onClick={() => setSelectedAction('basic')} type="button"><strong>⚔️ Ataque</strong><span>Ataque básico</span></button>
              {myAbilities.map((ability, index) => {
                const id = `ability-${index}`
                return <button key={ability.id || id} className={selectedAction === id ? 'is-selected' : ''} disabled={!isMyTurn || loading || currentEnergy < 25} onClick={() => setSelectedAction(id)} type="button"><strong>✨ {ability.name || `Habilidad ${index + 1}`}</strong><span>25 energía</span></button>
              })}
              <button className={`ultimate ${selectedAction === 'ultimate' ? 'is-selected' : ''}`} disabled={!isMyTurn || loading || currentEnergy < 100} onClick={() => setSelectedAction('ultimate')} type="button"><strong>⚡ {myBattleCharacter?.profile?.ultimateName || 'Técnica definitiva'}</strong><span>{currentEnergy >= 100 ? '¡LISTA!' : `${Math.round(currentEnergy)}% de energía`}</span></button>
              <button className={`defend ${selectedAction === 'defend' ? 'is-selected' : ''}`} disabled={!isMyTurn || loading} onClick={() => setSelectedAction('defend')} type="button"><strong>🛡️ Defender</strong><span>-50% próximo daño</span></button>
            </div>
            <button className="start-button online-execute-button" disabled={!isMyTurn || loading} onClick={() => performOnlineAction()} type="button">{loading ? '⚔️ Resolviendo...' : selectedAction === 'defend' ? '🛡️ Defender' : selectedAction === 'ultimate' ? '⚡ Usar definitiva' : selectedAction.startsWith('ability-') ? '✨ Usar habilidad' : '⚔️ Atacar'}</button>
          </div>
        )}

        {isFinished && (
          <div className="selection-status online-result">
            <strong>{didDraw ? '🤝 EMPATE' : didWin ? '🏆 ¡VICTORIA!' : '💥 DERROTA'}</strong>
            <span>{didDraw ? 'No hubo un ganador en este combate.' : didWin ? `${winnerCharacter?.name || 'Tu personaje'} consiguió la victoria.` : `${winnerCharacter?.name || 'El oponente'} ganó el combate.`}</span>
            <div className="online-result__actions">
              <button className="start-button" onClick={startAnotherBattle} disabled={loading} type="button">{loading ? '🔄 PREPARANDO...' : '🔄 HACER OTRA BATALLA'}</button>
            </div>
          </div>
        )}

        <div className="battle-log online-log">
          {(battleState?.log || []).slice().reverse().map(entry => <div className={`battle-log-entry battle-log-${entry.type || 'attack'}`} data-log-id={entry.id || ''} data-log-type={entry.type || 'attack'} data-actor-user-id={entry.user_id || ''} key={entry.id}>{entry.message}</div>)}
        </div>
      </section>
    </main>
  }

  return <main className="online-battle">
    <header><p className="eyebrow">BATALLAS ONLINE</p><h1>Desafiar a otro jugador</h1><p>Creá una sala o unite con un código.</p></header>
    {!room && <section className="online-battle__actions"><button onClick={createRoom} disabled={loading}>⚔️ CREAR SALA</button><div className="join-card"><h2>UNIRSE A UNA SALA</h2><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO"/><button onClick={joinRoom} disabled={loading || code.length < 5}>ENTRAR</button></div></section>}
    {error && <p className="online-battle__error">{error}</p>}
    {room && <section className="battle-room panel">
      <div className="room-code"><span>CÓDIGO DE SALA</span><strong>{room.code}</strong></div>
      <div className="room-status"><span>ESTADO</span><strong>{room.status === 'ready' ? 'SELECCIÓN DE PERSONAJE' : 'ESPERANDO AL OPONENTE...'}</strong></div>
      <div className="players"><article><span>HOST</span><strong>{hostName}</strong>{host?.character_id && <small>✓ Personaje elegido</small>}</article><div>VS</div><article><span>OPONENTE</span><strong>{guestName}</strong>{guest?.character_id && <small>✓ Personaje elegido</small>}</article></div>
      {room.status === 'ready' && <div className="character-select"><div className="character-select__heading"><div><p className="eyebrow">TU COLECCIÓN</p><h2>Elegí tu personaje</h2></div><span>{selectedCharacter ? `Elegido: ${selectedCharacter.name}` : 'Ninguno elegido'}</span></div><div className="character-grid">{characters.map(character => { const image = getImage(character); const selected = character.id === selectedCharacterId; return <button key={character.id} className={`character-card ${selected ? 'is-selected' : ''}`} onClick={() => selectCharacter(character.id)} disabled={loading}>{image ? <img src={image} alt={character.name} /> : <div className="character-card__fallback">{character.name.charAt(0)}</div>}<strong>{character.name}</strong>{selected && <span>✓ ELEGIDO</span>}</button> })}</div><div className="selection-status">{bothSelected ? '✓ Ambos jugadores eligieron personaje' : 'Esperando la elección del otro jugador...'}</div></div>}
      {bothSelected && <button className="start-button" onClick={startOnlineBattle} disabled={loading || user?.id !== room.host_user_id}>{user?.id === room.host_user_id ? 'COMENZAR BATALLA' : 'ESPERANDO AL HOST...'}</button>}
    </section>}
  </main>
}
