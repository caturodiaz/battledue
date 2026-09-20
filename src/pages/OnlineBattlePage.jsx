import { useEffect, useState } from 'react'
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
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function loadParticipants(roomId) {
    const { data, error: participantsError } = await supabase
      .from('battle_participants')
      .select('user_id, role')
      .eq('room_id', roomId)
    if (participantsError) {
      setError(participantsError.message)
      return
    }
    setParticipants(data || [])
  }

  useEffect(() => {
    if (!room?.id) return
    loadParticipants(room.id)

    const channel = supabase.channel(`battle-room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${room.id}` }, payload => {
        if (payload.new) setRoom(payload.new)
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_participants', filter: `room_id=eq.${room.id}` }, () => {
        loadParticipants(room.id)
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [room?.id])

  async function createRoom() {
    setLoading(true); setError('')
    const roomCode = makeRoomCode()
    const { data, error: insertError } = await supabase
      .from('battle_rooms')
      .insert({ code: roomCode, created_by: user.id, status: 'waiting' })
      .select().single()

    if (insertError) {
      setError(insertError.message)
      setLoading(false)
      return
    }

    const { error: participantError } = await supabase
      .from('battle_participants')
      .insert({ room_id: data.id, user_id: user.id, role: 'host' })

    if (participantError) {
      setError(participantError.message)
      await supabase.from('battle_rooms').delete().eq('id', data.id)
    } else {
      setRoom(data)
      setParticipants([{ user_id: user.id, role: 'host' }])
    }
    setLoading(false)
  }

  async function joinRoom() {
    setLoading(true); setError('')
    const normalized = code.trim().toUpperCase()
    const { data, error: findError } = await supabase
      .from('battle_rooms').select('*').eq('code', normalized).eq('status', 'waiting').maybeSingle()

    if (findError || !data) {
      setError(findError?.message || 'No encontramos una sala disponible con ese código.')
      setLoading(false); return
    }

    if (data.created_by === user.id) {
      setError('No podés unirte a tu propia sala.')
      setLoading(false); return
    }

    const { count } = await supabase
      .from('battle_participants').select('*', { count: 'exact', head: true }).eq('room_id', data.id)

    if ((count || 0) >= 2) {
      setError('Esta sala ya tiene dos jugadores.')
      setLoading(false); return
    }

    const { error: joinError } = await supabase
      .from('battle_participants').insert({ room_id: data.id, user_id: user.id, role: 'guest' })

    if (joinError) {
      setError(joinError.message)
    } else {
      const { data: updated, error: updateError } = await supabase
        .from('battle_rooms').update({ status: 'ready' }).eq('id', data.id).eq('status', 'waiting').select().single()
      if (updateError) setError(updateError.message)
      else {
        setRoom(updated || data)
        await loadParticipants(data.id)
      }
    }
    setLoading(false)
  }

  const host = participants.find(p => p.role === 'host')
  const guest = participants.find(p => p.role === 'guest')
  const myName = profile?.display_name || user?.email?.split('@')[0] || 'Vos'
  const hostName = host?.user_id === user?.id ? myName : 'Jugador'
  const guestName = guest?.user_id === user?.id ? myName : (guest ? 'Jugador' : 'Esperando...')

  return <main className="online-battle">
    <header><p className="eyebrow">BATALLAS ONLINE</p><h1>Desafiar a otro jugador</h1><p>Creá una sala para Sebastián o unite con un código.</p></header>

    {!room && <section className="online-battle__actions">
      <button onClick={createRoom} disabled={loading}>⚔️ CREAR SALA</button>
      <div className="join-card"><h2>UNIRSE A UNA SALA</h2><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO"/><button onClick={joinRoom} disabled={loading || code.length < 5}>ENTRAR</button></div>
    </section>}

    {error && <p className="online-battle__error">{error}</p>}

    {room && <section className="battle-room panel">
      <div className="room-code"><span>CÓDIGO DE SALA</span><strong>{room.code}</strong></div>
      <div className="room-status"><span>ESTADO</span><strong>{room.status === 'ready' ? 'AMBOS JUGADORES LISTOS' : 'ESPERANDO AL OPONENTE...'}</strong></div>
      <div className="players"><article><span>HOST</span><strong>{hostName}</strong></article><div>VS</div><article><span>OPONENTE</span><strong>{guestName}</strong></article></div>
      {room.status === 'ready' && <button className="start-button">ELEGIR PERSONAJE</button>}
    </section>}
  </main>
}
