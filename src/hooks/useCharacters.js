import { useEffect, useState } from 'react'
import {
  addCharacter,
  deleteCharacter,
  getCharacters,
  updateCharacter,
  replaceCharacters,
} from '../utils/storage'

export function useCharacters() {
  const [characters, setCharacters] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    let isMounted = true

    async function loadCharacters() {
      try {
        setIsLoading(true)
        setError(null)

        const data = await getCharacters()

        if (isMounted) {
          setCharacters(data)
        }
      } catch (error) {
        console.error(
          'Error cargando personajes:',
          error
        )

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
  }, [])

  const createCharacter = async (
    character
  ) => {
    try {
      const updatedCharacters =
        await addCharacter(character)

      setCharacters(updatedCharacters)

      return updatedCharacters
    } catch (error) {
      console.error(
        'Error creando personaje:',
        error
      )

      setError(error)

      throw error
    }
  }

  const editCharacter = async (
    id,
    changes
  ) => {
    try {
      const updatedCharacters =
        await updateCharacter(
          id,
          changes
        )

      setCharacters(updatedCharacters)

      return updatedCharacters
    } catch (error) {
      console.error(
        'Error editando personaje:',
        error
      )

      setError(error)

      throw error
    }
  }

  const removeCharacter = async (
    id
  ) => {
    try {
      const updatedCharacters =
        await deleteCharacter(id)

      setCharacters(updatedCharacters)

      return updatedCharacters
    } catch (error) {
      console.error(
        'Error eliminando personaje:',
        error
      )

      setError(error)

      throw error
    }
  }

  const importCharacters = async (
    items
  ) => {
    try {
      const updatedCharacters =
        await replaceCharacters(items)

      setCharacters(updatedCharacters)

      return updatedCharacters
    } catch (error) {
      console.error(
        'Error importando personajes:',
        error
      )

      setError(error)

      throw error
    }
  }

  return {
    characters,
    isLoading,
    error,
    createCharacter,
    editCharacter,
    removeCharacter,
    importCharacters,
  }
}