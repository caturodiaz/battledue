import { useEffect, useMemo, useState } from 'react'
import { addCharacter, deleteCharacter, getCharacters, updateCharacter, replaceCharacters } from '../utils/storage'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useCharacters() {
  const { user, profile } = useAuth()
  const [allCharacters, setAllCharacters] = useState([])
  const [unlockedCharacterIds, setUnlockedCharacterIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true
    async function loadCharacters() {
      if (!user?.id) {
        setAllCharacters([])
        setUnlockedCharacterIds(new Set())
        setIsLoading(false)
        return
      }
      try {
        setIsLoading(true)
        setError(null)
        const [data, unlockResult] = await Promise.all([
          getCharacters(),
          supabase.from('character_unlocks').select('character_id').eq('user_id', user.id),
        ])
        if (unlockResult.error) throw unlockResult.error
        if (isMounted) {
          setAllCharacters(data || [])
          setUnlockedCharacterIds(new Set((unlockResult.data || []).map((item) => item.character_id)))
        }
      } catch (loadError) {
        console.error('Error cargando personajes:', loadError)
        if (isMounted) {
          setError(loadError)
          setAllCharacters([])
          setUnlockedCharacterIds(new Set())
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    loadCharacters()
    return () => { isMounted = false }
  }, [user?.id])

  const createCharacter = async (character, unlockConfig = {}) => {
    try {
      const updatedCharacters = await addCharacter(character)
      const createdCharacter = updatedCharacters.find((item) => !allCharacters.some((current) => current.id === item.id))
      if (createdCharacter?.id && user?.id) {
        const isAdmin = profile?.role === 'admin'
        const unlockType = isAdmin ? (unlockConfig.type || 'initial') : 'initial'
        const unlockLevel = unlockType === 'level' ? Math.max(1, Number(unlockConfig.level) || 1) : null
        const { error: updateError } = await supabase.from('characters').update({ created_by: user.id, unlock_type: unlockType, unlock_level: unlockLevel }).eq('id', createdCharacter.id)
        if (updateError) throw updateError
        if (unlockType === 'initial') {
          const { error: unlockError } = await supabase.from('character_unlocks').upsert({ user_id: user.id, character_id: createdCharacter.id, source: isAdmin ? 'admin' : 'creator', unlock_type: 'initial', unlock_value: null }, { onConflict: 'user_id,character_id' })
          if (unlockError) throw unlockError
          setUnlockedCharacterIds((current) => new Set([...current, createdCharacter.id]))
        }
      }
      setAllCharacters(updatedCharacters)
      return createdCharacter || updatedCharacters[updatedCharacters.length - 1]
    } catch (createError) {
      console.error('Error creando personaje:', createError)
      setError(createError)
      throw createError
    }
  }

  const editCharacter = async (id, changes) => {
    try {
      const updatedCharacters = await updateCharacter(id, changes)
      setAllCharacters(updatedCharacters)
      return updatedCharacters.find((item) => item.id === id)
    } catch (editError) {
      console.error('Error editando personaje:', editError)
      setError(editError)
      throw editError
    }
  }

  const removeCharacter = async (id) => {
    try {
      const updatedCharacters = await deleteCharacter(id)
      setAllCharacters(updatedCharacters)
      setUnlockedCharacterIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      return updatedCharacters
    } catch (removeError) {
      console.error('Error eliminando personaje:', removeError)
      setError(removeError)
      throw removeError
    }
  }

  const importCharacters = async (items) => {
    try {
      const updatedCharacters = await replaceCharacters(items)
      setAllCharacters(updatedCharacters)
      return updatedCharacters
    } catch (importError) {
      console.error('Error importando personajes:', importError)
      setError(importError)
      throw importError
    }
  }

  const unlockedCharacters = useMemo(() => allCharacters.filter((character) => unlockedCharacterIds.has(character.id)), [allCharacters, unlockedCharacterIds])
  const lockedCharacters = useMemo(() => allCharacters.filter((character) => !unlockedCharacterIds.has(character.id)), [allCharacters, unlockedCharacterIds])

  return { characters: allCharacters, allCharacters, unlockedCharacters, lockedCharacters, unlockedCharacterIds, isLoading, error, createCharacter, editCharacter, removeCharacter, importCharacters }
}
