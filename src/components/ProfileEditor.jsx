import { useState } from 'react'
import {
  profileDefaults,
  statLabels,
} from '../data/profileDefaults'

function createGalleryImage() {
  return {
    id: crypto.randomUUID(),
    url: '',
  }
}

function normalizeGalleryImages(images = []) {
  if (!Array.isArray(images)) {
    return []
  }

  return images.map((image) => {
    if (typeof image === 'string') {
      return {
        id: crypto.randomUUID(),
        url: image,
      }
    }

    return {
      id: image.id || crypto.randomUUID(),
      url: image.url || '',
    }
  })
}

function createAbility() {
  return {
    id: crypto.randomUUID(),
    name: '',
    description: '',
  }
}

function normalizeAbilities(abilities = []) {
  if (!Array.isArray(abilities)) {
    return []
  }

  return abilities.map((ability) => ({
    id: ability.id || crypto.randomUUID(),
    name: ability.name || '',
    description: ability.description || '',
  }))
}

function ProfileEditor({
  character,
  onSave,
  onCancel,
}) {
  /*
   * ========================================
   * DATOS BÁSICOS DEL PERSONAJE
   * ========================================
   */

  const [characterData, setCharacterData] =
    useState(() => ({
      name: character.name || '',
      age:
        character.age === '' ||
        character.age === undefined ||
        character.age === null
          ? ''
          : Number(character.age),
      gender: character.gender || '',
      species: character.species || '',
      alignment: character.alignment || '',
      power: character.power || '',
      weapon: character.weapon || '',
    }))

  /*
   * ========================================
   * PERFIL
   * ========================================
   */

  const [profile, setProfile] = useState(() => ({
    ...profileDefaults,
    ...character.profile,

    galleryImages:
      normalizeGalleryImages(
        character.profile?.galleryImages
      ),

    abilities:
      normalizeAbilities(
        character.profile?.abilities
      ),

    stats: {
      ...profileDefaults.stats,
      ...character.profile?.stats,
    },
  }))

  const [error, setError] = useState('')

  /*
   * ========================================
   * VISIBILIDAD DE IMÁGENES
   * ========================================
   */

  const [
    showPrimaryImageInput,
    setShowPrimaryImageInput,
  ] = useState(
    Boolean(
      character.profile?.primaryImage
    )
  )

  const [
    showUltimateImageInput,
    setShowUltimateImageInput,
  ] = useState(
    Boolean(
      character.profile?.ultimateImage
    )
  )

  /*
   * ========================================
   * ACTUALIZAR DATOS BÁSICOS
   * ========================================
   */

  const updateCharacter = (
    key,
    value
  ) => {
    setCharacterData(
      (previousCharacter) => ({
        ...previousCharacter,
        [key]: value,
      })
    )
  }

  /*
   * ========================================
   * ACTUALIZAR PERFIL
   * ========================================
   */

  const updateProfile = (
    key,
    value
  ) => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,
        [key]: value,
      })
    )
  }

  /*
   * ========================================
   * GALERÍA DE VISTAS
   * ========================================
   */

  const addGalleryImage = () => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,

        galleryImages: [
          ...previousProfile.galleryImages,
          createGalleryImage(),
        ],
      })
    )
  }

  const updateGalleryImage = (
    imageId,
    value
  ) => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,

        galleryImages:
          previousProfile.galleryImages.map(
            (image) =>
              image.id === imageId
                ? {
                    ...image,
                    url: value,
                  }
                : image
          ),
      })
    )
  }

  const removeGalleryImage = (
    imageId
  ) => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,

        galleryImages:
          previousProfile.galleryImages.filter(
            (image) =>
              image.id !== imageId
          ),
      })
    )
  }

  /*
   * ========================================
   * HABILIDADES
   * ========================================
   */

  const addAbility = () => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,

        abilities: [
          ...previousProfile.abilities,
          createAbility(),
        ],
      })
    )
  }

  const updateAbility = (
    abilityId,
    key,
    value
  ) => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,

        abilities:
          previousProfile.abilities.map(
            (ability) =>
              ability.id === abilityId
                ? {
                    ...ability,
                    [key]: value,
                  }
                : ability
          ),
      })
    )
  }

  const removeAbility = (
    abilityId
  ) => {
    setProfile(
      (previousProfile) => ({
        ...previousProfile,

        abilities:
          previousProfile.abilities.filter(
            (ability) =>
              ability.id !== abilityId
          ),
      })
    )
  }

  /*
   * ========================================
   * IMAGEN PRINCIPAL
   * ========================================
   */

  const addPrimaryImage = () => {
    setShowPrimaryImageInput(true)
  }

  const removePrimaryImage = () => {
    updateProfile(
      'primaryImage',
      ''
    )

    setShowPrimaryImageInput(false)
  }

  /*
   * ========================================
   * IMAGEN DE TÉCNICA
   * ========================================
   */

  const addUltimateImage = () => {
    setShowUltimateImageInput(true)
  }

  const removeUltimateImage = () => {
    updateProfile(
      'ultimateImage',
      ''
    )

    setShowUltimateImageInput(false)
  }

  /*
   * ========================================
   * GUARDAR
   * ========================================
   */

  const handleSubmit = (event) => {
    event.preventDefault()
    setError('')

    const cleanedName =
      characterData.name
        .trim()

    if (!cleanedName) {
      setError(
        'El nombre del personaje es obligatorio.'
      )

      return
    }

    const cleanedProfile = {
      ...profile,

      tagline:
        profile.tagline?.trim() || '',

      bio:
        profile.bio?.trim() || '',

      primaryImage:
        profile.primaryImage?.trim() || '',

      galleryImages:
        profile.galleryImages
          .map((image) => ({
            ...image,
            url:
              image.url?.trim() || '',
          }))
          .filter(
            (image) => image.url
          ),

      abilities:
        profile.abilities
          .map((ability) => ({
            ...ability,

            name:
              ability.name
                ?.trim() || '',

            description:
              ability.description
                ?.trim() || '',
          }))
          .filter(
            (ability) =>
              ability.name ||
              ability.description
          ),

      ultimateName:
        profile.ultimateName
          ?.trim() || '',

      ultimateDescription:
        profile.ultimateDescription
          ?.trim() || '',

      ultimateImage:
        profile.ultimateImage
          ?.trim() || '',
    }

    const cleanedCharacter = {
      name: cleanedName,

      age:
        characterData.age === ''
          ? ''
          : Number(
              characterData.age
            ),

      gender:
        characterData.gender
          .trim(),

      species:
        characterData.species
          .trim(),

      alignment:
        characterData.alignment
          .trim(),

      power:
        characterData.power
          .trim(),

      weapon:
        characterData.weapon
          .trim(),
    }

    onSave(
      cleanedProfile,
      cleanedCharacter
    )
  }

  return (
    <form
      className="profile-editor"
      onSubmit={handleSubmit}
    >

      {/* ========================================
          HEADER
          ======================================== */}

      <div className="profile-editor-header">

        <div>

          <p className="eyebrow">
            BattleDue
          </p>

          <h2>
            {character.id
              ? 'Editar personaje'
              : 'Nuevo personaje'}
          </h2>

          <p className="profile-editor-character">
            {characterData.name ||
              'Nuevo personaje'}
          </p>

        </div>

        {onCancel && (
          <button
            className="profile-editor-close"
            type="button"
            onClick={onCancel}
            aria-label="Cerrar editor"
          >
            ×
          </button>
        )}

      </div>

      {/* ========================================
          DATOS BÁSICOS
          ======================================== */}

      <section className="profile-editor-section">

        <div className="profile-editor-section-header">

          <div>

            <p className="eyebrow">
              Identidad
            </p>

            <h3>
              Datos del personaje
            </h3>

          </div>

        </div>

        <div className="profile-editor-grid">

          <label className="field full-width">

            Nombre del personaje

            <input
              type="text"
              value={
                characterData.name
              }
              onChange={(event) =>
                updateCharacter(
                  'name',
                  event.target.value
                )
              }
              placeholder="Ej. Kizaru"
              autoFocus={!character.id}
            />

          </label>

          <label className="field">

            Edad

            <div className="field-with-suffix">

              <input
                type="number"
                min="0"
                value={
                  characterData.age
                }
                onChange={(event) =>
                  updateCharacter(
                    'age',
                    event.target.value
                  )
                }
                placeholder="Ej. 58"
              />

              <span>
                años
              </span>

            </div>

          </label>

        <label className="field">

          Género

          <select
            value={characterData.gender}
            onChange={(event) =>
              updateCharacter(
                'gender',
                event.target.value
              )
            }
          >
            <option value="">
              Seleccionar género
            </option>

            <option value="Masculino">
              Masculino
            </option>

            <option value="Femenino">
              Femenino
            </option>
          </select>

        </label>

          <label className="field">

            Especie

            <input
              type="text"
              value={
                characterData.species
              }
              onChange={(event) =>
                updateCharacter(
                  'species',
                  event.target.value
                )
              }
              placeholder="Ej. Humano"
            />

          </label>

          <label className="field">

            Afiliación

            <input
              type="text"
              value={
                characterData.alignment
              }
              onChange={(event) =>
                updateCharacter(
                  'alignment',
                  event.target.value
                )
              }
              placeholder="Ej. Marina"
            />

          </label>

          <label className="field">

            Poder

            <select
              value={characterData.power}
              onChange={(event) =>
                updateCharacter(
                  'power',
                  event.target.value
                )
              }
            >
              <option value="">
                Seleccionar tipo de poder
              </option>

              <option value="Elemental">
                Elemental
              </option>

              <option value="Animal">
                Animal
              </option>

              <option value="Mágico">
                Mágico
              </option>

              <option value="Ninguno">
                Ninguno
              </option>
            </select>

          </label>

          <label className="field">

            Arma

            <input
              type="text"
              value={
                characterData.weapon
              }
              onChange={(event) =>
                updateCharacter(
                  'weapon',
                  event.target.value
                )
              }
              placeholder="Ej. Espada"
            />

          </label>

        </div>

      </section>

      {/* ========================================
          PERFIL
          ======================================== */}

      <section className="profile-editor-section">

        <div className="profile-editor-section-header">

          <div>

            <p className="eyebrow">
              Presentación
            </p>

            <h3>
              Perfil del personaje
            </h3>

          </div>

        </div>

        <div className="profile-editor-grid">

          <label className="field">

            Frase distintiva

            <input
              value={
                profile.tagline
              }
              onChange={(event) =>
                updateProfile(
                  'tagline',
                  event.target.value
                )
              }
              placeholder="Una frase característica"
            />

          </label>

          <label className="field">

            Color de acento

            <input
              className="color-input"
              type="color"
              value={
                profile.accent
              }
              onChange={(event) =>
                updateProfile(
                  'accent',
                  event.target.value
                )
              }
            />

          </label>

          {/* ========================================
              IMAGEN PRINCIPAL
              ======================================== */}

          <div className="image-url-editor">

            <div className="image-url-editor-header">

              <label className="field-label">
                Imagen principal
              </label>

              {!showPrimaryImageInput && (
                <button
                  className="button secondary small"
                  type="button"
                  onClick={
                    addPrimaryImage
                  }
                >
                  + Agregar imagen
                </button>
              )}

            </div>

            {showPrimaryImageInput && (
              <div className="image-url-editor-item">

                <div className="image-url-editor-item-header">

                  <span>
                    URL de imagen
                  </span>

                  <button
                    className="remove-image-button"
                    type="button"
                    onClick={
                      removePrimaryImage
                    }
                    aria-label="Eliminar imagen principal"
                  >
                    ×
                  </button>

                </div>

                <input
                  type="url"
                  value={
                    profile.primaryImage
                  }
                  onChange={(event) =>
                    updateProfile(
                      'primaryImage',
                      event.target.value
                    )
                  }
                  placeholder="https://i.ibb.co/..."
                />

              </div>
            )}

          </div>

          {/* ========================================
              GALERÍA DE VISTAS
              ======================================== */}

          <div className="image-url-editor full-width">

            <div className="image-url-editor-header">

              <div>

                <label className="field-label">
                  Galería de vistas
                </label>

                <p className="section-description">
                  Agrega las imágenes una por una.
                </p>

              </div>

              <button
                className="button secondary small"
                type="button"
                onClick={
                  addGalleryImage
                }
              >
                + Agregar imagen
              </button>

            </div>

            {profile.galleryImages.length ===
            0 ? (
              <p className="profile-editor-empty">
                Todavía no hay imágenes.
                Agrega una URL de ImgBB o
                cualquier otro hosting.
              </p>
            ) : (
              <div className="gallery-editor-list">

                {profile.galleryImages.map(
                  (image, index) => (
                    <div
                      className="image-url-editor-item"
                      key={image.id}
                    >

                      <div className="image-url-editor-item-header">

                        <span>
                          Vista{' '}
                          {String(
                            index + 1
                          ).padStart(
                            2,
                            '0'
                          )}
                        </span>

                        <button
                          className="remove-image-button"
                          type="button"
                          onClick={() =>
                            removeGalleryImage(
                              image.id
                            )
                          }
                          aria-label={`Eliminar vista ${
                            index + 1
                          }`}
                        >
                          ×
                        </button>

                      </div>

                      <input
                        type="url"
                        value={
                          image.url
                        }
                        onChange={(event) =>
                          updateGalleryImage(
                            image.id,
                            event.target.value
                          )
                        }
                        placeholder="https://i.ibb.co/..."
                      />

                    </div>
                  )
                )}

              </div>
            )}

          </div>

          <label className="field full-width">

            Biografía

            <textarea
              value={
                profile.bio
              }
              onChange={(event) =>
                updateProfile(
                  'bio',
                  event.target.value
                )
              }
              placeholder="Historia, personalidad o trasfondo..."
            />

          </label>

        </div>

      </section>

      {/* ========================================
          HABILIDADES
          ======================================== */}

      <section className="abilities-editor">

        <div className="abilities-editor-header">

          <div>

            <p className="eyebrow">
              Perfil de combate
            </p>

            <h3>
              Habilidades
            </h3>

            <p className="section-description">
              Define las habilidades
              especiales del personaje.
            </p>

          </div>

          <button
            className="button secondary small"
            type="button"
            onClick={
              addAbility
            }
          >
            + Agregar habilidad
          </button>

        </div>

        {profile.abilities.length ===
        0 ? (
          <p className="profile-editor-empty">
            Todavía no hay habilidades.
            Agrégalas una a una.
          </p>
        ) : (
          <div className="ability-editor-list">

            {profile.abilities.map(
              (
                ability,
                index
              ) => (
                <article
                  className="ability-editor-item"
                  key={
                    ability.id
                  }
                >

                  <div className="ability-editor-item-header">

                    <span>
                      Habilidad{' '}
                      {String(
                        index + 1
                      ).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <button
                      className="remove-ability"
                      type="button"
                      onClick={() =>
                        removeAbility(
                          ability.id
                        )
                      }
                      aria-label={`Eliminar habilidad ${
                        index + 1
                      }`}
                    >
                      ×
                    </button>

                  </div>

                  <label className="field">

                    Nombre

                    <input
                      value={
                        ability.name
                      }
                      onChange={(event) =>
                        updateAbility(
                          ability.id,
                          'name',
                          event.target.value
                        )
                      }
                      placeholder="Nombre de habilidad"
                    />

                  </label>

                  <label className="field">

                    Descripción

                    <textarea
                      value={
                        ability.description
                      }
                      onChange={(event) =>
                        updateAbility(
                          ability.id,
                          'description',
                          event.target.value
                        )
                      }
                      placeholder="Qué hace esta habilidad"
                    />

                  </label>

                </article>
              )
            )}

          </div>
        )}

      </section>

      {/* ========================================
          ATRIBUTOS
          ======================================== */}

      <fieldset className="stats-editor">

        <legend>
          Atributos de combate
        </legend>

        <p className="section-description">
          Ajusta las características
          del personaje de 0 a 6.
        </p>

        {Object.entries(
          statLabels
        ).map(
          ([
            key,
            label,
          ]) => (
            <label
              key={key}
            >

              <span>
                {label}
              </span>

              <input
                type="range"
                min="0"
                max="6"
                value={
                  profile.stats[
                    key
                  ]
                }
                onChange={(event) =>
                  updateProfile(
                    'stats',
                    {
                      ...profile.stats,

                      [key]:
                        Number(
                          event
                            .target
                            .value
                        ),
                    }
                  )
                }
              />

              <b>
                {
                  profile.stats[
                    key
                  ]
                }
                /6
              </b>

            </label>
          )
        )}

      </fieldset>

      {/* ========================================
          TÉCNICA DEFINITIVA
          ======================================== */}

      <section className="ultimate-editor">

        <div className="ultimate-editor-header">

          <div>

            <p className="eyebrow">
              Técnica especial
            </p>

            <h3>
              Técnica definitiva
            </h3>

          </div>

        </div>

        <div className="profile-editor-grid">

          <label className="field">

            Nombre de la técnica

            <input
              value={
                profile.ultimateName
              }
              onChange={(event) =>
                updateProfile(
                  'ultimateName',
                  event.target.value
                )
              }
              placeholder="Nombre de la técnica"
            />

          </label>

          {/* ========================================
              IMAGEN DE TÉCNICA
              ======================================== */}

          <div className="image-url-editor">

            <div className="image-url-editor-header">

              <label className="field-label">
                Imagen de la técnica
              </label>

              {!showUltimateImageInput && (
                <button
                  className="button secondary small"
                  type="button"
                  onClick={
                    addUltimateImage
                  }
                >
                  + Agregar imagen
                </button>
              )}

            </div>

            {showUltimateImageInput && (
              <div className="image-url-editor-item">

                <div className="image-url-editor-item-header">

                  <span>
                    URL de imagen
                  </span>

                  <button
                    className="remove-image-button"
                    type="button"
                    onClick={
                      removeUltimateImage
                    }
                    aria-label="Eliminar imagen de técnica"
                  >
                    ×
                  </button>

                </div>

                <input
                  type="url"
                  value={
                    profile.ultimateImage
                  }
                  onChange={(event) =>
                    updateProfile(
                      'ultimateImage',
                      event.target.value
                    )
                  }
                  placeholder="https://i.ibb.co/..."
                />

              </div>
            )}

          </div>

          <label className="field full-width">

            Descripción de la técnica

            <textarea
              value={
                profile.ultimateDescription
              }
              onChange={(event) =>
                updateProfile(
                  'ultimateDescription',
                  event.target.value
                )
              }
              placeholder="Describe qué ocurre cuando utiliza esta técnica..."
            />

          </label>

        </div>

      </section>

      {/* ========================================
          ERROR
          ======================================== */}

      {error && (
        <p className="error">
          {error}
        </p>
      )}

      {/* ========================================
          ACCIONES
          ======================================== */}

      <div className="profile-editor-actions">

        {onCancel && (
          <button
            className="button secondary"
            type="button"
            onClick={onCancel}
          >
            Cancelar
          </button>
        )}

        <button
          className="button"
          type="submit"
        >
          {character.id
            ? 'Guardar cambios'
            : 'Crear personaje'}
        </button>

      </div>

    </form>
  )
}

export default ProfileEditor