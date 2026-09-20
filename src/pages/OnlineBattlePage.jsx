import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import '../styles/OnlineBattle.css'

function makeRoomCode() {
  return Math.random().toString(36).slice(2, 7).toUpperCase()
}

export default function OnlineBattlePage() {
  const { user, profile } = useAuth()
  const [mode, setMode] = useState(null)
  const [code, setCode] = useState('')
  const [room, setRoom] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!room?.id) return
    const channel = supabase.channel(`battle-room-${room.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'battle_rooms', filter: `id=eq.${room.id}` }, payload => setRoom(payload.new))
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
    if (insertError) setError(insertError.message)
    else setRoom(data)
    setLoading(false)
  }

  async function joinRoom() {
    setLoading(true); setError('')
    const normalized = code.trim().toUpperCase()
    const { data, error: findError } = await supabase.from('battle_rooms').select('*').eq('code', normalized).eq('status', 'waiting').maybeSingle()
    if (findError || !data) {
      setError(findError?.message || 'No encontramos una sala disponible con ese código.')
      setLoading(false); return
    }
    const { error: joinError } = await supabase.from('battle_participants').insert({ room_id: data.id, user_id: user.id, role: 'guest' })
    if (joinError) setError(joinError.message)
    else {
      const { data: updated } = await supabase.from('battle_rooms').update({ status: 'ready' }).eq('id', data.id).select().single()
      setRoom(updated || data)
    }
    setLoading(false)
  }

  return <main className="online-battle">
    <header><p className="eyebrow">BATALLAS ONLINE</p><h1>Desafiar a otro jugador</h1><p>Creá una sala para Sebastián o unite con un código. La humanidad finalmente encontró un uso para las salas privadas.</p></header>

    {!room && <section className="online-battle__actions">
      <button onClick={createRoom} disabled={loading}>⚔️ CREAR SALA</button>
      <div className="join-card"><h2>UNIRSE A UNA SALA</h2><input value={code} onChange={e => setCode(e.target.value.toUpperCase())} maxLength={5} placeholder="CÓDIGO"/><button onClick={joinRoom} disabled={loading || code.length < 5}>ENTRAR</button></div>
    </section>}

    {error && <p className="online-battle__error">{error}</p>}

    {room && <section className="battle-room panel">
      <div className="room-code"><span>CÓDIGO DE SALA</span><strong>{room.code}</strong></div>
      <div className="room-status"><span>ESTADO</span><strong>{room.status === 'ready' ? 'AMBOS JUGADORES LISTOS' : 'ESPERANDO AL OPONENTE...'}</strong></div>
      <div className="players"><article><span>HOST</span><strong>{room.created_by === user.id ? (profile?.display_name || 'Vos') : 'Jugador'}</strong></article><div>VS</div><article><span>OPONENTE</span><strong>{room.created_by === user.id ? 'Esperando...' : (profile?.display_name || 'Vos')}</strong></article></div>
      {room.status === 'ready' && <button className="start-button">ELEGIR PERSONAJE</button>}
    </section>}
  </main>
}
