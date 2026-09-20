import { useCallback, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export const LEVEL_XP = [
  0,
  100,
  250,
  450,
  700,
  1000,
  1350,
  1750,
  2200,
  2700,
]

function getLevelFromXp(experience = 0) {
  const xp = Math.max(0, Number(experience) || 0)
  let level = 1

  LEVEL_XP.forEach((requiredXp, index) => {
    if (xp >= requiredXp) {
      level = index + 1
    }
  })

  return level
}

export function usePlayerProgress(userId) {
  const [progress, setProgress] = useState(null)
  const [loading, setLoading] = useState(Boolean(userId))
  const [error, setError] = useState(null)

  const loadProgress = useCallback(async () => {
    if (!userId) {
      setProgress(null)
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    const { data, error: progressError } = await supabase
      .from('player_progress')
      .select('level, experience, wins, losses, battles')
      .eq('user_id', userId)
      .maybeSingle()

    if (progressError) {
      console.error('Error loading player progress:', progressError)
      setError(progressError)
      setProgress(null)
    } else {
      setProgress(data || {
        level: 1,
        experience: 0,
        wins: 0,
        losses: 0,
        battles: 0,
      })
    }

    setLoading(false)
  }, [userId])

  useEffect(() => {
    loadProgress()
  }, [loadProgress])

  const derived = useMemo(() => {
    const experience = Number(progress?.experience) || 0
    const level = Number(progress?.level) || getLevelFromXp(experience)
    const nextLevelXp = LEVEL_XP[level] ?? null
    const currentLevelXp = LEVEL_XP[level - 1] ?? 0
    const progressRange = nextLevelXp === null ? 0 : nextLevelXp - currentLevelXp
    const progressIntoLevel = Math.max(0, experience - currentLevelXp)
    const percentage = nextLevelXp === null
      ? 100
      : Math.min(100, Math.round((progressIntoLevel / progressRange) * 100))

    return {
      experience,
      level,
      nextLevelXp,
      currentLevelXp,
      percentage,
      xpToNextLevel: nextLevelXp === null ? 0 : Math.max(0, nextLevelXp - experience),
    }
  }, [progress])

  return {
    progress,
    loading,
    error,
    refresh: loadProgress,
    ...derived,
  }
}
