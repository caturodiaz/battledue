import { useEffect, useState } from 'react'
import CharacterProfile from '../components/CharacterProfile'
import ProfileEditor from '../components/ProfileEditor'
import { profileDefaults } from '../data/profileDefaults'
import { useCharacters } from '../hooks/useCharacters'

function ProfilesPage() {
  const {
    characters,
    editCharacter,
    isLoading,
    error,
  } = useCharacters()

  const [selectedId, setSelectedId] = useState('')

  const [notice, setNotice] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  /*
   * Cuando los personajes terminan de cargar,
   * seleccionamos automáticamente el primero.
   */
  useEffect(() => {
    if (
      characters.length > 0 &&
      !characters.some(
        (character) =>
          character.id === selectedId
      )
    ) {
      setSelectedId(characters[0].id)
    }
  }, [characters, selectedId])

  const character = characters.find(
    (item) => item.id === selectedId
  )

  /*
   * Estado de carga
   */
  if (isLoading) {
    return (
      <section className="empty-state">
        <h2>
          Cargando personajes...
        </h2>

        <p>
          Estamos recuperando el elenco
          de BattleDue.
        </p>
      </section>
    )
  }

  /*
   * Error
   */
  if (error) {
    return (
      <section className="empty-state">
        <h2>
          No se pudieron cargar los personajes
        </h2>

        <p>
          Ocurrió un error al recuperar
          los datos.
        </p>

        <pre>
          {error.message}
        </pre>
      </section>
    )
  }

  /*
   * No hay personajes
   */
  if (!character) {
    return (
      <section className="empty-state">
        <h2>
          No hay personajes disponibles
        </h2>

        <p>
          Crea un personaje antes de
          diseñar su perfil.
        </p>
      </section>
    )
  }

  const profile = {
    ...profileDefaults,
    ...character.profile,

    stats: {
      ...profileDefaults.stats,
      ...character.profile?.stats,
    },
  }

  const openEditor = () => {
    setNotice('')
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
  }

  const handleSave = (
    newProfile,
    gameData
  ) => {
    editCharacter(character.id, {
      ...gameData,
      profile: newProfile,
    })

    setNotice('Perfil guardado.')
    setIsEditorOpen(false)
  }

  const handleCharacterChange = (
    event
  ) => {
    setSelectedId(event.target.value)
    setIsEditorOpen(false)
    setNotice('')
  }

  return (
    <section className="profiles-page">

      <div className="page-heading">

        <div>

          <p className="eyebrow">
            Fichas de combate
          </p>

          <h1>
            Perfiles
          </h1>

          <p>
            Personaliza la presentación
            de cada personaje.
          </p>

        </div>

        <label className="field character-picker">

          Personaje

          <select
            value={selectedId}
            onChange={
              handleCharacterChange
            }
          >

            {characters.map(
              (item) => (
                <option
                  value={item.id}
                  key={item.id}
                >
                  {item.name}
                </option>
              )
            )}

          </select>

        </label>

      </div>

      {notice && (
        <p className="notice">
          {notice}
        </p>
      )}

      <div className="profile-workspace">

        <div className="profile-preview">

          <div className="profile-preview-header">

            <div>

              <p className="eyebrow">
                Vista previa
              </p>

              <h2>
                Perfil de {character.name}
              </h2>

            </div>

            <button
              className="button"
              type="button"
              onClick={
                openEditor
              }
            >
              Editar perfil
            </button>

          </div>

          <CharacterProfile
            character={character}
            profile={profile}
          />

        </div>

      </div>

      {isEditorOpen && (
        <div
          className="profile-modal-backdrop"
          onMouseDown={(event) => {

            if (
              event.target ===
              event.currentTarget
            ) {
              closeEditor()
            }

          }}
        >

          <div
            className="profile-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="profile-modal-title"
          >

            <div className="profile-modal-scroll">

              <ProfileEditor
                key={character.id}
                character={character}
                onSave={handleSave}
                onCancel={closeEditor}
              />

            </div>

          </div>

        </div>
      )}

    </section>
  )
}

export default ProfilesPage