import { useEffect, useRef, useState } from 'react'
import achievementUnlockedAudio from '../assets/sounds/achievement-unlocked-data.js'
import '../styles/AchievementUnlockNotification.css'

const STORAGE_PREFIX = 'battledue-seen-achievements:'
const ACHIEVEMENT_EVENT = 'battledue:achievement-event'

function getSeenIds(userId) {
  try { return new Set(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${userId}`) || '[]')) } catch { return new Set() }
}

function saveSeenIds(userId, ids) {
  localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify([...ids]))
}

export default function AchievementUnlockNotification({ user, supabase }) {
  const [queue, setQueue] = useState([])
  const [current, setCurrent] = useState(null)
  const initializedRef = useRef(false)
  const seenRef = useRef(new Set())
  const audioRef = useRef(null)

  useEffect(() => {
    if (!user?.id) return undefined
    let active = true
    seenRef.current = getSeenIds(user.id)
    initializedRef.current = false

    function enqueueAchievements(achievements) {
      const fresh = achievements.filter((achievement) => !seenRef.current.has(achievement.id))
      if (!fresh.length) return

      seenRef.current = new Set([...seenRef.current, ...fresh.map((achievement) => achievement.id)])
      saveSeenIds(user.id, seenRef.current)
      setQueue((previous) => [...previous, ...fresh])
    }

    async function loadUnlockedAchievements() {
      const { data, error } = await supabase
        .from('player_achievements')
        .select('achievement_id, unlocked_at')
        .eq('user_id', user.id)
        .order('unlocked_at')

      if (!active || error) return

      const ids = new Set((data || []).map((item) => item.achievement_id))
      if (!initializedRef.current) {
        seenRef.current = new Set([...seenRef.current, ...ids])
        saveSeenIds(user.id, seenRef.current)
        initializedRef.current = true
        return
      }

      const newIds = [...ids].filter((id) => !seenRef.current.has(id))
      if (!newIds.length) return

      const { data: definitions } = await supabase
        .from('achievements')
        .select('id, name, description, icon')
        .in('id', newIds)

      if (!active) return
      enqueueAchievements(definitions || [])
    }

    async function syncAchievements() {
      try {
        await supabase.rpc('sync_player_achievements')
      } catch {
        return
      }
      await loadUnlockedAchievements()
    }

    async function recordAchievementEvent(achievementId) {
      try {
        await supabase.rpc('record_achievement_event', { p_achievement_id: achievementId })
      } catch {
        return
      }
      await loadUnlockedAchievements()
    }

    async function handleAchievementInsert(payload) {
      const achievementId = payload?.new?.achievement_id
      if (!active || !achievementId || seenRef.current.has(achievementId)) return

      const { data, error } = await supabase
        .from('achievements')
        .select('id, name, description, icon')
        .eq('id', achievementId)
        .maybeSingle()

      if (!active || error || !data) return
      enqueueAchievements([data])
    }

    const channel = supabase
      .channel(`achievement-unlocks:${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'player_achievements',
          filter: `user_id=eq.${user.id}`,
        },
        handleAchievementInsert,
      )
      .subscribe()

    const handleAchievementEvent = (event) => {
      if (!active) return
      const achievementId = event?.detail?.achievementId
      if (achievementId) recordAchievementEvent(achievementId)
      else syncAchievements()
    }

    window.addEventListener(ACHIEVEMENT_EVENT, handleAchievementEvent)
    syncAchievements()

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') syncAchievements()
    }

    const handleFocus = () => syncAchievements()

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      active = false
      window.removeEventListener(ACHIEVEMENT_EVENT, handleAchievementEvent)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      supabase.removeChannel(channel)
    }
  }, [user?.id, supabase])

  useEffect(() => {
    if (current || !queue.length) return
    setCurrent(queue[0])
    setQueue((previous) => previous.slice(1))
  }, [queue, current])

  useEffect(() => {
    if (!current) return undefined
    audioRef.current = new Audio(achievementUnlockedAudio)
    audioRef.current.volume = 0.85
    audioRef.current.play().catch((error) => {
      console.warn('[BattleDue] Achievement sound could not play:', error)
    })
    const timeout = window.setTimeout(() => setCurrent(null), 5200)
    return () => { window.clearTimeout(timeout); audioRef.current?.pause(); audioRef.current = null }
  }, [current])

  if (!current) return null

  return (
    <div className="achievement-unlock" role="status" aria-live="assertive">
      <div className="achievement-unlock__burst" aria-hidden="true">✦</div>
      <div className="achievement-unlock__card">
        <div className="achievement-unlock__eyebrow">¡LOGRO DESBLOQUEADO!</div>
        <div className="achievement-unlock__content">
          <div className="achievement-unlock__icon" aria-hidden="true">{current.icon}</div>
          <div className="achievement-unlock__copy"><h2>{current.name}</h2><p>{current.description}</p></div>
        </div>
        <div className="achievement-unlock__shine" aria-hidden="true" />
      </div>
    </div>
  )
}
