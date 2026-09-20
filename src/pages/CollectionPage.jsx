import { useAuth } from '../context/AuthContext'
import { useCharacters } from '../hooks/useCharacters'
import '../styles/Collection.css'

function getCharacterImage(character) {
  return character.profile?.primaryImage || ''
}

function CollectionPage() {
  const { user } = useAuth()
  const {
    allCharacters,
    unlockedCharacters,
    lockedCharacters,
    loading,
    error,
  } = useCharacters(user?.id)

  if (loading) {
    return <section className="collection-page"><div className="empty-state"><h2>Cargando colección...</h2><p>Estamos comprobando qué personajes tenés desbloqueados.</p></div></section>
  }

  if (error) {
    return <section className="collection-page"><div className="empty-state"><h2>No se pudo cargar la colección</h2><p>Ocurrió un error al consultar tus desbloqueos.</p><pre>{error.message}</pre></div></section>
  }

  return (
    <section className="collection-page">
      <div className="page-heading">
        <div>
          <p className="eyebrow">BattleDue</p>
          <h1>Mi colección</h1>
          <p>Personajes disponibles para tus futuras batallas.</p>
        </div>
        <div className="collection-progress">
          <strong>{unlockedCharacters.length}</strong>
          <span>/ {allCharacters.length} desbloqueados</span>
        </div>
      </div>

      <div className="collection-section">
        <div className="collection-section-heading">
          <div><p className="eyebrow">Disponibles</p><h2>Personajes desbloqueados</h2></div>
          <span className="collection-count">{unlockedCharacters.length}</span>
        </div>
        {unlockedCharacters.length === 0 ? (
          <div className="empty-state"><h3>Todavía no tenés personajes desbloqueados</h3></div>
        ) : (
          <div className="collection-grid">
            {unlockedCharacters.map((character) => {
              const image = getCharacterImage(character)
              return (
                <article className="collection-card is-unlocked" key={character.id}>
                  <div className="collection-card-image">
                    {image ? <img src={image} alt={character.name} loading="lazy" /> : <span>{character.name?.charAt(0) || '?'}</span>}
                  </div>
                  <div className="collection-card-body">
                    <span className="collection-status">✓ Desbloqueado</span>
                    <h3>{character.name}</h3>
                    <p>{character.species || 'Personaje de BattleDue'}</p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>

      <div className="collection-section">
        <div className="collection-section-heading">
          <div><p className="eyebrow">Próximamente</p><h2>Personajes bloqueados</h2></div>
          <span className="collection-count">{lockedCharacters.length}</span>
        </div>
        {lockedCharacters.length === 0 ? (
          <div className="collection-empty-locked"><h3>Tenés todo el catálogo actual</h3><p>Los próximos personajes podrán tener condiciones especiales de desbloqueo.</p></div>
        ) : (
          <div className="collection-grid">
            {lockedCharacters.map((character) => {
              const image = getCharacterImage(character)
              return (
                <article className="collection-card is-locked" key={character.id}>
                  <div className="collection-card-image">
                    {image ? <img src={image} alt="" aria-hidden="true" loading="lazy" /> : <span>?</span>}
                    <span className="collection-lock" aria-hidden="true">🔒</span>
                  </div>
                  <div className="collection-card-body">
                    <span className="collection-status">🔒 Bloqueado</span>
                    <h3>{character.name}</h3>
                    <p>La condición de desbloqueo se definirá próximamente.</p>
                  </div>
                </article>
              )
            })}
          </div>
        )}
      </div>
    </section>
  )
}

export default CollectionPage
