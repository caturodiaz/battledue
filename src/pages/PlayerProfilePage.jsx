import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'
import AchievementsSection from '../components/AchievementsSection'
import '../styles/PlayerProfile.css'

const LEVEL_XP = [0, 100, 250, 450, 700, 1000, 1350, 1750, 2200, 2700]

function xpForLevel(level) {
  if (level <= LEVEL_XP.length) return LEVEL_XP[level - 1]
  return 2700 + (level - 10) * 550 + ((level - 10) * (level - 11) * 25)
}

export default function PlayerProfilePage() {
  const { user, profile } = useAuth()
  const [progress, setProgress] = useState(null)
  const [unlockedCount, setUnlockedCount] = useState(0)
  const [totalCharacters, setTotalCharacters] = useState(0)
  const [achievements, setAchievements] = useState([])
  const [unlockedAchievementIds, setUnlockedAchievementIds] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    async function load() {
      if (!user) return
      await supabase.rpc('sync_player_achievements')
      const [progressResult, unlockedResult, charactersResult, achievementsResult, playerAchievementsResult] = await Promise.all([
        supabase.from('player_progress').select('level, experience, wins, losses, battles').eq('user_id', user.id).maybeSingle(),
        supabase.from('character_unlocks').select('character_id', { count: 'exact', head: true }).eq('user_id', user.id),
        supabase.from('characters').select('id', { count: 'exact', head: true }),
        supabase.from('achievements').select('id, name, description, icon, category, sort_order').order('sort_order'),
        supabase.from('player_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id).order('unlocked_at'),
      ])
      if (!active) return
      if (progressResult.error) console.error('Error cargando progreso:', progressResult.error)
      if (unlockedResult.error) console.error('Error cargando personajes desbloqueados:', unlockedResult.error)
      if (charactersResult.error) console.error('Error cargando personajes:', charactersResult.error)
      if (achievementsResult.error) console.error('Error cargando logros:', achievementsResult.error)
      if (playerAchievementsResult.error) console.error('Error cargando logros del jugador:', playerAchievementsResult.error)
      setProgress(progressResult.data ?? { level: 1, experience: 0, wins: 0, losses: 0, battles: 0 })
      setUnlockedCount(unlockedResult.count ?? 0)
      setTotalCharacters(charactersResult.count ?? 0)
      setAchievements(achievementsResult.data ?? [])
      setUnlockedAchievementIds((playerAchievementsResult.data ?? []).map((item) => item.achievement_id))
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user])

  if (loading) return <main className="player-profile"><p>Cargando perfil...</p></main>

  const stats = progress ?? { level: 1, experience: 0, wins: 0, losses: 0, battles: 0 }
  const currentXp = xpForLevel(stats.level)
  const nextXp = xpForLevel(stats.level + 1)
  const percent = Math.min(100, Math.max(0, ((stats.experience - currentXp) / Math.max(1, nextXp - currentXp)) * 100))
  const winRate = stats.battles ? Math.round((stats.wins / stats.battles) * 100) : 0
  const displayName = profile?.display_name || user?.email?.split('@')[0] || 'Jugador'

  return (
    <main className="player-profile">
      <header className="player-profile__hero">
        <div className="player-avatar">{displayName.charAt(0).toUpperCase()}</div>
        <div className="player-profile__identity">
          <p className="eyebrow">PERFIL DE JUGADOR</p>
          <h1>{displayName}</h1>
          <span>{user?.email}</span>
        </div>
        <div className="player-level-badge"><span>NIVEL</span><strong>{stats.level}</strong></div>
      </header>

      <section className="player-profile__xp panel">
        <div className="xp-heading"><div><span>EXPERIENCIA</span><strong>{stats.experience} XP</strong></div><small>{Math.max(0, nextXp - stats.experience)} XP para nivel {stats.level + 1}</small></div>
        <div className="xp-bar"><div style={{ width: `${percent}%` }} /></div>
        <div className="xp-labels"><span>Nivel {stats.level}</span><span>{Math.round(percent)}%</span><span>Nivel {stats.level + 1}</span></div>
      </section>

      <section className="player-profile__stats">
        <article><strong>{stats.battles}</strong><span>BATALLAS</span></article>
        <article><strong>{stats.wins}</strong><span>VICTORIAS</span></article>
        <article><strong>{stats.losses}</strong><span>DERROTAS</span></article>
        <article><strong>{winRate}%</strong><span>VICTORIAS</span></article>
      </section>

      <AchievementsSection achievements={achievements} unlockedIds={unlockedAchievementIds} />

      <section className="player-profile__collection panel">
        <div><p className="eyebrow">COLECCIÓN</p><h2>Personajes desbloqueados</h2></div>
        <strong>{unlockedCount} / {totalCharacters}</strong>
      </section>
    </main>
  )
}
