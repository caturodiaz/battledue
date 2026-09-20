import { useEffect, useState } from 'react'
import {
  addCharacter,
  deleteCharacter,
  getCharacters,
  updateCharacter,
  replaceCharacters,
} from '../utils/storage'
import { supabase } from '../lib/supabaseClient'
import { useAuth } from '../context/AuthContext'

export function useCharacters() {
  const { user } = useAuth()
  const [characters, setCharacters] = useState([])
  const [unlockedCharacterIds, setUnlockedCharacterIds] = useState(new Set())
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadCharacters() {
      if (!user?.id) {
        setCharacters([])
        setUnlockedCharacterIds(new Set())
        setIsLoading(false)
        return
      }

      try {
        setIsLoading(true)
        setError(null)

        const [data, unlockResult] = await Promise.all([
          getCharacters(),
          supabase
            .from('character_unlocks')
            .select('character_id')
            .eq('user_id', user.id),
        ])

        if (unlockResult.error) {
          throw unlockResult.error
        }

        if (isMounted) {
          setCharacters(data)
          setUnlockedCharacterIds(
            new Set((unlockResult.data || []).map((item) => item.character_id)),
          )
        }
      } catch (error) {
        console.error('Error cargando personajes:', error)

        if (isMounted) {
          setError(error)
        }
      } finally {
        if (isMounted) {
          setIsLoading(false)
        }
      }
    }

    loadCharacters()

    return () => {
      isMounted = false
    }
  }, [user?.id])

  const createCharacter = async (character) => {
    try {
      const updatedCharacters = await addCharacter(character)
      const createdCharacter = updatedCharacters.find(
        (item) => !characters.some((current) => current.id === item.id),
      )

      if (createdCharacter?.id && user?.id) {
        const { error: unlockError } = await supabase
          .from('character_unlocks')
          .insert({
            user_id: user.id,
            character_id: createdCharacter.id,
            source: 'legacy',
          })

        if (unlockError) {
          throw unlockError
        }

        setUnlockedCharacterIds((current) => {
          const next = new Set(current)
          next.add(createdCharacter.id)
          return next
        })
      }

      setCharacters(updatedCharacters)
      return updatedCharacters
    } catch (error) {
      console.error('Error creando personaje:', error)
      setError(error)
      throw error
    }
  }

  const editCharacter = async (id, changes) => {
    try {
      const updatedCharacters = await updateCharacter(id, changes)
      setCharacters(updatedCharacters)
      return updatedCharacters
    } catch (error) {
      console.error('Error editando personaje:', error)
      setError(error)
      throw error
    }
  }

  const removeCharacter = async (id) => {
    try {
      const updatedCharacters = await deleteCharacter(id)
      setCharacters(updatedCharacters)
      setUnlockedCharacterIds((current) => {
        const next = new Set(current)
        next.delete(id)
        return next
      })
      return updatedCharacters
    } catch (error) {
      console.error('Error eliminando personaje:', error)
      setError(error)
      throw error
    }
  }

  const importCharacters = async (items) => {
    try {
      const updatedCharacters = await replaceCharacters(items)
      setCharacters(updatedCharacters)
      return updatedCharacters
    } catch (error) {
      console.error('Error importando personajes:', error)
      setError(error)
      throw error
    }
  }

  const unlockedCharacters = characters.filter((character) =>
    unlockedCharacterIds.has(character.id),
  )

  return {
    characters,
    unlockedCharacters,
    unlockedCharacterIds,
    isLoading,
    error,
    createCharacter,
    editCharacter,
    removeCharacter,
    importCharacters,
  }
}
