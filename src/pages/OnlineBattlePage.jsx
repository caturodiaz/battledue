import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import '../styles/OnlineBattle.css'

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export default function OnlineBattlePage() {
  const { user, profile } = useAuth()
  const [code, setCode] = useState('')
  const [room, setRoom] = useState(null)
  const [participants, setParticipants] = useState([])
  const [characters, setCharacters] = useState([])
  const [selectedCharacterId, setSelectedCharacterId] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadParticipants(roomId) {
    const { data, error: participantsError } = await supabase
      .from('battle_participants')
      .select('user_id, role, character_id')
      .eq('room_id', roomId)
    if (participantsError) { setError(participantsError.message); return }
    setParticipants(data || [])
    const mine = (data || []).find(p => p.user_id === user?.id)
    setSelectedCharacterId(mine?.character_id || null)
  }

  async function refreshRoom(roomId) {
    const { data, error: roomError } = await supabase.from('battle_rooms').select('*').eq('id', roomId).single()
    if (roomError) { setError(roomError.message); return }
    setRoom(data)
    await loadParticipants(roomId)
  }

  async function loadCharacters() {
    if (!user) return
    const { data: unlocks, error: unlockError } = await supabase.from('character_unlocks').select('character_id').eq('user_id', user.id)
    if (unlockError) { setError(unlockError.message); return }
    const ids = (unlocks || []).map(item => item.character_id)
    if (!ids.length) { setCharacters([]); return }
    const { data, error: charactersError } = await supabase.from('characters').select('id, name, image, profile').in('id', ids).order('name')
    if (charactersError) setError(charactersError.message)
    else setCharacters(data || [])
  }

  useEffect(() => {
    if (!room?.id) return
    refreshRoom(room.id)

    const channel = supabase.channel(`battle-room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${room.id}` }, () => refreshRoom(room.id))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_participants', filter: `room_id=eq.${room.id}` }, () => refreshRoom(room.id))
      .subscribe()

    // Fallback: el lobby se actualiza aunque Realtime/RLS no entregue el evento al host.
    const poll = window.setInterval(() => refreshRoom(room.id), 1500)
    return () => {
      window.clearInterval(poll)
      supabase.removeChannel(channel)
    }
  }, [room?.id])

  useEffect(() => {
    if (room?.status === 'ready') loadCharacters()
  }, [room?.status, user?.id])

  async function createRoom() {
    setLoading(true); setError('')
    const roomCode = makeRoomCode()
    const { data, error: insertError } = await supabase.from('battle_rooms').insert({ code: roomCode, host_user_id: user.id, status: 'waiting' }).select().single()
    if (insertError) { setError(insertError.message); setLoading(false); return }
    const { error: participantError } = await supabase.from('battle_participants').insert({ room_id: data.id, user_id: user.id, role: 'host' })
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
    const { data, error: findError } = await supabase.from('battle_rooms').select('*').eq('code', normalized).eq('status', 'waiting').maybeSingle()
    if (findError || !data) { setError(findError?.message || 'No encontramos una sala disponible con ese código.'); setLoading(false); return }
    if (data.host_user_id === user.id) { setError('No podés unirte a tu propia sala.'); setLoading(false); return }
    const { count } = await supabase.from('battle_participants').select('*', { count: 'exact', head: true }).eq('room_id', data.id)
    if ((count || 0) >= 2) { setError('Esta sala ya tiene dos jugadores.'); setLoading(false); return }
    const { error: joinError } = await supabase.from('battle_participants').insert({ room_id: data.id, user_id: user.id, role: 'guest' })
    if (joinError) { setError(joinError.message) }
    else {
      const { data: updated, error: updateError } = await supabase.from('battle_rooms').update({ status: 'ready' }).eq('id', data.id).eq('status', 'waiting').select().single()
      if (updateError) setError(updateError.message)
      else { setRoom(updated || data); await loadParticipants(data.id) }
    }
    setLoading(false)
  }

  async function selectCharacter(characterId) {
    if (!room?.id || !user || loading) return
    setLoading(true); setError('')
    const { error: updateError } = await supabase.from('battle_participants').update({ character_id: characterId }).eq('room_id', room.id).eq('user_id', user.id)
    if (updateError) setError(updateError.message)
    else setSelectedCharacterId(characterId)
    setLoading(false)
  }

  const host = participants.find(p => p.role === 'host')
  const guest = participants.find(p => p.role === 'guest')
  const myName = profile?.display_name || user?.email?.split('@')[0] || 'Vos'
  const hostName = host?.user_id === user?.id ? myName : 'Jugador'
  const guestName = guest?.user_id === user?.id ? myName : (guest ? 'Jugador' : 'Esperando...')
  const bothSelected = Boolean(host?.character_id && guest?.character_id)
  const selectedCharacter = useMemo(() => characters.find(character => character.id === selectedCharacterId), [characters, selectedCharacterId])

  return <main className="online-battle">
    <header><p className="eyebrow">BATALLAS ONLINE</p><h1>Desafiar a otro jugador</h1><p>Creá una sala para Sebastián o unite con un código.</p></header>
    {!room && <section className="online-battle__actions"><button onClick={createRoom} disabled={loading}>⚔️ CREAR SALA</button><div className="join-card"><h2>UNIRSE A UNA SALA</h2><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO"/><button onClick={joinRoom} disabled={loading || code.length < 5}>ENTRAR</button></div></section>}
    {error && <p className="online-battle__error">{error}</p>}
    {room && <section className="battle-room panel">
      <div className="room-code"><span>CÓDIGO DE SALA</span><strong>{room.code}</strong></div>
      <div className="room-status"><span>ESTADO</span><strong>{room.status === 'ready' ? 'SELECCIÓN DE PERSONAJE' : 'ESPERANDO AL OPONENTE...'}</strong></div>
      <div className="players"><article><span>HOST</span><strong>{hostName}</strong>{host?.character_id && <small>✓ Personaje elegido</small>}</article><div>VS</div><article><span>OPONENTE</span><strong>{guestName}</strong>{guest?.character_id && <small>✓ Personaje elegido</small>}</article></div>
      {room.status === 'ready' && <div className="character-select"><div className="character-select__heading"><div><p className="eyebrow">TU COLECCIÓN</p><h2>Elegí tu personaje</h2></div><span>{selectedCharacter ? `Elegido: ${selectedCharacter.name}` : 'Ninguno elegido'}</span></div><div className="character-grid">{characters.map(character => { const image = character.profile?.primaryImage || character.image; const selected = character.id === selectedCharacterId; return <button key={character.id} className={`character-card ${selected ? 'is-selected' : ''}`} onClick={() => selectCharacter(character.id)} disabled={loading}>{image ? <img src={image} alt={character.name} /> : <div className="character-card__fallback">{character.name.charAt(0)}</div>}<strong>{character.name}</strong>{selected && <span>✓ ELEGIDO</span>}</button> })}</div><div className="selection-status">{bothSelected ? '✓ Ambos jugadores eligieron personaje' : 'Esperando la elección del otro jugador...'}</div></div>}
      {bothSelected && <button className="start-button" disabled>COMENZAR BATALLA · PRÓXIMAMENTE</button>}
    </section>}
  </main>
}
