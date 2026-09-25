import { useEffect, useRef, useState } from 'react'
import achievementUnlockedAudio from '../assets/sounds/achievement-unlocked-data'
import '../styles/AchievementUnlockNotification.css'

const STORAGE_PREFIX = 'battledue-seen-achievements:'
const POLL_INTERVAL = 2500

function getSeenIds(userId) {
  try { return new Set(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}${userId}`) || '[]')) } catch { return new Set() }
}

function saveSeenIds(userId, ids) { localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify([...ids])) }

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

    async function checkAchievements() {
      await supabase.rpc('sync_player_achievements').catch(() => {})
      const { data, error } = await supabase.from('player_achievements').select('achievement_id, unlocked_at').eq('user_id', user.id).order('unlocked_at')
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
      const { data: definitions } = await supabase.from('achievements').select('id, name, description, icon').in('id', newIds)
      if (!active) return
      const definitionMap = new Map((definitions || []).map((achievement) => [achievement.id, achievement]))
      const unlocked = newIds.map((id) => definitionMap.get(id)).filter(Boolean)
      seenRef.current = new Set([...seenRef.current, ...newIds])
      saveSeenIds(user.id, seenRef.current)
      setQueue((previous) => [...previous, ...unlocked])
    }

    checkAchievements()
    const interval = window.setInterval(checkAchievements, POLL_INTERVAL)
    return () => { active = false; window.clearInterval(interval) }
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
    audioRef.current.play().catch(() => {})
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
