import { defaultCharacters } from '../data/defaultCharacters'
import { supabase } from '../lib/supabaseClient'

const STORAGE_KEY = 'battledue_characters'

function normalizeCharacter(character) {
  return {
    ...character,
    id: character.id || crypto.randomUUID(),
    age:
      character.age === '' ||
      character.age === undefined ||
      character.age === null
        ? ''
        : Number(character.age),
    profile: character.profile || {},
  }
}

function characterToDatabase(character) {
  const normalized =
    normalizeCharacter(character)

  return {
    id: normalized.id,
    name: normalized.name || '',
    age:
      normalized.age === ''
        ? null
        : normalized.age,
    gender: normalized.gender || '',
    species: normalized.species || '',
    alignment: normalized.alignment || '',
    power: normalized.power || '',
    weapon: normalized.weapon || '',
    image: normalized.image || '',
    profile: normalized.profile || {},
  }
}

function databaseToCharacter(row) {
  return normalizeCharacter({
    id: row.id,
    name: row.name,
    age: row.age,
    gender: row.gender,
    species: row.species,
    alignment: row.alignment,
    power: row.power,
    weapon: row.weapon,
    image: row.image,
    profile: row.profile,
  })
}

/*
 * Recupera los personajes desde Supabase.
 *
 * Si la base todavía está vacía y tenemos personajes
 * guardados en localStorage, los migramos automáticamente.
 */
export async function getCharacters() {
  const {
    data,
    error,
  } = await supabase
    .from('characters')
    .select('*')
    .order('created_at', {
      ascending: true,
    })

  if (error) {
    console.error(
      'Error obteniendo personajes desde Supabase:',
      error
    )

    /*
     * Mientras estamos haciendo la migración,
     * mantenemos localStorage como fallback.
     */
    try {
      const value =
        localStorage.getItem(
          STORAGE_KEY
        )

      if (value) {
        const characters =
          JSON.parse(value)

        if (
          Array.isArray(characters)
        ) {
          return characters.map(
            normalizeCharacter
          )
        }
      }
    } catch {
      // Ignoramos el error del fallback.
    }

    return defaultCharacters.map(
      normalizeCharacter
    )
  }

  const characters =
    (data || []).map(
      databaseToCharacter
    )

  /*
   * Primera ejecución:
   *
   * Supabase está vacío, pero existen
   * personajes antiguos en localStorage.
   */
  if (characters.length === 0) {
    try {
      const localValue =
        localStorage.getItem(
          STORAGE_KEY
        )

      if (localValue) {
        const localCharacters =
          JSON.parse(localValue)

        if (
          Array.isArray(
            localCharacters
          ) &&
          localCharacters.length > 0
        ) {
          const normalizedCharacters =
            localCharacters.map(
              normalizeCharacter
            )

          const rows =
            normalizedCharacters.map(
              characterToDatabase
            )

          const {
            data: insertedData,
            error: insertError,
          } =
            await supabase
              .from('characters')
              .insert(rows)
              .select('*')

          if (!insertError) {
            const migratedCharacters =
              (insertedData || []).map(
                databaseToCharacter
              )

            return migratedCharacters
          }

          console.error(
            'Error migrando personajes:',
            insertError
          )

          return normalizedCharacters
        }
      }
    } catch (migrationError) {
      console.error(
        'Error leyendo personajes locales:',
        migrationError
      )
    }

    /*
     * Si no hay datos locales, usamos
     * los personajes por defecto.
     */
    if (
      defaultCharacters.length > 0
    ) {
      const normalizedDefaults =
        defaultCharacters.map(
          normalizeCharacter
        )

      const rows =
        normalizedDefaults.map(
          characterToDatabase
        )

      const {
        data: insertedDefaults,
        error: defaultError,
      } =
        await supabase
          .from('characters')
          .insert(rows)
          .select('*')

      if (!defaultError) {
        return (
          insertedDefaults || []
        ).map(databaseToCharacter)
      }

      console.error(
        'Error guardando personajes por defecto:',
        defaultError
      )

      return normalizedDefaults
    }
  }

  return characters
}

/*
 * Guarda todos los personajes en Supabase.
 *
 * Se utiliza principalmente para importaciones JSON.
 */
export async function saveCharacters(
  characters
) {
  const normalizedCharacters =
    characters.map(
      normalizeCharacter
    )

  const rows =
    normalizedCharacters.map(
      characterToDatabase
    )

  const {
    data,
    error,
  } = await supabase
    .from('characters')
    .upsert(rows, {
      onConflict: 'id',
    })
    .select('*')

  if (error) {
    console.error(
      'Error guardando personajes:',
      error
    )

    throw error
  }

  return (
    data || []
  ).map(databaseToCharacter)
}

/*
 * Crea un personaje nuevo.
 */
export async function addCharacter(
  character
) {
  const normalizedCharacter =
    normalizeCharacter({
      ...character,
      id: crypto.randomUUID(),
    })

  const row =
    characterToDatabase(
      normalizedCharacter
    )

  const {
    data,
    error,
  } = await supabase
    .from('characters')
    .insert(row)
    .select('*')
    .single()

  if (error) {
    console.error(
      'Error creando personaje:',
      error
    )

    throw error
  }

  const newCharacter =
    databaseToCharacter(data)

  const characters =
    await getCharacters()

  /*
   * getCharacters() ya contiene
   * el personaje nuevo.
   */
  return characters.map(
    (item) =>
      item.id === newCharacter.id
        ? newCharacter
        : item
  )
}

/*
 * Actualiza un personaje.
 */
export async function updateCharacter(
  id,
  changes
) {
  const currentCharacters =
    await getCharacters()

  const currentCharacter =
    currentCharacters.find(
      (character) =>
        character.id === id
    )

  if (!currentCharacter) {
    throw new Error(
      'No se encontró el personaje.'
    )
  }

  const updatedCharacter =
    normalizeCharacter({
      ...currentCharacter,
      ...changes,
      id,
    })

  const row =
    characterToDatabase(
      updatedCharacter
    )

  const {
    data,
    error,
  } = await supabase
    .from('characters')
    .update(row)
    .eq('id', id)
    .select('*')
    .single()

  if (error) {
    console.error(
      'Error actualizando personaje:',
      error
    )

    throw error
  }

  const savedCharacter =
    databaseToCharacter(data)

  return currentCharacters.map(
    (character) =>
      character.id === id
        ? savedCharacter
        : character
  )
}

/*
 * Elimina un personaje.
 */
export async function deleteCharacter(
  id
) {
  const {
    error,
  } = await supabase
    .from('characters')
    .delete()
    .eq('id', id)

  if (error) {
    console.error(
      'Error eliminando personaje:',
      error
    )

    throw error
  }

  const characters =
    await getCharacters()

  return characters.filter(
    (character) =>
      character.id !== id
  )
}

/*
 * Reemplaza/importa todos los personajes.
 */
export async function replaceCharacters(
  characters
) {
  const normalizedCharacters =
    characters.map(
      normalizeCharacter
    )

  const rows =
    normalizedCharacters.map(
      characterToDatabase
    )

  const {
    data,
    error,
  } = await supabase
    .from('characters')
    .upsert(rows, {
      onConflict: 'id',
    })
    .select('*')

  if (error) {
    console.error(
      'Error importando personajes:',
      error
    )

    throw error
  }

  return (
    data || []
  ).map(databaseToCharacter)
}

export { STORAGE_KEY }