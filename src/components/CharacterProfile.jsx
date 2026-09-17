import { useState } from 'react'
import { statLabels } from '../data/profileDefaults'

function CharacterProfile({
  character,
  profile,
}) {
  const [selectedGalleryImage, setSelectedGalleryImage] =
    useState(null)

  const mainImage =
    profile.primaryImage ||
    character.image

  const gallery = Array.isArray(
    profile.galleryImages
  )
    ? profile.galleryImages
        .map((image) =>
          typeof image === 'string'
            ? {
                id: image,
                url: image,
              }
            : image
        )
        .filter(
          (image) =>
            image &&
            image.url
        )
        .slice(0, 3)
    : []

  return (
    <>
      <article
        className="profile-card"
        style={{
          '--profile-accent':
            profile.accent,
        }}
      >
        <header className="profile-title">

          <div>
            <span>
              BattleDue
            </span>

            <h2>
              {profile.title ||
                character.name}
            </h2>

            <p>
              {profile.tagline ||
                'Perfil de personaje'}
            </p>
          </div>

          <div className="profile-badge">
            Perfil
          </div>

        </header>

        <section className="profile-main-image">

          {mainImage ? (
            <img
              src={mainImage}
              alt={character.name}
            />
          ) : (
            <span>
              Agrega una imagen principal
            </span>
          )}

        </section>

        <section className="profile-views">

          <h3>
            Vistas
          </h3>

          <div>

            {gallery.length ? (
              gallery.map(
                (image, index) => (
                  <button
                    className="profile-view-button"
                    type="button"
                    key={
                      image.id ||
                      image.url
                    }
                    onClick={() =>
                      setSelectedGalleryImage(
                        image
                      )
                    }
                  >
                    <img
                      src={image.url}
                      alt={`${character.name} vista ${
                        index + 1
                      }`}
                    />
                  </button>
                )
              )
            ) : (
              <p>
                Agrega hasta tres imágenes
                de vistas.
              </p>
            )}

          </div>

        </section>

        <section className="profile-abilities">

          <h3>
            Habilidades
          </h3>

          {profile.abilities.length ? (
            profile.abilities.map(
              (ability) => (
                <div
                  className="ability"
                  key={
                    ability.id ||
                    `${ability.name}-${ability.description}`
                  }
                >

                  <span className="ability-mark">
                    ✦
                  </span>

                  <div>
                    <h4>
                      {ability.name}
                    </h4>

                    <p>
                      {
                        ability.description
                      }
                    </p>
                  </div>

                </div>
              )
            )
          ) : (
            <p className="profile-placeholder">
              Agrega habilidades para
              este personaje.
            </p>
          )}

        </section>

        <section className="profile-stats">

          <h3>
            Atributos
          </h3>

          {Object.entries(
            statLabels
          ).map(([key, label]) => (
            <div
              className="stat"
              key={key}
            >

              <span>
                {label}
              </span>

              <div className="stat-bars">

                {Array.from(
                  { length: 6 },
                  (_, index) => (
                    <i
                      className={
                        index <
                        profile.stats[key]
                          ? 'filled'
                          : ''
                      }
                      key={index}
                    />
                  )
                )}

              </div>

            </div>
          ))}

        </section>

        <section className="profile-bio">

          <h3>
            Perfil
          </h3>

          <p>
            {profile.bio ||
              'Añade una biografía para contar la historia de este personaje.'}
          </p>

        </section>

        <section className="profile-ultimate">

          {profile.ultimateImage && (
            <img
              src={
                profile.ultimateImage
              }
              alt=""
            />
          )}

          <div>

            <h3>
              Técnica definitiva
            </h3>

            <h4>
              {profile.ultimateName ||
                'Sin técnica definida'}
            </h4>

            <p>
              {profile.ultimateDescription ||
                'Agrega el nombre, descripción e imagen de la técnica definitiva.'}
            </p>

          </div>

        </section>

      </article>

      {selectedGalleryImage && (
        <div
          className="profile-gallery-lightbox"
          onClick={() =>
            setSelectedGalleryImage(
              null
            )
          }
        >

          <div
            className="profile-gallery-lightbox-content"
            onClick={(event) =>
              event.stopPropagation()
            }
          >

            <button
              className="profile-gallery-lightbox-close"
              type="button"
              onClick={() =>
                setSelectedGalleryImage(
                  null
                )
              }
              aria-label="Cerrar imagen"
            >
              ×
            </button>

            <img
              src={
                selectedGalleryImage.url
              }
              alt="Vista ampliada del personaje"
            />

          </div>

        </div>
      )}
    </>
  )
}

export default CharacterProfile