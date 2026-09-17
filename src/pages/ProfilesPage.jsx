import { useEffect, useState } from 'react'
import CharacterProfile from '../components/CharacterProfile'
import ProfileEditor from '../components/ProfileEditor'
import { profileDefaults } from '../data/profileDefaults'
import { useCharacters } from '../hooks/useCharacters'

const emptyCharacter = {
  id: '',
  name: '',
  age: '',
  gender: '',
  species: '',
  alignment: '',
  power: '',
  weapon: '',
  image: '',
  profile: {
    ...profileDefaults,
    abilities: [],
    galleryImages: [],
    stats: {
      ...profileDefaults.stats,
    },
  },
}

function ProfilesPage() {
  const {
    characters,
    createCharacter,
    editCharacter,
    isLoading,
    error,
  } = useCharacters()

  const [selectedId, setSelectedId] = useState('')
  const [notice, setNotice] = useState('')
  const [isEditorOpen, setIsEditorOpen] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  /*
   * Seleccionar automáticamente
   * el primer personaje disponible.
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
   * ========================================
   * MODAL
   * ========================================
   */

  const openCreateModal = () => {
    setNotice('')
    setIsCreating(true)
    setIsEditorOpen(true)
  }

  const openEditModal = () => {
    if (!character) {
      return
    }

    setNotice('')
    setIsCreating(false)
    setIsEditorOpen(true)
  }

  const closeEditor = () => {
    setIsEditorOpen(false)
    setIsCreating(false)
  }

  /*
   * ========================================
   * GUARDAR
   * ========================================
   */

  const handleSave = async (
    newProfile,
    gameData
  ) => {
    try {
      if (isCreating) {
        const newCharacter = {
          ...emptyCharacter,
          ...gameData,

          profile: {
            ...profileDefaults,
            ...newProfile,

            stats: {
              ...profileDefaults.stats,
              ...newProfile?.stats,
            },
          },
        }

        const createdCharacter =
          await createCharacter(
            newCharacter
          )

        /*
         * Si useCharacters devuelve
         * el personaje creado,
         * lo seleccionamos.
         */
        if (createdCharacter?.id) {
          setSelectedId(
            createdCharacter.id
          )
        } else if (
          createdCharacter?.length
        ) {
          const lastCharacter =
            createdCharacter[
              createdCharacter.length - 1
            ]

          if (lastCharacter?.id) {
            setSelectedId(
              lastCharacter.id
            )
          }
        }

        setNotice(
          'Personaje creado correctamente.'
        )
      } else {
        await editCharacter(
          character.id,
          {
            ...gameData,

            profile: newProfile,
          }
        )

        setNotice(
          'Personaje guardado correctamente.'
        )
      }

      closeEditor()
    } catch (saveError) {
      console.error(
        'Error al guardar personaje:',
        saveError
      )

      setNotice(
        'No se pudo guardar el personaje.'
      )
    }
  }

  /*
   * ========================================
   * CAMBIAR PERSONAJE
   * ========================================
   */

  const handleCharacterChange = (
    event
  ) => {
    setSelectedId(
      event.target.value
    )

    setIsEditorOpen(false)
    setIsCreating(false)
    setNotice('')
  }

  /*
   * ========================================
   * LOADING
   * ========================================
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
   * ========================================
   * ERROR
   * ========================================
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
   * ========================================
   * SIN PERSONAJES
   * ========================================
   */

  if (
    characters.length === 0
  ) {
    return (
      <section className="profiles-page">

        <div className="page-heading">

          <div>
            <p className="eyebrow">
              BattleDue
            </p>

            <h1>
              Personajes
            </h1>

            <p>
              Crea y administra todos
              los personajes de la serie.
            </p>
          </div>

          <button
            className="button"
            type="button"
            onClick={
              openCreateModal
            }
          >
            + Nuevo personaje
          </button>

        </div>

        <div className="empty-state">

          <h2>
            Todavía no hay personajes
          </h2>

          <p>
            Crea el primero para comenzar
            a construir BattleDue.
          </p>

          <button
            className="button"
            type="button"
            onClick={
              openCreateModal
            }
          >
            Crear personaje
          </button>

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
            >

              <div className="profile-modal-scroll">

                <ProfileEditor
                  character={
                    emptyCharacter
                  }
                  onSave={
                    handleSave
                  }
                  onCancel={
                    closeEditor
                  }
                />

              </div>

            </div>

          </div>
        )}

      </section>
    )
  }

  /*
   * ========================================
   * PERFIL ACTUAL
   * ========================================
   */

  const profile = {
    ...profileDefaults,
    ...character?.profile,

    stats: {
      ...profileDefaults.stats,
      ...character?.profile?.stats,
    },
  }

  return (
    <section className="profiles-page">

      {/* ========================================
          CABECERA
          ======================================== */}

      <div className="page-heading">

        <div>

          <p className="eyebrow">
            BattleDue
          </p>

          <h1>
            Personajes
          </h1>

          <p>
            Crea y administra todos
            los personajes de la serie.
          </p>

        </div>

        <div className="character-actions">

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

          <button
            className="button"
            type="button"
            onClick={
              openCreateModal
            }
          >
            + Nuevo personaje
          </button>

        </div>

      </div>

      {/* ========================================
          MENSAJE
          ======================================== */}

      {notice && (
        <p className="notice">
          {notice}
        </p>
      )}

      {/* ========================================
          VISTA DEL PERSONAJE
          ======================================== */}

      {character && (
        <div className="profile-workspace">

          <div className="profile-preview">

            <div className="profile-preview-header">

              <div>

                <p className="eyebrow">
                  Ficha del personaje
                </p>

                <h2>
                  {character.name}
                </h2>

              </div>

              <button
                className="button"
                type="button"
                onClick={
                  openEditModal
                }
              >
                Editar personaje
              </button>

            </div>

            {/* ========================================
                INFORMACIÓN BÁSICA
                ======================================== */}

            <section className="character-basic-info">

              <div className="character-basic-image">

                {profile.primaryImage ||
                character.image ? (
                  <img
                    src={
                      profile.primaryImage ||
                      character.image
                    }
                    alt={
                      character.name
                    }
                  />
                ) : (
                  <div className="character-basic-image-placeholder">
                    Sin imagen
                  </div>
                )}

              </div>

              <div className="character-basic-details">

                <div>

                  <p className="eyebrow">
                    Nombre
                  </p>

                  <h2>
                    {character.name}
                  </h2>

                </div>

                {profile.tagline && (
                  <p className="character-tagline">
                    {profile.tagline}
                  </p>
                )}

                <div className="character-facts">

                  {character.age !==
                    '' &&
                    character.age !==
                      null &&
                    character.age !==
                      undefined && (
                      <span>
                        <b>
                          Edad
                        </b>

                        {character.age}{' '}
                        años
                      </span>
                    )}

                  {character.gender && (
                    <span>
                      <b>
                        Género
                      </b>

                      {
                        character.gender
                      }
                    </span>
                  )}

                  {character.species && (
                    <span>
                      <b>
                        Especie
                      </b>

                      {
                        character.species
                      }
                    </span>
                  )}

                  {character.alignment && (
                    <span>
                      <b>
                        Afiliación
                      </b>

                      {
                        character.alignment
                      }
                    </span>
                  )}

                  {character.power && (
                    <span>
                      <b>
                        Poder
                      </b>

                      {
                        character.power
                      }
                    </span>
                  )}

                  {character.weapon && (
                    <span>
                      <b>
                        Arma
                      </b>

                      {
                        character.weapon
                      }
                    </span>
                  )}

                </div>

              </div>

            </section>

            {/* ========================================
                PERFIL COMPLETO
                ======================================== */}

            <CharacterProfile
              character={
                character
              }
              profile={profile}
            />

          </div>

        </div>
      )}

      {/* ========================================
          MODAL EDITOR
          ======================================== */}

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
                key={
                  isCreating
                    ? 'new-character'
                    : character.id
                }

                character={
                  isCreating
                    ? emptyCharacter
                    : character
                }

                onSave={
                  handleSave
                }

                onCancel={
                  closeEditor
                }

              />

            </div>

          </div>

        </div>
      )}

    </section>
  )
}

export default ProfilesPage