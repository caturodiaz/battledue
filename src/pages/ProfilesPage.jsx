import { useState } from 'react'
import CharacterProfile from '../components/CharacterProfile'
import ProfileEditor from '../components/ProfileEditor'
import { profileDefaults } from '../data/profileDefaults'
import { useCharacters } from '../hooks/useCharacters'

function ProfilesPage() {
  const { characters, editCharacter } = useCharacters()

  const [selectedId, setSelectedId] = useState(
    characters[0]?.id || ''
  )

  const [notice, setNotice] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)

  const character = characters.find(
    (item) => item.id === selectedId
  )

  if (!character) {
    return (
      <section className="empty-state">
        <h2>No hay personajes disponibles</h2>

        <p>
          Crea un personaje antes de diseñar su perfil.
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

  /*
   * Ahora recibimos:
   *
   * 1. newProfile
   * 2. gameData
   *
   * gameData contiene los datos que utiliza el Wordle.
   */

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
            Personaliza la presentación de cada personaje.
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