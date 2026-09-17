import { useState } from 'react'
import { profileDefaults, statLabels } from '../data/profileDefaults'

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

function ProfileEditor({ character, onSave }) {
  const [profile, setProfile] = useState(() => ({
    ...profileDefaults,
    ...character.profile,

    galleryImages: normalizeGalleryImages(
      character.profile?.galleryImages
    ),

    abilities: normalizeAbilities(
      character.profile?.abilities
    ),

    stats: {
      ...profileDefaults.stats,
      ...character.profile?.stats,
    },
  }))

  const update = (key, value) => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      [key]: value,
    }))
  }

  /*
   * GALERÍA
   */

  const addGalleryImage = () => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      galleryImages: [
        ...previousProfile.galleryImages,
        createGalleryImage(),
      ],
    }))
  }

  const updateGalleryImage = (
    imageId,
    value
  ) => {
    setProfile((previousProfile) => ({
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
    }))
  }

  const removeGalleryImage = (imageId) => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      galleryImages:
        previousProfile.galleryImages.filter(
          (image) => image.id !== imageId
        ),
    }))
  }

  /*
   * HABILIDADES
   */

  const addAbility = () => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      abilities: [
        ...previousProfile.abilities,
        createAbility(),
      ],
    }))
  }

  const updateAbility = (
    abilityId,
    key,
    value
  ) => {
    setProfile((previousProfile) => ({
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
    }))
  }

  const removeAbility = (abilityId) => {
    setProfile((previousProfile) => ({
      ...previousProfile,
      abilities:
        previousProfile.abilities.filter(
          (ability) =>
            ability.id !== abilityId
        ),
    }))
  }

  /*
   * TÉCNICA DEFINITIVA
   */

  const addUltimateImage = () => {
    update('ultimateImage', '')
  }

  const removeUltimateImage = () => {
    update('ultimateImage', '')
  }

  /*
   * GUARDAR
   */

  const handleSubmit = (event) => {
    event.preventDefault()

    const cleanedProfile = {
      ...profile,

      galleryImages:
        profile.galleryImages
          .map((image) => ({
            ...image,
            url: image.url.trim(),
          }))
          .filter((image) => image.url),

      abilities:
        profile.abilities
          .map((ability) => ({
            ...ability,
            name: ability.name.trim(),
            description:
              ability.description.trim(),
          }))
          .filter(
            (ability) =>
              ability.name ||
              ability.description
          ),

      ultimateImage:
        profile.ultimateImage?.trim() || '',
    }

    onSave(cleanedProfile)
  }

  return (
    <form
      className="profile-editor"
      onSubmit={handleSubmit}
    >
      <h2>Editar perfil</h2>

      <div className="profile-editor-grid">

        <label className="field">
          Título de combate

          <input
            value={profile.title}
            onChange={(event) =>
              update(
                'title',
                event.target.value
              )
            }
            placeholder={character.name}
          />
        </label>

        <label className="field">
          Frase distintiva

          <input
            value={profile.tagline}
            onChange={(event) =>
              update(
                'tagline',
                event.target.value
              )
            }
            placeholder="El azote..."
          />
        </label>

        <label className="field">
          Color de acento

          <input
            className="color-input"
            type="color"
            value={profile.accent}
            onChange={(event) =>
              update(
                'accent',
                event.target.value
              )
            }
          />
        </label>

        <label className="field">
          Imagen principal (URL)

          <input
            type="url"
            value={profile.primaryImage}
            onChange={(event) =>
              update(
                'primaryImage',
                event.target.value
              )
            }
            placeholder="Usa la imagen del personaje si queda vacío"
          />
        </label>

        <label className="field full-width">
          Biografía

          <textarea
            value={profile.bio}
            onChange={(event) =>
              update(
                'bio',
                event.target.value
              )
            }
            placeholder="Historia, personalidad o trasfondo..."
          />
        </label>

      </div>

      {/* GALERÍA */}

      <section className="gallery-editor">

        <div className="gallery-editor-header">
          <div>
            <p className="eyebrow">
              Imágenes
            </p>

            <h3>
              Galería de vistas
            </h3>
          </div>

          <button
            className="button secondary small"
            type="button"
            onClick={addGalleryImage}
          >
            + Agregar imagen
          </button>
        </div>

        {profile.galleryImages.length === 0 ? (
          <p className="profile-editor-empty">
            Todavía no hay imágenes.
            Agrégalas una a una.
          </p>
        ) : (
          <div className="gallery-editor-list">

            {profile.galleryImages.map(
              (image, index) => (
                <article
                  className="gallery-editor-item"
                  key={image.id}
                >

                  <div className="gallery-editor-item-header">

                    <span>
                      Vista{' '}
                      {String(index + 1).padStart(
                        2,
                        '0'
                      )}
                    </span>

                    <button
                      className="remove-gallery-image"
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

                  <label className="field">

                    URL de imagen

                    <input
                      type="url"
                      value={image.url}
                      onChange={(event) =>
                        updateGalleryImage(
                          image.id,
                          event.target.value
                        )
                      }
                      placeholder="https://i.ibb.co/..."
                    />

                  </label>

                </article>
              )
            )}

          </div>
        )}

      </section>

      {/* HABILIDADES */}

      <section className="abilities-editor">

        <div className="abilities-editor-header">

          <div>
            <p className="eyebrow">
              Perfil de combate
            </p>

            <h3>
              Habilidades
            </h3>
          </div>

          <button
            className="button secondary small"
            type="button"
            onClick={addAbility}
          >
            + Agregar habilidad
          </button>

        </div>

        {profile.abilities.length === 0 ? (
          <p className="profile-editor-empty">
            Todavía no hay habilidades.
            Agrégalas una a una.
          </p>
        ) : (
          <div className="ability-editor-list">

            {profile.abilities.map(
              (ability, index) => (
                <article
                  className="ability-editor-item"
                  key={ability.id}
                >

                  <div className="ability-editor-item-header">

                    <div>
                      <span>
                        Habilidad{' '}
                        {String(index + 1).padStart(
                          2,
                          '0'
                        )}
                      </span>
                    </div>

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

                  <div className="ability-editor-fields">

                    <label className="field">

                      Nombre

                      <input
                        value={ability.name}
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

                  </div>

                </article>
              )
            )}

          </div>
        )}

      </section>

      {/* ATRIBUTOS */}

      <fieldset className="stats-editor">

        <legend>
          Atributos
        </legend>

        {Object.entries(statLabels).map(
          ([key, label]) => (
            <label key={key}>

              {label}

              <input
                type="range"
                min="0"
                max="6"
                value={profile.stats[key]}
                onChange={(event) =>
                  update('stats', {
                    ...profile.stats,
                    [key]: Number(
                      event.target.value
                    ),
                  })
                }
              />

              <b>
                {profile.stats[key]}/6
              </b>

            </label>
          )
        )}

      </fieldset>

      {/* TÉCNICA DEFINITIVA */}

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

            Nombre

            <input
              value={profile.ultimateName}
              onChange={(event) =>
                update(
                  'ultimateName',
                  event.target.value
                )
              }
              placeholder="Nombre de la técnica"
            />

          </label>

          <div className="ultimate-image-editor">

            <div className="ultimate-image-header">

              <span>
                Imagen de técnica
              </span>

              {!profile.ultimateImage && (
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

            {profile.ultimateImage && (
              <div className="ultimate-image-item">

                <div className="ultimate-image-item-header">

                  <span>
                    Imagen
                  </span>

                  <button
                    className="remove-ultimate-image"
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
                    update(
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

            Descripción de técnica

            <textarea
              value={
                profile.ultimateDescription
              }
              onChange={(event) =>
                update(
                  'ultimateDescription',
                  event.target.value
                )
              }
              placeholder="Describe la técnica definitiva..."
            />

          </label>

        </div>

      </section>

      <button
        className="button"
        type="submit"
      >
        Guardar perfil
      </button>

    </form>
  )
}

export default ProfileEditor